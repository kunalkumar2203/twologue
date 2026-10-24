import { Bell, ChevronRight, LogOut, Mail, MapPin, Settings, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MOCK_PROFILE = {
  name: "Alex Morgan",
  username: "alex.morgan",
  location: "San Francisco, CA",
  memberSince: "October 2026",
};

const profileItems = [
  { label: "Email address", value: "alex.morgan@example.com", icon: Mail },
  { label: "Location", value: MOCK_PROFILE.location, icon: MapPin },
  { label: "Member since", value: MOCK_PROFILE.memberSince, icon: ShieldCheck },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "alex.morgan@example.com";

  return (
    <section className="w-full max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-soft">Your account</p>
          <h1 className="mt-1 text-3xl font-semibold">Profile</h1>
        </div>
        <Link
          to="/app/settings"
          aria-label="Settings"
          className="rounded-full p-2 text-ink-soft hover:bg-surface hover:text-ink"
        >
          <Settings className="size-5" />
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
        <Avatar size="lg" className="size-16 bg-accent/15 text-accent">
          <AvatarFallback className="bg-accent/15 text-xl font-semibold text-accent">AM</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{MOCK_PROFILE.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">@{MOCK_PROFILE.username}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Personal information</h2>
        <div className="mt-3 divide-y divide-ink-soft/15 rounded-3xl border border-ink-soft/20 bg-surface px-4 sm:px-5">
          {profileItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-soft">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft">{label}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{label === "Email address" ? email : value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Account</h2>
        <Link
          to="/app/settings"
          className="mt-3 flex items-center gap-3 rounded-3xl border border-ink-soft/20 bg-surface p-4 hover:border-accent/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-soft">
            <Settings className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Settings</span>
            <span className="mt-0.5 block text-sm text-ink-soft">Appearance and shared feature preferences</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-soft" />
        </Link>
      </div>

      {/* Sign out */}
      <div className="mt-4">
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/auth", { replace: true });
          }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-3xl border border-red-500/20 bg-surface p-4 text-left hover:border-red-500/50 hover:bg-red-500/5 transition-colors"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <LogOut className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-red-600 dark:text-red-400">Sign out</span>
            <span className="mt-0.5 block text-sm text-ink-soft">Sign out of your Twologue account</span>
          </span>
        </button>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-ink-soft">
        <Bell className="size-3.5" /> Profile details are placeholders for now.
      </p>
    </section>
  );
}
