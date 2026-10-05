import { Settings } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { TABS } from "./tabs";

// Frame around every screen: top bar, the screen itself, bottom tab bar
export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-col leading-none">
          <span className="font-heading text-3xl font-semibold">Twologue</span>
          <span className="mt-1 text-[15px] font-medium tracking-[0.18em] text-ink-soft">Between Us</span>
        </div>
        <Link to="/settings" aria-label="Settings" className="rounded-full p-2 text-ink-soft hover:text-ink">
          <Settings size={22} />
        </Link>
      </header>

      <main className="flex-1 px-5 py-4">
        <Outlet />
      </main>

      {/* pb keeps the bar clear of the phone's home indicator */}
      <nav className="sticky bottom-0 border-t border-ink-soft/20 bg-page pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {TABS.map(({ path, label, icon: Icon }) => (
            <li key={path} className="flex-1">
              <NavLink
                to={path}
                end={path === "/"}
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