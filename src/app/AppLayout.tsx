import { UserRound } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { BRAND } from "@/config/brand";
import { TABS } from "./tabs";
import { MoodBubble, useMood } from "@/features/today/MoodContext";
import { SetupGate } from "@/features/couples/SetupGate";

// Frame around every screen: top bar, the screen itself, bottom tab bar
export default function AppLayout() {
  const location = useLocation();
  const { hasPartner, partnerMood, partnerName } = useMood();
  const pairedWelcome = location.state?.pairedWelcome as { name: string; note: string } | undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="flex items-center justify-between gap-2 px-3 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6 lg:px-8">
        {/* Left: Brand name only */}
        <div className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-heading text-2xl font-semibold sm:text-3xl">{BRAND.name}</span>
          <span className="mt-1 truncate text-[11px] font-medium tracking-[0.16em] text-ink-soft sm:text-[15px] sm:tracking-[0.18em]">
            Between Us
          </span>
        </div>

        {/* Right: both mood bubbles side-by-side + profile */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Mood bubbles side by side with labels */}
          <div className="flex items-end gap-1.5 sm:gap-2">
            {/* Your mood bubble */}
            <div className="flex flex-col items-center gap-0.5">
              <MoodBubble side="left" />
              <span className="text-[9px] font-medium text-ink-soft sm:text-[10px] leading-none">You</span>
            </div>
            {/* Partner mood bubble, shown when partner exists */}
            {(hasPartner || partnerMood) && (
              <div className="flex flex-col items-center gap-0.5">
                <MoodBubble side="right" partnerName={partnerName} />
                <span
                  className="max-w-[4rem] truncate text-[9px] font-medium text-ink-soft sm:text-[10px] leading-none text-center"
                  title={partnerName}
                >
                  {partnerName}
                </span>
              </div>
            )}
          </div>

          <Link
            to="/app/profile"
            aria-label="Profile"
            className="rounded-full p-2 text-ink-soft hover:bg-surface hover:text-ink"
          >
            <UserRound size={22} />
          </Link>
        </div>
      </header>

      <SetupGate />
      
      <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
        {pairedWelcome && (
          <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-ink">
            You’re connected with {pairedWelcome.name}. Welcome to your shared space. {pairedWelcome.note}
          </p>
        )}
        <Outlet />
      </main>

      {/* pb keeps the bar clear of the phone's home indicator */}
      <nav className="sticky bottom-0 border-t border-ink-soft/20 bg-page pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex w-full max-w-2xl">
          {TABS.map(({ path, label, icon: Icon }) => (
            <li key={path} className="flex-1">
              <NavLink
                to={path}
                end={path === "/app"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2 text-xs ${isActive ? "text-accent" : "text-ink-soft"}`
                }
              >
                <Icon size={22} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}