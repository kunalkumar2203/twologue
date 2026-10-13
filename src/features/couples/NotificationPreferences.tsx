import * as React from "react";
import { Bell, LoaderCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { restGet, restPatch } from "@/lib/supabase";

type NotificationPreference = {
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  timezone: string;
};

export function NotificationPreferences() {
  const { session, user } = useAuth();
  const [preference, setPreference] = React.useState<NotificationPreference | null>(null);
  const [time, setTime] = React.useState("09:00");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const reload = React.useCallback(async (silent = false) => {
    if (!session || !user) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const rows = await restGet<NotificationPreference[]>(
        `notification_preferences?select=daily_reminder_enabled,daily_reminder_time,timezone&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        session,
      );
      if (!rows[0]) throw new Error("Reminder preferences are missing. Apply the latest Supabase migrations.");
      setPreference(rows[0]);
      setTime(rows[0].daily_reminder_time.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load reminder preferences.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session, user]);

  React.useEffect(() => { void reload(); }, [reload]);
  React.useEffect(() => {
    const onFocus = () => void reload(true);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [reload]);

  async function updatePreference(changes: Partial<NotificationPreference>) {
    if (!session || !user || !preference) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const rows = await restPatch<NotificationPreference[]>(
        `notification_preferences?user_id=eq.${encodeURIComponent(user.id)}`,
        { ...changes, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || preference.timezone },
        session,
      );
      if (!rows[0]) throw new Error("No reminder preference was updated. Refresh and try again.");
      setPreference(rows[0]);
      setTime(rows[0].daily_reminder_time.slice(0, 5));
      setNotice("Reminder preference saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save reminder preferences.");
      await reload();
    } finally {
      setSaving(false);
    }
  }

  return <section className="mt-10">
    <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Bell className="size-5" /></div><div><h2 className="text-xl font-semibold">Daily reminder</h2><p className="text-sm text-ink-soft">A gentle nudge, in your local time.</p></div></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-ink-soft">{notice}</p>}
    {loading ? <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft"><LoaderCircle className="size-4 animate-spin" /> Loading reminder preferences…</p> : preference && <div className="mt-4 rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4"><div><p className="font-semibold">Remind me about today's question</p><p className="mt-1 text-sm text-ink-soft">This is a personal setting, not a shared couple toggle.</p></div><Switch checked={preference.daily_reminder_enabled} disabled={saving} onCheckedChange={(checked) => void updatePreference({ daily_reminder_enabled: checked })} aria-label="Enable daily reminder" /></div>
      <form onSubmit={(event) => { event.preventDefault(); void updatePreference({ daily_reminder_time: time }); }} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-36 flex-1 space-y-1.5 text-sm font-medium">Reminder time<Input type="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={saving || !preference.daily_reminder_enabled} required /></label>
        <Button type="submit" variant="outline" className="rounded-full" disabled={saving || !preference.daily_reminder_enabled || time === preference.daily_reminder_time.slice(0, 5)}>{saving && <LoaderCircle className="size-4 animate-spin" />}Save time</Button>
      </form>
      <p className="mt-3 text-xs text-ink-soft">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone || preference.timezone}</p>
      <p className="mt-2 text-xs leading-5 text-ink-soft">Email delivery also needs the optional server-side worker, schedule, and provider credentials configured as described in SUPABASE_SETUP.md. Push notifications are not enabled yet.</p>
    </div>}
  </section>;
}
