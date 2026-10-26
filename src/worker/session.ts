import { reduce } from "../game";
import type { RoomState, ServerMessage } from "../game";
import { parseCommand } from "./protocol";

export const CLOSE_ROOM_FULL = 4001;
export const CLOSE_EXPIRED = 4002;

export type Attachment = { playerId: string };

/** What the Durable Object should do with one incoming frame. */
export type MessageOutcome =
  | { kind: "reply"; msg: ServerMessage; close?: { code: number; reason: string } }
  | { kind: "commit"; state: RoomState; attach?: Attachment };

function replyError(code: "bad_message" | "not_joined", message: string): MessageOutcome {
  return { kind: "reply", msg: { type: "error", code, message } };
}

/** Pure part of `webSocketMessage`: no sockets, no storage. */
export function handleMessage(
  state: RoomState,
  att: Attachment | null,
  raw: string | ArrayBuffer,
  rng: () => number,
): MessageOutcome {
  const cmd = parseCommand(raw);
  if (!cmd) return replyError("bad_message", "Malformed message");
  if (cmd.type !== "join" && !att) return replyError("not_joined", "Send join first");
  if (cmd.type === "join" && att && att.playerId !== cmd.playerId) {
    return replyError("bad_message", "This connection already belongs to another player");
  }
  const playerId = cmd.type === "join" ? cmd.playerId : att!.playerId;
  const result = reduce(state, cmd, playerId, rng);
  if (!result.ok) {
    const msg: ServerMessage = { type: "error", code: result.code, message: result.message };
    if (result.code === "room_full") {
      return { kind: "reply", msg, close: { code: CLOSE_ROOM_FULL, reason: "room_full" } };
    }
    return { kind: "reply", msg };
  }
  return {
    kind: "commit",
    state: result.state,
    attach: cmd.type === "join" ? { playerId } : undefined,
  };
}

/**
 * Sets `online` for every player from the ids that still have a live socket.
 * Returns null when nothing changes.
 */
export function syncOnline(state: RoomState, connectedIds: ReadonlySet<string>): RoomState | null {
  let changed = false;
  const players = state.players.map((p) => {
    if (!p) return p;
    const online = connectedIds.has(p.id);
    if (online === p.online) return p;
    changed = true;
    return { ...p, online };
  }) as RoomState["players"];
  return changed ? { ...state, players } : null;
}
