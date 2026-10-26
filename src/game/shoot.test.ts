import { describe, expect, it } from "vitest";
import { FLEET_SIZES, randomFleet } from "./fleet";
import { applyShot, hasShot, isFleetSunk, sunkShipSizes } from "./shoot";
import type { Ship, Shot } from "./types";

const twoShip: Ship = { cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }] };
const oneShip: Ship = { cells: [{ r: 5, c: 5 }] };
const ships = [twoShip, oneShip];

function keys(shots: Shot[]): string[] {
  return shots.map((s) => `${s.r},${s.c}:${s.result}`).sort();
}

describe("applyShot", () => {
  it("miss adds one miss shot", () => {
    const { result, shots } = applyShot(ships, [], { r: 9, c: 9 });
    expect(result).toBe("miss");
    expect(shots).toEqual([{ r: 9, c: 9, result: "miss" }]);
  });

  it("hit on a 2-ship", () => {
    const { result, shots } = applyShot(ships, [], { r: 0, c: 0 });
    expect(result).toBe("hit");
    expect(shots).toEqual([{ r: 0, c: 0, result: "hit" }]);
  });

  it("sinking a corner ship marks all neighbors as miss and hits as sunk", () => {
    const first = applyShot(ships, [], { r: 0, c: 0 });
    const { result, shots } = applyShot(ships, first.shots, { r: 0, c: 1 });
    expect(result).toBe("sunk");
    expect(keys(shots)).toEqual(
      ["0,0:sunk", "0,1:sunk", "0,2:miss", "1,0:miss", "1,1:miss", "1,2:miss"].sort(),
    );
  });

  it("sinking a middle 1-ship marks 8 neighbors", () => {
    const { result, shots } = applyShot(ships, [], { r: 5, c: 5 });
    expect(result).toBe("sunk");
    expect(shots).toHaveLength(9);
    expect(shots.filter((s) => s.result === "miss")).toHaveLength(8);
  });

  it("does not duplicate already present shots when auto-marking", () => {
    const before: Shot[] = [{ r: 4, c: 4, result: "miss" }];
    const { shots } = applyShot(ships, before, { r: 5, c: 5 });
    expect(shots).toHaveLength(9);
  });

  it("does not mutate input", () => {
    const before: Shot[] = [];
    applyShot(ships, before, { r: 1, c: 1 });
    expect(before).toEqual([]);
  });
});

describe("sunkShipSizes", () => {
  it("is empty without sunk ships, ignoring hits", () => {
    const hit = applyShot(ships, [], { r: 0, c: 0 }).shots;
    expect(sunkShipSizes(hit)).toEqual([]);
  });

  it("groups sunk cells into ships", () => {
    const a = applyShot(ships, [], { r: 0, c: 0 }).shots;
    const b = applyShot(ships, a, { r: 0, c: 1 }).shots;
    const c = applyShot(ships, b, { r: 5, c: 5 }).shots;
    expect(sunkShipSizes(c).sort()).toEqual([1, 2]);
  });

  it("finds every ship of a fully sunk random fleet", () => {
    const fleet = randomFleet(Math.random);
    let shots: Shot[] = [];
    for (const ship of fleet) for (const cell of ship.cells) shots = applyShot(fleet, shots, cell).shots;
    expect(sunkShipSizes(shots).sort()).toEqual([...FLEET_SIZES].sort());
  });
});

describe("isFleetSunk / hasShot", () => {
  it("partial fleet is not sunk, full is", () => {
    const partial = applyShot(ships, [], { r: 5, c: 5 }).shots;
    expect(isFleetSunk(ships, partial)).toBe(false);
    const a = applyShot(ships, partial, { r: 0, c: 0 }).shots;
    const b = applyShot(ships, a, { r: 0, c: 1 }).shots;
    expect(isFleetSunk(ships, b)).toBe(true);
  });

  it("hasShot", () => {
    const shots: Shot[] = [{ r: 1, c: 2, result: "miss" }];
    expect(hasShot(shots, { r: 1, c: 2 })).toBe(true);
    expect(hasShot(shots, { r: 2, c: 1 })).toBe(false);
  });
});
