import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
// Fonts are bundled with the app, so nothing is fetched from other sites
import "@fontsource-variable/fraunces";
import "@fontsource-variable/figtree";
import "@fontsource/kalam/400.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);