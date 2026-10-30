import tokens from "@/theme/tokens.json";
import { useTheme } from "@/theme/ThemeProvider";
import { THEMES } from "@/theme/themes";
import { SharedFeatureSettings } from "@/features/couples/SharedFeatureSettings";
import InvitePartnerCard from "@/features/couples/InvitePartnerCard";
import { CoupleProfileSettings } from "@/features/couples/CoupleProfileSettings";

const MODES = ["light", "dark"] as const;

export default function Settings() {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <section className="w-full max-w-3xl">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <div className="mt-8"><InvitePartnerCard /></div>
      <h2 className="mt-8 text-xl font-semibold">Appearance</h2>

      <div role="group" aria-label="Light or dark" className="mt-3 inline-flex rounded-full bg-surface p-1">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${mode === m ? "bg-accent text-on-accent" : "text-ink-soft"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <ul className="mt-4 grid gap-3">
        {THEMES.map(({ id, label, vibe }) => {
          const colors = tokens[id][mode];
          return (
            <li key={id}>
              <button
                onClick={() => setTheme(id)}
                aria-pressed={theme === id}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-surface p-3 text-left ${theme === id ? "border-accent" : "border-transparent"}`}
              >
                {/* Half background colour, half accent colour, in the current mode */}
                <span
                  className="size-9 rounded-full border border-ink-soft/30"
                  style={{ background: `linear-gradient(135deg, ${colors.page} 50%, ${colors.accent} 50%)` }}
                />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-ink-soft">{vibe}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <CoupleProfileSettings />
      <SharedFeatureSettings />
    </section>
  );
}