import { describe, expect, it } from "vitest";
import { VALID_FLEET } from "./fleet.test";
import { createRoom, reduce } from "./room";
import type { ClientCommand, RoomState } from "./types";

const P0 = "player-0";
const P1 = "player-1";
const rng0 = () => 0; // first player (index 0) starts
const rng1 = () => 0.9; // second player (index 1) starts

function ok(state: RoomState, cmd: ClientCommand, playerId: string, rng = rng0): RoomState {
  const res = reduce(state, cmd, playerId, rng);
  if (!res.ok) throw new Error(`expected ok, got ${res.code}: ${res.message}`);
  return res.state;
}

function fail(state: RoomState, cmd: ClientCommand, playerId: string): string {
  const res = reduce(state, cmd, playerId, rng0);
  if (res.ok) throw new Error("expected error");
  return res.code;
}

function joined(): RoomState {
  let s = createRoom("abc123", 1000);
  s = ok(s, { type: "join", playerId: P0, name: "Alpha" }, P0);
  s = ok(s, { type: "join", playerId: P1, name: "Bravo" }, P1);
  return s;
}

function inBattle(rng = rng0): RoomState {
  let s = joined();
  s = ok(s, { type: "placeShips", ships: VALID_FLEET }, P0);
  s = ok(s, { type: "placeShips", ships: VALID_FLEET }, P1);
  s = ok(s, { type: "ready" }, P0);
  s = ok(s, { type: "ready" }, P1, rng);
  return s;
}

describe("createRoom", () => {
  it("starts empty in waiting", () => {
    const s = createRoom("abc123", 1000);
    expect(s).toEqual({
      id: "abc123",
      phase: "waiting",
      players: [null, null],
      turn: null,
      winner: null,
      createdAt: 1000,
    });
  });
});

describe("join", () => {
  it("first player takes slot 0, phase stays waiting", () => {
    const s = ok(createRoom("r", 0), { type: "join", playerId: P0, name: "Alpha" }, P0);
    expect(s.phase).toBe("waiting");
    expect(s.players[0]?.id).toBe(P0);
    expect(s.players[0]?.online).toBe(true);
    expect(s.players[1]).toBeNull();
  });

  it("second player takes slot 1 and phase becomes placing", () => {
    const s = joined();
    expect(s.phase).toBe("placing");
    expect(s.players[1]?.id).toBe(P1);
  });

  it("third player gets room_full", () => {
    expect(fail(joined(), { type: "join", playerId: "p2", name: "C" }, "p2")).toBe("room_full");
  });

  it("re-join returns the same slot and keeps the name", () => {
    let s = joined();
    s = ok(s, { type: "join", playerId: P0, name: "Other" }, P0);
    expect(s.players[0]?.id).toBe(P0);
    expect(s.players[0]?.name).toBe("Alpha");
    expect(s.players[1]?.id).toBe(P1);
  });

  it("commands from an unknown player give not_joined", () => {
    expect(fail(joined(), { type: "ready" }, "stranger")).toBe("not_joined");
  });
});

describe("setName", () => {
  it("trims and rejects too long names", () => {
    let s = joined();
    s = ok(s, { type: "setName", name: "  Neo  " }, P0);
    expect(s.players[0]?.name).toBe("Neo");
    expect(fail(s, { type: "setName", name: "x".repeat(21) }, P0)).toBe("bad_name");
    expect(fail(s, { type: "setName", name: "   " }, P0)).toBe("bad_name");
  });
});

