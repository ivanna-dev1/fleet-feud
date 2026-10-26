import { DurableObject } from "cloudflare:workers";
import { createRoom, findPlayerIndex, reduce, toPlayerView } from "../game";
import type { RoomState } from "../game";
import type { Env } from "./env";
import { parseCommand, send } from "./protocol";

const STATE_KEY = "state";
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const CLOSE_ROOM_FULL = 4001;
const CLOSE_EXPIRED = 4002;

type Attachment = { playerId: string };

/**
 * One room = one Durable Object. Holds the game state, all player sockets,
 * and a 24h alarm that wipes the room. Uses the WebSocket Hibernation API,
 * so the object can sleep between moves without dropping connections.
 */
export class Room extends DurableObject<Env> {
  private state: RoomState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<RoomState>(STATE_KEY)) ?? null;
    });
  }

  private async ensureState(roomId: string): Promise<RoomState> {
    if (this.state) return this.state;
    this.state = createRoom(roomId, Date.now());
    await this.ctx.storage.put(STATE_KEY, this.state);
    await this.ctx.storage.setAlarm(this.state.createdAt + ROOM_TTL_MS);
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

  private async commit(next: RoomState): Promise<void> {
    this.state = next;
    await this.ctx.storage.put(STATE_KEY, next);
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
    const state = this.state;
    if (!state) return;
    const cmd = parseCommand(raw);
    if (!cmd) {
      send(ws, { type: "error", code: "bad_message", message: "Malformed message" });
      return;
    }
    const att = this.attachmentOf(ws);
    if (cmd.type !== "join" && !att) {
      send(ws, { type: "error", code: "not_joined", message: "Send join first" });
      return;
    }
    const playerId = cmd.type === "join" ? cmd.playerId : att!.playerId;
    const result = reduce(state, cmd, playerId, Math.random);
    if (!result.ok) {
      send(ws, { type: "error", code: result.code, message: result.message });
      if (result.code === "room_full") ws.close(CLOSE_ROOM_FULL, "room_full");
      return;
    }
    if (cmd.type === "join") ws.serializeAttachment({ playerId } satisfies Attachment);
    await this.commit(result.state);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleGone(ws);
  }

  /** Marks the player offline when their last socket is gone. */
  private async handleGone(ws: WebSocket): Promise<void> {
    const att = this.attachmentOf(ws);
    const state = this.state;
    if (!att || !state) return;
    const stillConnected = this.ctx
      .getWebSockets()
      .some((other) => other !== ws && this.attachmentOf(other)?.playerId === att.playerId);
    if (stillConnected) return;
    const index = findPlayerIndex(state, att.playerId);
    if (index === null) return;
    const players: RoomState["players"] = [state.players[0], state.players[1]];
    players[index] = { ...state.players[index]!, online: false };
    await this.commit({ ...state, players });
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
