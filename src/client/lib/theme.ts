export type Theme = {
  id: string;
  name: string;
  bg: string;
  swatches: string[];
};

export const THEMES: Theme[] = [
  { id: "lagoon", name: "Лагуна", bg: "#086288", swatches: ["#086288", "#4E8DBB", "#98D6FF", "#FFEEC4"] },
  { id: "dusk", name: "Сутінки", bg: "#141A45", swatches: ["#141A45", "#4C5799", "#7288B2", "#E8E0D0"] },
  { id: "sea-foam", name: "Морська піна", bg: "#93C5BC", swatches: ["#93C5BC", "#4B9CAA", "#F5F3C2", "#E27533"] },
];

export const DEFAULT_THEME = THEMES[0]!;

// Also read by the inline script in index.html to apply the theme before first paint.
const THEME_KEY = "ff.theme";

export function getTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage blocked: fall back to the default theme.
  }
  return THEMES.find((t) => t.id === stored) ?? DEFAULT_THEME;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    // Storage blocked: the theme lasts only for this page load.
  }
}
