import { MAX_NAME_LENGTH } from "../game";
import type { Cell, ClientCommand, ServerMessage, Ship } from "../game";

const MAX_MESSAGE_BYTES = 8 * 1024;

function isCell(v: unknown): v is Cell {
  return (
    typeof v === "object" &&
    v !== null &&
    Number.isInteger((v as Cell).r) &&
    Number.isInteger((v as Cell).c)
  );
}

function isShip(v: unknown): v is Ship {
  const cells = (v as Ship | null)?.cells;
  return Array.isArray(cells) && cells.length > 0 && cells.length <= 4 && cells.every(isCell);
}

function isShortString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length <= max;
}

/** Turns a raw WebSocket frame into a typed command, or null if the shape is wrong. */
export function parseCommand(raw: string | ArrayBuffer): ClientCommand | null {
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  switch (msg.type) {
    case "join":
      if (!isShortString(msg.playerId, 64) || msg.playerId.length === 0) return null;
      if (!isShortString(msg.name, 100)) return null;
      return { type: "join", playerId: msg.playerId, name: msg.name };
    case "setName":
      if (!isShortString(msg.name, MAX_NAME_LENGTH * 2)) return null;
      return { type: "setName", name: msg.name };
    case "placeShips":
      if (!Array.isArray(msg.ships) || msg.ships.length > 10 || !msg.ships.every(isShip)) return null;
      return { type: "placeShips", ships: msg.ships };
    case "ready":
      return { type: "ready" };
    case "fire":
      if (!isCell(msg.cell)) return null;
      return { type: "fire", cell: { r: msg.cell.r, c: msg.cell.c } };
    case "rematch":
      return { type: "rematch" };
    default:
      return null;
  }
}

export function send(ws: WebSocket, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // The socket may already be closed; the close handler cleans up.
  }
}
