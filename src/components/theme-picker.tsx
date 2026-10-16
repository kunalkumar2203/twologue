import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import tokens from "@/theme/tokens.json";
import { THEMES } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const [hovered, setHovered] = React.useState<string | null>(null);
  const swatchColor = (id: (typeof THEMES)[number]["id"]) => {
    return tokens[id][mode].accent;
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu onOpenChange={() => setHovered(null)}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full sm:h-9 sm:w-auto sm:px-3"
            aria-label="Choose a colour theme"
          >
            <span
              className="size-4 rounded-full ring-1 ring-border"
              style={{ background: swatchColor(theme) }}
            />
            <span className="hidden sm:inline">
              {THEMES.find((item) => item.id === theme)?.label}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-ink-soft/20 bg-page text-ink shadow-lg"
        >
          {THEMES.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setTheme(p.id)}
              aria-pressed={theme === p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p.id)}
              onBlur={() => setHovered(null)}
              style={
                hovered === p.id
                  ? {
                      backgroundColor: `color-mix(in srgb, ${swatchColor(p.id)} 28%, transparent)`,
                      boxShadow: `inset 3px 0 0 ${swatchColor(p.id)}`,
                    }
                  : undefined
              }
              className={cn(
                "flex items-center gap-2 focus:bg-surface focus:text-ink",
                theme === p.id && "font-semibold"
              )}
            >
              <span
                className="size-4 shrink-0 rounded-full ring-1 ring-border"
                style={{ background: swatchColor(p.id) }}
              />
              <span className="flex flex-col">
                <span>{p.label}</span>
                <span className="text-xs text-ink-soft">{p.vibe}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        aria-pressed={mode === "dark"}
      >
        {mode === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </Button>
    </div>
  );
}
