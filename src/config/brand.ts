// Product identity in one place. Change a value here and it updates everywhere.
export const BRAND = {
  name: "Twologue",
  tagline: "Between Us",
  description: "A web app that helps couples connect, play and talk things through.",
  defaultTheme: "ember", // must be a key in src/theme/tokens.json
  themeStorageKey: "twologue-theme", // browser remembers the theme choice
  modeStorageKey: "twologue-mode", // browser remembers the mode choice
} as const;