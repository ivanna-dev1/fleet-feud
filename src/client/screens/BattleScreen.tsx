import { useEffect, useMemo, useState } from "react";
import { cellKey } from "../../game";
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
      <p className={`status ${view.myTurn && !finished ? "status-active" : ""}`}>{status}</p>
      <div className="boards">
        <Board
          title={`Поле суперника${view.opponent ? ` (${view.opponent.name})` : ""}`}
          cells={enemyBoard}
          onCellClick={finished ? undefined : fire}
          disabled={!view.myTurn || finished}
        />
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
