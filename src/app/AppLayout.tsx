import { LogOut, UserRound } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { BRAND } from "@/config/brand";
import { useAuth } from "@/auth/AuthProvider";
import { TABS } from "./tabs";
import { MoodBubble, useMood } from "@/features/today/MoodContext";

// Frame around every screen: top bar, the screen itself, bottom tab bar
export default function AppLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { partnerMood, partnerName } = useMood();
  const pairedWelcome = location.state?.pairedWelcome as { name: string; note: string } | undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        {/* Left: Brand + your mood bubble */}
        <div className="flex items-center gap-3">
          {/* Mood bubble for the current user */}
          <MoodBubble side="left" />

          <div className="flex min-w-0 flex-col leading-none">
            <span className="font-heading text-3xl font-semibold">{BRAND.name}</span>
            <span className="mt-1 text-[15px] font-medium tracking-[0.18em] text-ink-soft">
              Between Us
            </span>
          </div>
        </div>

        {/* Right: partner mood + profile + sign-out */}
        <div className="flex items-center gap-2">
          {/* Partner mood bubble */}
          {partnerMood && <MoodBubble side="right" partnerName={partnerName} />}

          <Link
            to="/app/profile"
            aria-label="Profile"
            className="rounded-full p-2 text-ink-soft hover:bg-surface hover:text-ink"
          >
            <UserRound size={22} />
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/auth", { replace: true });
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </header>

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