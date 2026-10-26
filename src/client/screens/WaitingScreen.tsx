import { useState } from "react";

export function WaitingScreen() {
  const link = location.href;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("room-link") as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <section className="screen waiting">
      <h2>Кинь другу посилання</h2>
      <div className="link-row">
        <input id="room-link" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={copy}>
          {copied ? "Скопійовано ✓" : "Скопіювати"}
        </button>
      </div>
      <p className="muted pulse">Чекаємо суперника…</p>
    </section>
  );
}
