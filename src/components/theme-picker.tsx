import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePalette } from "@/components/palette-provider";
import { PALETTES } from "@/config/themes";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { palette, setPalette, mode, toggleMode } = usePalette();
  const swatchColor = (id: (typeof PALETTES)[number]["id"]) => {
    const selected = PALETTES.find((item) => item.id === id);
    return mode === "dark" ? selected?.darkAccent : selected?.lightAccent;
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            aria-label="Choose a colour theme"
          >
            <span
              className="size-4 rounded-full ring-1 ring-border"
              style={{ background: swatchColor(palette) }}
            />
            <span className="hidden sm:inline">
              {PALETTES.find((p) => p.id === palette)?.label}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {PALETTES.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setPalette(p.id)}
              aria-pressed={palette === p.id}
              className={cn(
                "flex items-center gap-2",
                palette === p.id && "font-semibold"
              )}
            >
              <span
                className="size-4 shrink-0 rounded-full ring-1 ring-border"
                style={{ background: swatchColor(p.id) }}
              />
              <span className="flex flex-col">
                <span>{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.vibe}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={toggleMode}
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
