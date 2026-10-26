import { BOARD_SIZE, cellKey, isInside, neighbors } from "./board";
import type { Cell, Ship } from "./types";

export const FLEET_SIZES: readonly number[] = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

export type FleetError =
  | "fleet_count"
  | "fleet_composition"
  | "ship_shape"
  | "out_of_bounds"
  | "ships_touch"
  | "cells_overlap";

function isStraightLine(cells: Cell[]): boolean {
  const first = cells[0];
  if (!first) return false;
  const sameRow = cells.every((c) => c.r === first.r);
  const sameCol = cells.every((c) => c.c === first.c);
  if (!sameRow && !sameCol) return false;
  const coords = cells.map((c) => (sameRow ? c.c : c.r)).sort((a, b) => a - b);
  return coords.every((v, i) => i === 0 || v === coords[i - 1]! + 1);
}

/** Checks shape, bounds, overlap and touching. Does not check fleet composition. */
function checkPlacement(ships: Ship[]): FleetError | null {
  const occupied = new Set<string>();
  for (const ship of ships) {
    if (!ship.cells.every(isInside)) return "out_of_bounds";
    for (const cell of ship.cells) {
      const key = cellKey(cell);
      if (occupied.has(key)) return "cells_overlap";
      occupied.add(key);
    }
    if (!isStraightLine(ship.cells)) return "ship_shape";
  }
  // A ship touches another if any neighbor cell belongs to a different ship.
  for (const ship of ships) {
    const own = new Set(ship.cells.map(cellKey));
    for (const cell of ship.cells) {
      for (const n of neighbors(cell)) {
        const key = cellKey(n);
        if (occupied.has(key) && !own.has(key)) return "ships_touch";
      }
    }
  }
  return null;
}

export function validateFleet(ships: Ship[]): true | FleetError {
  if (ships.length !== FLEET_SIZES.length) return "fleet_count";
  const sizes = ships.map((s) => s.cells.length).sort((a, b) => b - a);
  if (sizes.some((size, i) => size !== FLEET_SIZES[i])) return "fleet_composition";
  return checkPlacement(ships) ?? true;
}

/** True when `candidate` fits next to `existing` ships (shape, bounds, no touch). */
export function canPlaceShip(existing: Ship[], candidate: Ship): boolean {
  return checkPlacement([...existing, candidate]) === null;
}

export function makeShip(start: Cell, length: number, horizontal: boolean): Ship {
  return {
    cells: Array.from({ length }, (_, i) =>
      horizontal ? { r: start.r, c: start.c + i } : { r: start.r + i, c: start.c },
    ),
  };
}

export function randomFleet(rng: () => number): Ship[] {
  for (;;) {
    const ships: Ship[] = [];
    let failed = false;
    for (const length of FLEET_SIZES) {
      let placed = false;
      for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
        const horizontal = rng() < 0.5;
        const start = {
          r: Math.floor(rng() * BOARD_SIZE),
          c: Math.floor(rng() * BOARD_SIZE),
        };
        const ship = makeShip(start, length, horizontal);
        if (canPlaceShip(ships, ship)) {
          ships.push(ship);
          placed = true;
        }
      }
      if (!placed) {
        failed = true;
        break;
      }
    }
    if (!failed) return ships;
  }
}
