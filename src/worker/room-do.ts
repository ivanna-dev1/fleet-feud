import { DurableObject } from "cloudflare:workers";
import { createRoom, findPlayerIndex, toPlayerView } from "../game";
import type { RoomState } from "../game";
import type { Env } from "./env";
import { send } from "./protocol";
import { CLOSE_EXPIRED, handleMessage, syncOnline } from "./session";
import type { Attachment } from "./session";

const STATE_KEY = "state";
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * One room = one Durable Object. Holds the game state, all player sockets,
 * and an alarm that wipes the room after 24h without any state change. Uses the WebSocket Hibernation API,
 * so the object can sleep between moves without dropping connections.
 */
export class Room extends DurableObject<Env> {
  private state: RoomState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const stored = (await ctx.storage.get<RoomState>(STATE_KEY)) ?? null;
      this.state = stored;
      // After a deploy or restart sockets are gone without a close event.
      const synced = stored && syncOnline(stored, this.connectedIds());
      if (synced) await this.commit(synced);
    });
  }

  private async ensureState(roomId: string): Promise<RoomState> {
    if (this.state) return this.state;
    this.state = createRoom(roomId, Date.now());
    await this.ctx.storage.put(STATE_KEY, this.state);
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    return this.state;
  }

  async fetch(request: Request): Promise<Response> {
    const roomId = new URL(request.url).pathname.split("/").pop() ?? "";
    await this.ensureState(roomId);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private attachmentOf(ws: WebSocket): Attachment | null {
    return (ws.deserializeAttachment() as Attachment | null) ?? null;
  }

  private connectedIds(except?: WebSocket): Set<string> {
    const ids = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws === except ? null : this.attachmentOf(ws);
      if (att) ids.add(att.playerId);
    }
    return ids;
  }

  private async commit(next: RoomState): Promise<void> {
    this.state = next;
    await this.ctx.storage.put(STATE_KEY, next);
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    this.broadcast();
  }

  private broadcast(): void {
    if (!this.state) return;
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachmentOf(ws);
      if (!att || findPlayerIndex(this.state, att.playerId) === null) continue;
      send(ws, { type: "state", view: toPlayerView(this.state, att.playerId) });
    }
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.state) return;
    const outcome = handleMessage(this.state, this.attachmentOf(ws), raw, Math.random);
    if (outcome.kind === "reply") {
      send(ws, outcome.msg);
      if (outcome.close) ws.close(outcome.close.code, outcome.close.reason);
      return;
    }
    if (outcome.attach) ws.serializeAttachment(outcome.attach);
    await this.commit(outcome.state);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleGone(ws);
  }

  /** Marks the player offline when their last socket is gone. */
  private async handleGone(ws: WebSocket): Promise<void> {
    if (!this.state) return;
    const synced = syncOnline(this.state, this.connectedIds(ws));
    if (synced) await this.commit(synced);
  }

  async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(CLOSE_EXPIRED, "room_expired");
      } catch {
        // already closed
      }
    }
    this.state = null;
    await this.ctx.storage.deleteAll();
  }
}
