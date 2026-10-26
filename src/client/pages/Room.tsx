import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { PlayerBar } from "../components/PlayerBar";
import { useRoom } from "../hooks/useRoom";
import { BattleScreen } from "../screens/BattleScreen";
import { PlacingScreen } from "../screens/PlacingScreen";
import { WaitingScreen } from "../screens/WaitingScreen";

export function Room() {
  const { id = "" } = useParams();
  const { view, error, connected, roomFull, expired, send, clearError } = useRoom(id);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 3000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  if (roomFull) {
    return (
      <main className="page">
        <h2>Кімната зайнята</h2>
        <p>Тут уже грають двоє.</p>
        <Link className="btn btn-primary" to="/">
          Створити свою гру
        </Link>
      </main>
    );
  }

  if (expired) {
    return (
      <main className="page">
        <h2>Кімната закрита</h2>
        <p>Кімната живе 24 години і вже видалена.</p>
        <Link className="btn btn-primary" to="/">
          Створити нову гру
        </Link>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="page">
        <p className="muted pulse">{connected ? "Заходимо в кімнату…" : "З'єднання…"}</p>
      </main>
    );
  }

  return (
    <main className="page room">
      <PlayerBar view={view} connected={connected} onRename={(name) => send({ type: "setName", name })} />
      {view.phase === "waiting" && <WaitingScreen />}
      {view.phase === "placing" && <PlacingScreen key={view.me.ready ? "r" : "p"} view={view} send={send} />}
      {(view.phase === "battle" || view.phase === "finished") && <BattleScreen view={view} send={send} />}
      {error && <div className="toast">{error.message}</div>}
    </main>
  );
}
