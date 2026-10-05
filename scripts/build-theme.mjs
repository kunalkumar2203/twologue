// Turns src/theme/tokens.json into CSS variables, one block per theme and mode.
// Runs automatically before `npm run dev` and `npm run build`.
import { readFileSync, writeFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync("src/theme/tokens.json", "utf8"));
const toKebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

let css = "/* Generated from tokens.json by scripts/build-theme.mjs. Do not edit. */\n";
for (const [id, theme] of Object.entries(tokens)) {
  for (const mode of ["light", "dark"]) {
    const vars = Object.entries(theme[mode])
      .map(([name, value]) => `  --${toKebab(name)}: ${value};`)
      .join("\n");
    css += `\n[data-theme="${id}"][data-mode="${mode}"] {\n${vars}\n}\n`;
  }
}
writeFileSync("src/theme/themes.generated.css", css);