describe("placing", () => {
  it("placeShips in waiting is bad_phase", () => {
    const s = ok(createRoom("r", 0), { type: "join", playerId: P0, name: "A" }, P0);
    expect(fail(s, { type: "placeShips", ships: VALID_FLEET }, P0)).toBe("bad_phase");
  });

  it("invalid fleet is rejected", () => {
    expect(fail(joined(), { type: "placeShips", ships: VALID_FLEET.slice(1) }, P0)).toBe(
      "invalid_fleet",
    );
  });

  it("ready without ships is not_ready", () => {
    expect(fail(joined(), { type: "ready" }, P0)).toBe("not_ready");
  });

  it("placeShips after ready is bad_phase", () => {
    let s = joined();
    s = ok(s, { type: "placeShips", ships: VALID_FLEET }, P0);
    s = ok(s, { type: "ready" }, P0);
    expect(fail(s, { type: "placeShips", ships: VALID_FLEET }, P0)).toBe("bad_phase");
  });

  it("both ready starts battle, turn from rng", () => {
    expect(inBattle(rng0).turn).toBe(0);
    expect(inBattle(rng1).turn).toBe(1);
    expect(inBattle().phase).toBe("battle");
  });
});

describe("battle", () => {
  it("fire when not your turn", () => {
    expect(fail(inBattle(), { type: "fire", cell: { r: 9, c: 9 } }, P1)).toBe("not_your_turn");
  });

  it("miss passes the turn, hit keeps it", () => {
    let s = inBattle();
    s = ok(s, { type: "fire", cell: { r: 9, c: 9 } }, P0);
    expect(s.turn).toBe(1);
    expect(s.players[1]?.shotsReceived).toEqual([{ r: 9, c: 9, result: "miss" }]);
    s = ok(s, { type: "fire", cell: { r: 0, c: 0 } }, P1);
    expect(s.turn).toBe(1);
  });

  it("same cell twice and auto-marked cell give already_shot", () => {
    let s = inBattle();
    s = ok(s, { type: "fire", cell: { r: 9, c: 9 } }, P0);
    s = ok(s, { type: "fire", cell: { r: 9, c: 9 } }, P1); // miss on P0 board
    expect(fail(s, { type: "fire", cell: { r: 9, c: 9 } }, P0)).toBe("already_shot");
    // sink the 1-ship at (4,9): neighbors get auto-marked
    s = ok(s, { type: "fire", cell: { r: 4, c: 9 } }, P0);
    expect(fail(s, { type: "fire", cell: { r: 3, c: 9 } }, P0)).toBe("already_shot");
  });

  it("fire in placing is bad_phase", () => {
    expect(fail(joined(), { type: "fire", cell: { r: 0, c: 0 } }, P0)).toBe("bad_phase");
  });

  it("sinking the whole fleet finishes the game", () => {
    let s = inBattle();
    for (const ship of VALID_FLEET) {
      for (const cell of ship.cells) {
        s = ok(s, { type: "fire", cell }, P0);
      }
    }
    expect(s.phase).toBe("finished");
    expect(s.winner).toBe(0);
    expect(s.turn).toBeNull();
  });
});

describe("rematch", () => {
  function finished(): RoomState {
    let s = inBattle();
    for (const ship of VALID_FLEET) {
      for (const cell of ship.cells) s = ok(s, { type: "fire", cell }, P0);
    }
    return s;
  }

  it("one player wanting rematch only flags them", () => {
    const s = ok(finished(), { type: "rematch" }, P1);
    expect(s.phase).toBe("finished");
    expect(s.players[1]?.wantsRematch).toBe(true);
    expect(s.players[0]?.wantsRematch).toBe(false);
  });

  it("both players reset the room to placing", () => {
    let s = ok(finished(), { type: "rematch" }, P1);
    s = ok(s, { type: "rematch" }, P0);
    expect(s.phase).toBe("placing");
    expect(s.winner).toBeNull();
    expect(s.turn).toBeNull();
    for (const p of s.players) {
      expect(p?.ships).toEqual([]);
      expect(p?.shotsReceived).toEqual([]);
      expect(p?.ready).toBe(false);
      expect(p?.wantsRematch).toBe(false);
    }
    expect(s.players[0]?.name).toBe("Alpha");
  });

  it("rematch in battle is bad_phase", () => {
    expect(fail(inBattle(), { type: "rematch" }, P0)).toBe("bad_phase");
  });
});

describe("purity", () => {
  it("reduce does not mutate the input state", () => {
    const s = joined();
    const snapshot = JSON.stringify(s);
    reduce(s, { type: "placeShips", ships: VALID_FLEET }, P0, rng0);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
