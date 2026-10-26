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

export function isFleetSunk(ships: Ship[], shots: Shot[]): boolean {
  return ships.every((ship) => isShipSunk(ship, shots));
}
