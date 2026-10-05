import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." means "src/..." so imports stay short
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});