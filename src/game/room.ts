import { isInside } from "./board";
import { validateFleet } from "./fleet";
import { applyShot, hasShot, isFleetSunk } from "./shoot";
import type {
  ClientCommand,
  ErrorCode,
  PlayerIndex,
  PlayerState,
  RoomState,
} from "./types";

export const MAX_NAME_LENGTH = 20;

export type ReduceResult =
  | { ok: true; state: RoomState }
  | { ok: false; code: ErrorCode; message: string };

function err(code: ErrorCode, message: string): ReduceResult {
  return { ok: false, code, message };
}

function other(index: PlayerIndex): PlayerIndex {
  return index === 0 ? 1 : 0;
}

export function findPlayerIndex(state: RoomState, playerId: string): PlayerIndex | null {
  if (state.players[0]?.id === playerId) return 0;
  if (state.players[1]?.id === playerId) return 1;
  return null;
}

function newPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    online: true,
    ships: [],
    ready: false,
    shotsReceived: [],
    wantsRematch: false,
  };
}

function cleanName(raw: string): string | null {
  const name = raw.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

function withPlayer(
  state: RoomState,
  index: PlayerIndex,
  patch: Partial<PlayerState>,
): RoomState {
  const players: RoomState["players"] = [state.players[0], state.players[1]];
  players[index] = { ...state.players[index]!, ...patch };
  return { ...state, players };
}

export function createRoom(id: string, now: number): RoomState {
  return { id, phase: "waiting", players: [null, null], turn: null, winner: null, createdAt: now };
}

function join(state: RoomState, playerId: string, rawName: string): ReduceResult {
  const existing = findPlayerIndex(state, playerId);
  if (existing !== null) {
    return { ok: true, state: withPlayer(state, existing, { online: true }) };
  }
  const slot: PlayerIndex | null = state.players[0] === null ? 0 : state.players[1] === null ? 1 : null;
  if (slot === null) return err("room_full", "This room already has two players");
  const name = cleanName(rawName) ?? "Player";
  let next = withPlayerSlot(state, slot, newPlayer(playerId, name));
  if (next.players[0] && next.players[1] && next.phase === "waiting") {
    next = { ...next, phase: "placing" };
  }
  return { ok: true, state: next };
}

function withPlayerSlot(state: RoomState, index: PlayerIndex, player: PlayerState): RoomState {
  const players: RoomState["players"] = [state.players[0], state.players[1]];
  players[index] = player;
  return { ...state, players };
}

function fire(state: RoomState, me: PlayerIndex, cell: { r: number; c: number }): ReduceResult {
  if (state.phase !== "battle") return err("bad_phase", "You can fire only during battle");
  if (state.turn !== me) return err("not_your_turn", "Wait for your turn");
  if (!isInside(cell)) return err("bad_message", "Cell is outside the board");
  const target = other(me);
  const enemy = state.players[target]!;
  if (hasShot(enemy.shotsReceived, cell)) return err("already_shot", "This cell was already shot");
  const { result, shots } = applyShot(enemy.ships, enemy.shotsReceived, cell);
  let next = withPlayer(state, target, { shotsReceived: shots });
  if (result === "miss") {
    next = { ...next, turn: target };
  } else if (isFleetSunk(enemy.ships, shots)) {
    next = { ...next, phase: "finished", turn: null, winner: me };
  }
  return { ok: true, state: next };
}

function resetForRematch(state: RoomState): RoomState {
  const players = state.players.map((p) =>
    p ? { ...p, ships: [], ready: false, shotsReceived: [], wantsRematch: false } : null,
  ) as RoomState["players"];
  return { ...state, players, phase: "placing", turn: null, winner: null };
}

/** Single entry point for all state changes. Pure: never mutates `state`. */
export function reduce(
  state: RoomState,
  cmd: ClientCommand,
  playerId: string,
  rng: () => number,
): ReduceResult {
  if (cmd.type === "join") return join(state, playerId, cmd.name);

  const me = findPlayerIndex(state, playerId);
  if (me === null) return err("not_joined", "Join the room first");

  switch (cmd.type) {
    case "setName": {
      const name = cleanName(cmd.name);
      if (name === null) return err("bad_name", `Name must be 1–${MAX_NAME_LENGTH} characters`);
      return { ok: true, state: withPlayer(state, me, { name }) };
    }
    case "placeShips": {
      if (state.phase !== "placing") return err("bad_phase", "Ships can be placed only before battle");
      if (state.players[me]!.ready) return err("bad_phase", "You are already ready");
      const check = validateFleet(cmd.ships);
      if (check !== true) return err("invalid_fleet", `Invalid fleet: ${check}`);
      return { ok: true, state: withPlayer(state, me, { ships: cmd.ships }) };
    }
    case "ready": {
      if (state.phase !== "placing") return err("bad_phase", "Not in placing phase");
      if (validateFleet(state.players[me]!.ships) !== true) return err("not_ready", "Place all ships first");
      let next = withPlayer(state, me, { ready: true });
      if (next.players[0]!.ready && next.players[1]!.ready) {
        next = { ...next, phase: "battle", turn: rng() < 0.5 ? 0 : 1 };
      }
      return { ok: true, state: next };
    }
    case "fire":
      return fire(state, me, cmd.cell);
    case "rematch": {
      if (state.phase !== "finished") return err("bad_phase", "The game is not over yet");
      const next = withPlayer(state, me, { wantsRematch: true });
      if (next.players[0]!.wantsRematch && next.players[1]!.wantsRematch) {
        return { ok: true, state: resetForRematch(next) };
      }
      return { ok: true, state: next };
    }
  }
}
