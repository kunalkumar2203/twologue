import tokens from "./tokens.json";

export type ThemeId = keyof typeof tokens;
export type Mode = "light" | "dark";

// Name and one-line feel of each theme, for the theme picker
export const THEMES = (Object.keys(tokens) as ThemeId[]).map((id) => ({
  id,
  label: tokens[id].label,
  vibe: tokens[id].vibe,
}));
