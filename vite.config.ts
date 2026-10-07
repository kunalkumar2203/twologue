import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { BRAND } from "./src/config/brand.ts";

// Fills %NAME% placeholders in index.html from src/config/brand.ts
const htmlValues: Record<string, string> = {
  BRAND_NAME: BRAND.name,
  BRAND_TAGLINE: BRAND.tagline,
  BRAND_DESCRIPTION: BRAND.description,
  DEFAULT_THEME: BRAND.defaultTheme,
  THEME_STORAGE_KEY: BRAND.themeStorageKey,
};
const brandInHtml = (): Plugin => ({
  name: "brand-in-html",
  transformIndexHtml: (html) => html.replace(/%(\w+)%/g, (match, key) => htmlValues[key] ?? match),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), brandInHtml()],
  // "@/..." means "src/..." so imports stay short
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});