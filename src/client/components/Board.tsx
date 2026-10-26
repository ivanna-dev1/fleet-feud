import { Fragment } from "react";
import { BOARD_SIZE } from "../../game";
import type { Cell } from "../../game";
import styles from "./Board.module.css";

export type CellKind =
  | "water"
  | "ship"
  | "miss"
  | "hit"
  | "sunk"
  | "preview-ok"
  | "preview-bad";

type Props = {
  cells: (cell: Cell) => CellKind;
  onCellClick?: (cell: Cell) => void;
  onCellHover?: (cell: Cell | null) => void;
  disabled?: boolean;
  title?: string;
};

const LETTERS = "АБВГДЕЖЗИК";

export function Board({ cells, onCellClick, onCellHover, disabled, title }: Props) {
  const indices = Array.from({ length: BOARD_SIZE }, (_, i) => i);
  return (
    <div className={styles.wrap}>
      {title && <div className={styles.title}>{title}</div>}
      <div
        className={`${styles.board} ${disabled ? styles.disabled : ""}`}
        onPointerLeave={() => onCellHover?.(null)}
      >
        <div className={styles.corner} />
        {indices.map((c) => (
          <div key={`c${c}`} className={styles.label}>
            {LETTERS[c]}
          </div>
        ))}
        {indices.map((r) => (
          <Fragment key={`r${r}`}>
            <div className={styles.label}>{r + 1}</div>
            {indices.map((c) => {
              const cell = { r, c };
              const kind = cells(cell);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={`${styles.cell} ${styles[kind]}`}
                  disabled={disabled || !onCellClick}
                  onClick={() => onCellClick?.(cell)}
                  // Hover preview only for a mouse: on touch screens it would stick to the tapped cell.
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") onCellHover?.(cell);
                  }}
                  aria-label={`${LETTERS[c]}${r + 1}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
