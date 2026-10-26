import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Home() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function createRoom() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/room", { method: "POST" });
      const { id } = (await res.json()) as { id: string };
      navigate(`/room/${id}`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <main className="page home">
      <h1 className="logo">Fleet Feud</h1>
      <p className="tagline">Морський бій на двох. Створи гру, кинь другу посилання.</p>
      <button className="btn btn-primary btn-big" onClick={createRoom} disabled={busy}>
        {busy ? "Створюю…" : "Створити гру"}
      </button>
      {failed && <p className="error-text">Не вдалося створити кімнату. Спробуй ще раз.</p>}
    </main>
  );
}
