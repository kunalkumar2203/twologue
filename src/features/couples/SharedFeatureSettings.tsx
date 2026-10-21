import * as React from "react";
import { Link } from "react-router";
import { LoaderCircle, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Switch } from "@/components/ui/switch";
import { restGet, restPatch } from "@/lib/supabase";
import { getMyCouple } from "./api";

type FeatureKey = "daily_question" | "appreciation_notes" | "micro_challenges";
type DepthDial = "light" | "mixed" | "deep";
type FeatureSettings = { depth_dial?: DepthDial };
type FeatureSetting = { feature_key: FeatureKey; enabled: boolean; settings: FeatureSettings; updated_at: string };

const FEATURE_INFO: { key: FeatureKey; label: string; detail: string }[] = [
  { key: "daily_question", label: "Daily question", detail: "A private answer from each of you, then a shared reveal." },
  { key: "appreciation_notes", label: "Appreciation notes", detail: "Small thank-yous you can send and reread together." },
  { key: "micro_challenges", label: "Micro challenges", detail: "One small invitation to connect each day." },
];

const DEPTH_OPTIONS: { value: DepthDial; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "mixed", label: "Mixed" },
  { value: "deep", label: "Deep" },
];

export function SharedFeatureSettings() {
  const { session } = useAuth();
  const [coupleId, setCoupleId] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<FeatureSetting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<FeatureKey | null>(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const reload = React.useCallback(async (silent = false) => {
    if (!session) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const couple = await getMyCouple(session);
      if (!couple.couple) {
        setCoupleId(null);
        setSettings([]);
        return;
      }
      setCoupleId(couple.couple.id);
      const rows = await restGet<FeatureSetting[]>(
        `couple_features?select=feature_key,enabled,settings,updated_at&couple_id=eq.${encodeURIComponent(couple.couple.id)}&order=feature_key.asc`,
        session,
      );
      setSettings(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your shared feature settings.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session]);

  React.useEffect(() => { void reload(); }, [reload]);
  React.useEffect(() => {
    // Keep the shared settings fresh when the partner switches back to this tab.
    const onFocus = () => void reload(true);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, 20_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [reload]);

  async function setFeature(key: FeatureKey, enabled: boolean) {
    if (!session || !coupleId) return;
    const previous = settings;
    setSettings((current) => current.map((item) => item.feature_key === key ? { ...item, enabled } : item));
    setSaving(key);
    setError("");
    setNotice("");
    try {
      const rows = await restPatch<FeatureSetting[]>(
        `couple_features?couple_id=eq.${encodeURIComponent(coupleId)}&feature_key=eq.${encodeURIComponent(key)}`,
        { enabled },
        session,
      );
      if (!rows.length) throw new Error("No setting was updated. Refresh the page and try again.");
      setSettings((current) => current.map((item) => item.feature_key === key ? rows[0] : item));
      setNotice("Saved for both of you.");
    } catch (err) {
      setSettings(previous);
      setError(err instanceof Error ? err.message : "Couldn't save this setting.");
    } finally {
      setSaving(null);
    }
  }

  async function setDepthDial(value: DepthDial) {
    if (!session || !coupleId) return;
    const previous = settings;
    setSettings((current) => current.map((item) => item.feature_key === "daily_question"
      ? { ...item, settings: { ...item.settings, depth_dial: value } }
      : item));
    setSaving("daily_question");
    setError("");
    setNotice("");
    try {
      const daily = settings.find((item) => item.feature_key === "daily_question");
      const rows = await restPatch<FeatureSetting[]>(
        `couple_features?couple_id=eq.${encodeURIComponent(coupleId)}&feature_key=eq.daily_question`,
        { settings: { ...(daily?.settings ?? {}), depth_dial: value } },
        session,
      );
      if (!rows.length) throw new Error("No daily question setting was updated. Refresh the page and try again.");
      setSettings((current) => current.map((item) => item.feature_key === "daily_question" ? rows[0] : item));
      setNotice("Daily question depth saved for both of you.");
    } catch (err) {
      setSettings(previous);
      setError(err instanceof Error ? err.message : "Couldn't save the daily question depth.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><SlidersHorizontal className="size-5" /></div>
        <div><h2 className="text-xl font-semibold">Shared features</h2><p className="text-sm text-ink-soft">These switches apply to both partners.</p></div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-ink-soft">{notice}</p>}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft"><LoaderCircle className="size-4 animate-spin" /> Loading shared settings…</p>
      ) : !coupleId ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-soft/30 bg-surface p-4 text-sm leading-6 text-ink-soft">
          Pair your account before changing shared settings. <Link to="/app/us" className="font-semibold text-ink underline underline-offset-4">Open your shared space</Link>.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-ink-soft/20 bg-surface">
          {FEATURE_INFO.map((feature, index) => {
            const setting = settings.find((item) => item.feature_key === feature.key);
            const missing = !setting;
            return <div key={feature.key} className={`flex items-center justify-between gap-4 p-4 sm:p-5 ${index ? "border-t border-ink-soft/15" : ""}`}>
              <div className="min-w-0">
                <p className="font-semibold">{feature.label}</p>
                <p className="mt-1 text-sm leading-5 text-ink-soft">{feature.detail}</p>
                {feature.key === "daily_question" && setting && (
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Daily question depth">
                    {DEPTH_OPTIONS.map((option) => {
                      const selected = (setting.settings.depth_dial ?? "mixed") === option.value;
                      return <button
                        key={option.value}
                        type="button"
                        disabled={saving !== null}
                        onClick={() => void setDepthDial(option.value)}
                        aria-pressed={selected}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${selected ? "border-accent bg-accent text-on-accent" : "border-ink-soft/20 text-ink-soft hover:border-accent/40"}`}
                      >
                        {option.label}
                      </button>;
                    })}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {saving === feature.key && <LoaderCircle className="size-4 animate-spin text-ink-soft" />}
                <Switch
                  checked={setting?.enabled ?? false}
                  disabled={missing || saving !== null}
                  onCheckedChange={(checked) => void setFeature(feature.key, checked)}
                  aria-label={`${feature.label} shared setting`}
                />
              </div>
            </div>;
          })}
          {settings.length !== FEATURE_INFO.length && <p className="border-t border-ink-soft/15 px-4 py-3 text-xs text-ink-soft">Some settings are missing. Run the latest feature migration before using every toggle.</p>}
        </div>
      )}
    </section>
  );
}
