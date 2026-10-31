import { Link } from "react-router";
import { ArrowRight, UserPlus } from "lucide-react";
import tokens from "@/theme/tokens.json";
import { useTheme } from "@/theme/ThemeProvider";
import { THEMES } from "@/theme/themes";
import { Button } from "@/components/ui/button";
import { useCoupleStatus } from "@/features/couples/hooks";
import { SharedFeatureSettings } from "@/features/couples/SharedFeatureSettings";
import InvitePartnerCard from "@/features/couples/InvitePartnerCard";
import { CoupleProfileSettings } from "@/features/couples/CoupleProfileSettings";

const MODES = ["light", "dark"] as const;

export default function Settings() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const { isPaired, hasPendingInvite } = useCoupleStatus();

  return (
    <section className="w-full max-w-3xl">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <div className="mt-8">
        {isPaired ? (
          <InvitePartnerCard />
        ) : (
          <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <UserPlus className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-soft">Your couple space</p>
                <h2 className="text-xl font-semibold">Invite your partner</h2>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Connect with your partner to unlock your shared daily questions, journal, and relationship preferences.
                </p>
                <Button asChild className="mt-4 rounded-full bg-accent text-on-accent hover:bg-accent/90 min-h-10 px-5">
                  <Link to="/app" className="inline-flex items-center gap-2 font-medium">
                    <UserPlus className="size-4" />
                    <span>{hasPendingInvite ? "Create invitation link" : "Create invitation"}</span>
                    <ArrowRight className="size-4 ml-0.5 opacity-70" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

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

      {isPaired && (
        <>
          <CoupleProfileSettings />
          <SharedFeatureSettings />
        </>
      )}
    </section>
  );
}