import { describe, expect, it } from "vitest";
import { VALID_FLEET } from "./fleet.test";
import { createRoom, reduce } from "./room";
import type { ClientCommand, RoomState } from "./types";
import { toPlayerView } from "./view";

const P0 = "p0";
const P1 = "p1";

function ok(state: RoomState, cmd: ClientCommand, playerId: string): RoomState {
  const res = reduce(state, cmd, playerId, () => 0);
  if (!res.ok) throw new Error(res.code);
  return res.state;
}

function battle(): RoomState {
  let s = createRoom("r", 0);
  s = ok(s, { type: "join", playerId: P0, name: "A" }, P0);
  s = ok(s, { type: "join", playerId: P1, name: "B" }, P1);
  s = ok(s, { type: "placeShips", ships: VALID_FLEET }, P0);
  s = ok(s, { type: "placeShips", ships: VALID_FLEET }, P1);
  s = ok(s, { type: "ready" }, P0);
  s = ok(s, { type: "ready" }, P1);
  return s;
}

describe("toPlayerView", () => {
  it("alone in waiting: opponent is null", () => {
    const s = ok(createRoom("r", 0), { type: "join", playerId: P0, name: "A" }, P0);
    const v = toPlayerView(s, P0);
    expect(v.opponent).toBeNull();
    expect(v.me.index).toBe(0);
    expect(v.roomId).toBe("r");
    expect(v.myTurn).toBe(false);
    expect(v.winner).toBeNull();
  });

  it("hides opponent ships during battle, shows own", () => {
    const v = toPlayerView(battle(), P1);
    expect(v.opponent?.ships).toBeNull();
    expect(v.me.ships).toEqual(VALID_FLEET);
    expect(JSON.stringify(v.opponent)).not.toContain('"cells"');
    expect(v.me.index).toBe(1);
  });

  it("myTurn is correct for both players", () => {
    const s = battle();
    expect(toPlayerView(s, P0).myTurn).toBe(true);
    expect(toPlayerView(s, P1).myTurn).toBe(false);
  });

  it("in finished: opponent ships visible and winner relative", () => {
    let s = battle();
    for (const ship of VALID_FLEET) for (const cell of ship.cells) s = ok(s, { type: "fire", cell }, P0);
    expect(toPlayerView(s, P0).winner).toBe("me");
    expect(toPlayerView(s, P1).winner).toBe("opponent");
    expect(toPlayerView(s, P0).opponent?.ships).toEqual(VALID_FLEET);
  });

  it("throws for a player not in the room", () => {
    expect(() => toPlayerView(battle(), "nobody")).toThrow();
  });
});
