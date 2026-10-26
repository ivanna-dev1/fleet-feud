import { useEffect, useRef, useState } from "react";
import { THEMES, applyTheme, getTheme, type Theme } from "../lib/theme";

function Swatches({ theme }: { theme: Theme }) {
  return (
    <span className="swatches">
      {theme.swatches.map((color) => (
        <span key={color} className="swatch" style={{ background: color }} />
      ))}
    </span>
  );
}

export function ThemePicker() {
  const [current, setCurrent] = useState(getTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(current);
  }, [current]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        type="button"
        className="theme-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Тема"
        onClick={() => setOpen((o) => !o)}
      >
        <Swatches theme={current} />
      </button>
      {open && (
        <ul className="theme-menu" role="listbox" aria-label="Тема">
          {THEMES.map((theme) => (
            <li key={theme.id} role="option" aria-selected={theme.id === current.id}>
              <button
                type="button"
                className={theme.id === current.id ? "theme-option theme-option-active" : "theme-option"}
                onClick={() => {
                  setCurrent(theme);
                  setOpen(false);
                }}
              >
                <span>{theme.name}</span>
                <Swatches theme={theme} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
