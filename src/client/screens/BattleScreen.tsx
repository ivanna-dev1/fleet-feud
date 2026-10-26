import { useEffect, useMemo, useState } from "react";
import { FLEET_SIZES, cellKey, sunkShipSizes } from "../../game";
import type { Cell, ClientCommand, PlayerView, Ship, Shot } from "../../game";
import { Board } from "../components/Board";
import type { CellKind } from "../components/Board";

type Props = {
  view: PlayerView;
  send: (cmd: ClientCommand) => void;
};

function buildLookup(ships: Ship[] | null, shots: Shot[]): (cell: Cell) => CellKind {
  const shipSet = new Set((ships ?? []).flatMap((s) => s.cells.map(cellKey)));
  const shotMap = new Map(shots.map((s) => [cellKey(s), s.result]));
  return (cell) => {
    const key = cellKey(cell);
    const shot = shotMap.get(key);
    if (shot) return shot;
    return shipSet.has(key) ? "ship" : "water";
  };
}

export function BattleScreen({ view, send }: Props) {
  const finished = view.phase === "finished";
  const myBoard = useMemo(
    () => buildLookup(view.me.ships, view.me.shotsReceived),
    [view.me.ships, view.me.shotsReceived],
  );
  const enemyShots = view.opponent?.shotsReceived ?? [];
  const enemyBoard = useMemo(
    () => buildLookup(view.opponent?.ships ?? null, enemyShots),
    [view.opponent?.ships, enemyShots],
  );
  const shotKeys = useMemo(() => new Set(enemyShots.map(cellKey)), [enemyShots]);
  // Enemy ships still afloat, per size.
  const afloat = useMemo(() => {
    const left = new Map<number, number>();
    for (const size of FLEET_SIZES) left.set(size, (left.get(size) ?? 0) + 1);
    for (const size of sunkShipSizes(enemyShots)) left.set(size, (left.get(size) ?? 0) - 1);
    return left;
  }, [enemyShots]);
  const afloatTotal = [...afloat.values()].reduce((a, b) => a + b, 0);
  // Shot sent but not answered yet; a fresh view from the server clears it.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [view]);

  function fire(cell: Cell) {
    const key = cellKey(cell);
    if (!view.myTurn || pending === key || shotKeys.has(key)) return;
    setPending(key);
    send({ type: "fire", cell });
  }

  let status: string;
  if (finished) {
    status = view.winner === "me" ? "🏆 Ти переміг!" : "💥 Ти програв";
  } else {
    status = view.myTurn ? "Твій хід — стріляй по полю суперника" : "Хід суперника…";
  }

  return (
    <section className="screen battle">
      <p className={`status ${finished ? "" : view.myTurn ? "status-active" : "status-opponent"}`}>
        {status}
      </p>
      <div className="boards">
        <div className="board-column">
          <Board
            title={`Поле суперника${view.opponent ? ` (${view.opponent.name})` : ""}`}
            cells={enemyBoard}
            onCellClick={finished ? undefined : fire}
            disabled={!view.myTurn || finished}
          />
          {!finished && (
            <div className="fleet-left">
              <p className="muted">
                Залишилось кораблів: {afloatTotal} з {FLEET_SIZES.length}
              </p>
              <div className="palette">
                {[4, 3, 2, 1].map((size) => {
                  const left = afloat.get(size) ?? 0;
                  return (
                    <span key={size} className={`chip ${left === 0 ? "chip-done" : ""}`}>
                      <span className="chip-ship">{"■".repeat(size)}</span>
                      <span className="chip-count">×{left}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <Board title="Твоє поле" cells={myBoard} disabled />
      </div>
      {finished && (
        <div className="actions">
          {view.me.wantsRematch ? (
            <p className="muted pulse">Чекаємо суперника…</p>
          ) : (
            <button className="btn btn-primary" onClick={() => send({ type: "rematch" })}>
              Реванш
            </button>
          )}
          {view.opponent?.wantsRematch && !view.me.wantsRematch && (
            <p className="muted">Суперник хоче реванш</p>
          )}
        </div>
      )}
    </section>
  );
}
