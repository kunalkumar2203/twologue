import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import tokens from "./tokens.json";

const COLOUR_NAMES = ["page", "surface", "ink", "inkSoft", "accent", "onAccent"];

// Every theme must define every colour in both modes, as a valid hex code
describe("theme colours", () => {
  for (const [id, theme] of Object.entries(tokens)) {
    for (const mode of ["light", "dark"] as const) {
      it(`${id} (${mode}) is complete`, () => {
        const colours: Record<string, string> = theme[mode];
        for (const name of COLOUR_NAMES) expect(colours[name]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    }
  }
});

it("the default theme exists", () => {
  expect(Object.keys(tokens)).toContain(BRAND.defaultTheme);
});