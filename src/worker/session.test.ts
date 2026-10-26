import { describe, expect, it } from "vitest";
import { createRoom, randomFleet } from "../game";
import type { ClientCommand, RoomState } from "../game";
import { CLOSE_ROOM_FULL, handleMessage, syncOnline } from "./session";
import type { MessageOutcome } from "./session";

const rng = () => 0.1;
const msg = (cmd: ClientCommand) => JSON.stringify(cmd);

function commit(outcome: MessageOutcome): RoomState {
  if (outcome.kind !== "commit") throw new Error(`expected commit, got ${JSON.stringify(outcome)}`);
  return outcome.state;
}

function twoPlayers(): RoomState {
  let state = createRoom("k7f3x9", 0);
  state = commit(handleMessage(state, null, msg({ type: "join", playerId: "a", name: "A" }), rng));
  state = commit(handleMessage(state, null, msg({ type: "join", playerId: "b", name: "B" }), rng));
  return state;
}

describe("handleMessage", () => {
  it("rejects malformed frames without touching state", () => {
    const out = handleMessage(createRoom("k7f3x9", 0), null, "{oops", rng);
    expect(out).toMatchObject({ kind: "reply", msg: { type: "error", code: "bad_message" } });
  });

  it("requires join before other commands", () => {
    const out = handleMessage(createRoom("k7f3x9", 0), null, msg({ type: "ready" }), rng);
    expect(out).toMatchObject({ kind: "reply", msg: { code: "not_joined" } });
  });

  it("attaches the player id on join", () => {
    const out = handleMessage(createRoom("k7f3x9", 0), null, msg({ type: "join", playerId: "a", name: "A" }), rng);
    expect(out).toMatchObject({ kind: "commit", attach: { playerId: "a" } });
  });

  it("does not let a joined socket switch to another player", () => {
    const out = handleMessage(twoPlayers(), { playerId: "a" }, msg({ type: "join", playerId: "b", name: "B" }), rng);
    expect(out).toMatchObject({ kind: "reply", msg: { code: "bad_message" } });
  });

  it("allows re-join with the same id on the same socket", () => {
    const out = handleMessage(twoPlayers(), { playerId: "a" }, msg({ type: "join", playerId: "a", name: "A" }), rng);
    expect(out.kind).toBe("commit");
  });

  it("closes the socket of a third player", () => {
    const out = handleMessage(twoPlayers(), null, msg({ type: "join", playerId: "c", name: "C" }), rng);
    expect(out).toMatchObject({
      kind: "reply",
      msg: { code: "room_full" },
      close: { code: CLOSE_ROOM_FULL },
    });
  });

  it("uses the attached id for game commands", () => {
    const ships = randomFleet(Math.random);
    const state = commit(handleMessage(twoPlayers(), { playerId: "b" }, msg({ type: "placeShips", ships }), rng));
    expect(state.players[1]!.ships).toEqual(ships);
    expect(state.players[0]!.ships).toEqual([]);
  });
});

describe("syncOnline", () => {
  it("marks players without sockets offline and keeps others", () => {
    const next = syncOnline(twoPlayers(), new Set(["a"]));
    expect(next!.players[0]!.online).toBe(true);
    expect(next!.players[1]!.online).toBe(false);
  });

  it("keeps a player online while another tab is still open", () => {
    expect(syncOnline(twoPlayers(), new Set(["a", "b"]))).toBeNull();
  });

  it("brings a player back online when a socket is present", () => {
    const offline = syncOnline(twoPlayers(), new Set())!;
    const back = syncOnline(offline, new Set(["b"]))!;
    expect(back.players[1]!.online).toBe(true);
    expect(back.players[0]!.online).toBe(false);
  });
});
