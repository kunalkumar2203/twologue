import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import tokens from "./tokens.json";
import type { Mode, ThemeId } from "./themes";

type Settings = { theme: ThemeId; mode: Mode };
type ThemeContext = Settings & {
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: Mode) => void;
};

const STORAGE_KEY = "theme-settings";
const Context = createContext<ThemeContext | null>(null);

// Use the saved choice if valid, otherwise Ember in the device's light/dark setting
function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.theme in tokens && (saved.mode === "light" || saved.mode === "dark")) return saved;
  } catch {
    // Unreadable saved data: fall through to the defaults
  }
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  return { theme: "ember", mode: prefersDark ? "dark" : "light" };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  // Set the attributes the theme CSS listens to, and remember the choice
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.mode = settings.mode;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <Context.Provider
      value={{
        ...settings,
        setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
        setMode: (mode) => setSettings((s) => ({ ...s, mode })),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}