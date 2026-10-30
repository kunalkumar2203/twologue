import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, Mail, MapPin, Settings, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { zoneLabel } from "@/config/time-zones";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDay } from "@/lib/format";
import { restGet } from "@/lib/supabase";

type ProfileRow = { display_name: string | null; time_zone: string | null; created_at: string };

export default function Profile() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const rows = await restGet<ProfileRow[]>(
        `profiles?select=display_name,time_zone,created_at&id=eq.${encodeURIComponent(user!.id)}`,
        session!,
      );
      return rows[0] ?? null;
    },
    enabled: Boolean(session && user),
  });

  const name = profile.data?.display_name?.trim() || "Your name";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
  const items = [
    { label: "Email address", value: user?.email ?? "Not available", icon: Mail },
    { label: "Time zone", value: profile.data?.time_zone ? zoneLabel(profile.data.time_zone) : "Not set", icon: MapPin },
    {
      label: "Member since",
      value: profile.data ? formatDay(profile.data.created_at.slice(0, 10)) : "Loading…",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="w-full max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-soft">Your account</p>
          <h1 className="mt-1 text-3xl font-semibold">Profile</h1>
        </div>
        <Link to="/app/settings" aria-label="Settings" className="rounded-full p-2 text-ink-soft hover:bg-surface hover:text-ink">
          <Settings className="size-5" />
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
        <Avatar size="lg" className="size-16 bg-accent/15 text-accent">
          <AvatarFallback className="bg-accent/15 text-xl font-semibold text-accent">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{name}</h2>
          {profile.isError && <p className="mt-1 text-sm text-red-700 dark:text-red-300">We couldn't load your details. Try again later.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Personal information</h2>
        <div className="mt-3 divide-y divide-ink-soft/15 rounded-3xl border border-ink-soft/20 bg-surface px-4 sm:px-5">
          {items.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-soft">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft">{label}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Account</h2>
        <Link to="/app/settings" className="mt-3 flex items-center gap-3 rounded-3xl border border-ink-soft/20 bg-surface p-4 hover:border-accent/50">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-soft">
            <Settings className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Settings</span>
            <span className="mt-0.5 block text-sm text-ink-soft">Our shared setup, switches and appearance</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-soft" />
        </Link>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/auth", { replace: true });
          }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-3xl border border-red-500/20 bg-surface p-4 text-left transition-colors hover:border-red-500/50 hover:bg-red-500/5"
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
    </section>
  );
}
