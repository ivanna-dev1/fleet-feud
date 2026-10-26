import { cellKey, neighbors, sameCell } from "./board";
import type { Cell, Ship, Shot, ShotResult } from "./types";

export function hasShot(shots: Shot[], cell: Cell): boolean {
  return shots.some((s) => sameCell(s, cell));
}

function shipAt(ships: Ship[], cell: Cell): Ship | undefined {
  return ships.find((ship) => ship.cells.some((c) => sameCell(c, cell)));
}

function isShipSunk(ship: Ship, shots: Shot[]): boolean {
  return ship.cells.every((c) => hasShot(shots, c));
}

/**
 * Applies one shot. Returns a new shots array (input is not mutated).
 * When a ship sinks: its cells become "sunk" and all free neighbor cells become "miss".
 */
export function applyShot(
  ships: Ship[],
  shots: Shot[],
  cell: Cell,
): { result: ShotResult; shots: Shot[] } {
  const ship = shipAt(ships, cell);
  if (!ship) {
    return { result: "miss", shots: [...shots, { ...cell, result: "miss" }] };
  }
  const withHit: Shot[] = [...shots, { ...cell, result: "hit" }];
  if (!isShipSunk(ship, withHit)) {
    return { result: "hit", shots: withHit };
  }
  const shipKeys = new Set(ship.cells.map(cellKey));
  const result: Shot[] = withHit.map((s) =>
    shipKeys.has(cellKey(s)) ? { ...s, result: "sunk" } : s,
  );
  for (const c of ship.cells) {
    for (const n of neighbors(c)) {
      if (!shipKeys.has(cellKey(n)) && !hasShot(result, n)) {
        result.push({ ...n, result: "miss" });
      }
    }
  }
  return { result: "sunk", shots: result };
}

/**
 * Sizes of sunk ships, read only from shots (works without knowing enemy ships).
 * Ships never touch, so every group of adjacent "sunk" cells is one ship.
 */
export function sunkShipSizes(shots: Shot[]): number[] {
  const sunk = new Set(shots.filter((s) => s.result === "sunk").map(cellKey));
  const seen = new Set<string>();
  const sizes: number[] = [];
  for (const shot of shots) {
    const start = cellKey(shot);
    if (!sunk.has(start) || seen.has(start)) continue;
    let size = 0;
    const stack: Cell[] = [shot];
    seen.add(start);
    while (stack.length > 0) {
      const cell = stack.pop()!;
      size += 1;
      for (const n of neighbors(cell)) {
        const key = cellKey(n);
        if (sunk.has(key) && !seen.has(key)) {
          seen.add(key);
          stack.push(n);
        }
      }
    }
    sizes.push(size);
  }
  return sizes;
}

export function isFleetSunk(ships: Ship[], shots: Shot[]): boolean {
  return ships.every((ship) => isShipSunk(ship, shots));
}
