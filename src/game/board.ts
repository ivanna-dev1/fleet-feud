import type { Cell } from "./types";

export const BOARD_SIZE = 10;

export function isInside(cell: Cell): boolean {
  return cell.r >= 0 && cell.r < BOARD_SIZE && cell.c >= 0 && cell.c < BOARD_SIZE;
}

export function cellKey(cell: Cell): string {
  return `${cell.r},${cell.c}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.r === b.r && a.c === b.c;
}

/** Up to 8 surrounding cells that are inside the board. */
export function neighbors(cell: Cell): Cell[] {
  const result: Cell[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const next = { r: cell.r + dr, c: cell.c + dc };
      if (isInside(next)) result.push(next);
    }
  }
  return result;
}
