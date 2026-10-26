import { describe, expect, it } from "vitest";
import { FLEET_SIZES, canPlaceShip, randomFleet, validateFleet } from "./fleet";
import type { Ship } from "./types";

function row(r: number, c: number, len: number): Ship {
  return { cells: Array.from({ length: len }, (_, i) => ({ r, c: c + i })) };
}

/** Classic valid layout: ships in rows 0,2,4,6,8 with gaps. */
export const VALID_FLEET: Ship[] = [
  row(0, 0, 4),
  row(0, 5, 3),
  row(2, 0, 3),
  row(2, 4, 2),
  row(2, 7, 2),
  row(4, 0, 2),
  row(4, 3, 1),
  row(4, 5, 1),
  row(4, 7, 1),
  row(4, 9, 1),
];

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("validateFleet", () => {
  it("accepts a classic valid layout", () => {
    expect(validateFleet(VALID_FLEET)).toBe(true);
  });

  it("FLEET_SIZES is the classic fleet", () => {
    expect(FLEET_SIZES).toEqual([4, 3, 3, 2, 2, 2, 1, 1, 1, 1]);
  });

  it("rejects 9 ships", () => {
    expect(validateFleet(VALID_FLEET.slice(0, 9))).toBe("fleet_count");
  });

  it("rejects wrong composition (a 1x5 ship)", () => {
    const ships = [row(0, 0, 5), ...VALID_FLEET.slice(1)];
    expect(validateFleet(ships)).toBe("fleet_composition");
  });

  it("rejects an L-shaped ship", () => {
    const l: Ship = { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 2 }] };
    const ships = [l, ...VALID_FLEET.slice(1)];
    expect(validateFleet(ships)).toBe("ship_shape");
  });

  it("rejects a cell outside the board", () => {
    const ships = [row(0, 7, 4), ...VALID_FLEET.slice(1)];
    expect(validateFleet(ships)).toBe("out_of_bounds");
  });

  it("rejects ships touching by a corner", () => {
    const ships = [...VALID_FLEET];
    ships[1] = row(1, 4, 3); // corner-touches the 4-ship at (0,3)
    expect(validateFleet(ships)).toBe("ships_touch");
  });

  it("rejects duplicate cells", () => {
    const ships = [...VALID_FLEET];
    ships[0] = { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 1 }, { r: 0, c: 2 }] };
    expect(validateFleet(ships)).toBe("cells_overlap");
  });
});

describe("randomFleet", () => {
  it("always produces a valid fleet", () => {
    for (let i = 0; i < 100; i++) {
      expect(validateFleet(randomFleet(Math.random))).toBe(true);
    }
  });

  it("is deterministic for the same rng", () => {
    expect(randomFleet(seededRng(42))).toEqual(randomFleet(seededRng(42)));
  });
});

describe("canPlaceShip", () => {
  it("allows a free spot and blocks a touching spot", () => {
    const existing = [row(0, 0, 4)];
    expect(canPlaceShip(existing, row(2, 0, 3))).toBe(true);
    expect(canPlaceShip(existing, row(1, 4, 3))).toBe(false);
    expect(canPlaceShip(existing, row(5, 8, 3))).toBe(false); // out of bounds
  });
});
