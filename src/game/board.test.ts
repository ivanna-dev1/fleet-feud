import { describe, expect, it } from "vitest";
import { cellKey, isInside, neighbors, sameCell } from "./board";

describe("board", () => {
  it("isInside accepts corners and rejects outside cells", () => {
    expect(isInside({ r: 0, c: 0 })).toBe(true);
    expect(isInside({ r: 9, c: 9 })).toBe(true);
    expect(isInside({ r: -1, c: 0 })).toBe(false);
    expect(isInside({ r: 0, c: 10 })).toBe(false);
  });

  it("neighbors returns 8 cells in the middle and 3 in a corner", () => {
    expect(neighbors({ r: 5, c: 5 })).toHaveLength(8);
    expect(neighbors({ r: 0, c: 0 })).toHaveLength(3);
    expect(neighbors({ r: 0, c: 5 })).toHaveLength(5);
  });

  it("cellKey and sameCell", () => {
    expect(cellKey({ r: 2, c: 7 })).toBe("2,7");
    expect(sameCell({ r: 2, c: 7 }, { r: 2, c: 7 })).toBe(true);
    expect(sameCell({ r: 2, c: 7 }, { r: 7, c: 2 })).toBe(false);
  });
});
