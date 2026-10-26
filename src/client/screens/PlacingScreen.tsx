import { useEffect, useMemo, useState } from "react";
import {
  FLEET_SIZES,
  canPlaceShip,
  cellKey,
  makeShip,
  randomFleet,
  validateFleet,
} from "../../game";
import type { Cell, ClientCommand, PlayerView, Ship } from "../../game";
import { Board } from "../components/Board";
import type { CellKind } from "../components/Board";

type Props = {
  view: PlayerView;
  send: (cmd: ClientCommand) => void;
};

export function PlacingScreen({ view, send }: Props) {
  const [ships, setShips] = useState<Ship[]>(view.me.ships);
  const [horizontal, setHorizontal] = useState(true);
  const [selectedSize, setSelectedSize] = useState<number | null>(4);
  const [hover, setHover] = useState<Cell | null>(null);
  // Ships already sent with "ready"; blocks a second tap until the server answers.
  const [submitted, setSubmitted] = useState<Ship[] | null>(null);
  const locked = view.me.ready;

  // Count of ships still to place, per size.
  const remaining = useMemo(() => {
    const left = new Map<number, number>();
    for (const size of FLEET_SIZES) left.set(size, (left.get(size) ?? 0) + 1);
    for (const ship of ships) left.set(ship.cells.length, (left.get(ship.cells.length) ?? 0) - 1);
    return left;
  }, [ships]);

  // Move selection to the next size that still has ships.
  useEffect(() => {
    if (selectedSize !== null && (remaining.get(selectedSize) ?? 0) > 0) return;
    const next = [4, 3, 2, 1].find((s) => (remaining.get(s) ?? 0) > 0) ?? null;
    setSelectedSize(next);
  }, [remaining, selectedSize]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") setHorizontal((h) => !h);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const preview = useMemo(() => {
    if (locked || !hover || selectedSize === null) return null;
    const ship = makeShip(hover, selectedSize, horizontal);
    return { ship, ok: canPlaceShip(ships, ship) };
  }, [hover, selectedSize, horizontal, ships, locked]);

  const shipCells = useMemo(() => {
    const map = new Map<string, number>();
    ships.forEach((ship, i) => ship.cells.forEach((c) => map.set(cellKey(c), i)));
    return map;
  }, [ships]);

  function kindOf(cell: Cell): CellKind {
    const key = cellKey(cell);
    if (shipCells.has(key)) return "ship";
    if (preview?.ship.cells.some((c) => cellKey(c) === key)) {
      return preview.ok ? "preview-ok" : "preview-bad";
    }
    return "water";
  }

  function onCellClick(cell: Cell) {
    if (locked) return;
    setHover(null);
    const index = shipCells.get(cellKey(cell));
    if (index !== undefined) {
      setShips(ships.filter((_, i) => i !== index));
      return;
    }
    if (selectedSize === null) return;
    const ship = makeShip(cell, selectedSize, horizontal);
    if (canPlaceShip(ships, ship)) setShips([...ships, ship]);
  }

  const complete = validateFleet(ships) === true;

  function ready() {
    if (submitted === ships) return;
    setSubmitted(ships);
    send({ type: "placeShips", ships });
    send({ type: "ready" });
  }

  return (
    <section className="screen placing">
      <Board
        title="Твоє поле"
        cells={kindOf}
        onCellClick={onCellClick}
        onCellHover={setHover}
        disabled={locked}
      />
      {locked ? (
        <p className="muted pulse">Ти готовий. Чекаємо суперника…</p>
      ) : (
        <>
          <div className="palette">
            {[4, 3, 2, 1].map((size) => {
              const left = remaining.get(size) ?? 0;
              return (
                <button
                  key={size}
                  type="button"
                  className={`chip ${selectedSize === size ? "chip-active" : ""}`}
                  disabled={left === 0}
                  onClick={() => setSelectedSize(size)}
                >
                  <span className="chip-ship">{"■".repeat(size)}</span>
                  <span className="chip-count">×{left}</span>
                </button>
              );
            })}
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setHorizontal((h) => !h)}>
              Повернути (R): {horizontal ? "—" : "|"}
            </button>
            <button className="btn" onClick={() => setShips(randomFleet(Math.random))}>
              Випадково
            </button>
            <button className="btn" onClick={() => setShips([])} disabled={ships.length === 0}>
              Очистити
            </button>
            <button className="btn btn-primary" onClick={ready} disabled={!complete || submitted === ships}>
              Готово
            </button>
          </div>
        </>
      )}
      <p className="muted">
        Суперник: {view.opponent?.ready ? "готовий ✓" : "ще розставляє…"}
      </p>
    </section>
  );
}
