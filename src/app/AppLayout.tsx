import { Settings } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { BRAND } from "@/config/brand";
import { TABS } from "./tabs";

// Frame around every screen: top bar, the screen itself, bottom tab bar
export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col leading-none">
          <span className="font-heading text-3xl font-semibold">{BRAND.name}</span>
          <span className="mt-1 text-[15px] font-medium tracking-[0.18em] text-ink-soft">Between Us</span>
        </div>
        <Link to="/app/settings" aria-label="Settings" className="rounded-full p-2 text-ink-soft hover:text-ink">
          <Settings size={22} />
        </Link>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
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