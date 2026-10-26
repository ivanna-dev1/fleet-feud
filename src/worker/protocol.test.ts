import { describe, expect, it } from "vitest";
import { parseCommand } from "./protocol";

describe("parseCommand", () => {
  it("rejects non-json and unknown types", () => {
    expect(parseCommand("nope")).toBeNull();
    expect(parseCommand(JSON.stringify({ type: "hack" }))).toBeNull();
  });

  it("keeps only known fields on ships and cells", () => {
    const raw = JSON.stringify({
      type: "placeShips",
      ships: [{ cells: [{ r: 1, c: 2, extra: "x" }], secret: true }],
    });
    expect(parseCommand(raw)).toEqual({ type: "placeShips", ships: [{ cells: [{ r: 1, c: 2 }] }] });
  });

  it("rejects cells outside the board", () => {
    expect(parseCommand(JSON.stringify({ type: "fire", cell: { r: 50, c: -3 } }))).toBeNull();
    expect(
      parseCommand(JSON.stringify({ type: "placeShips", ships: [{ cells: [{ r: 0, c: 10 }] }] })),
    ).toBeNull();
  });

  it("parses fire", () => {
    expect(parseCommand(JSON.stringify({ type: "fire", cell: { r: 3, c: 4, junk: 1 } }))).toEqual({
      type: "fire",
      cell: { r: 3, c: 4 },
    });
  });
});
