import { useState } from "react";
import { MAX_NAME_LENGTH } from "../../game";
import type { PlayerView } from "../../game";
import { setName as storeName } from "../lib/identity";

type Props = {
  view: PlayerView;
  connected: boolean;
  onRename: (name: string) => void;
};

export function PlayerBar({ view, connected, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(view.me.name);

  function submit() {
    const name = draft.trim();
    if (name.length > 0 && name.length <= MAX_NAME_LENGTH && name !== view.me.name) {
      onRename(name);
      storeName(name);
    }
    setEditing(false);
  }

  return (
    <header className="player-bar">
      <div className="me">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              autoFocus
              maxLength={MAX_NAME_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submit}
            />
          </form>
        ) : (
          <button
            type="button"
            className="link"
            onClick={() => {
              setDraft(view.me.name);
              setEditing(true);
            }}
            title="Змінити ім'я"
          >
            {view.me.name} ✎
          </button>
        )}
      </div>
      <div className="vs">проти</div>
      <div className="opponent">
        {view.opponent ? (
          <>
            {view.opponent.name}
            {!view.opponent.online && <span className="badge badge-warn">офлайн</span>}
          </>
        ) : (
          <span className="muted">…</span>
        )}
      </div>
      {!connected && <div className="banner">Перепідключення…</div>}
    </header>
  );
}
