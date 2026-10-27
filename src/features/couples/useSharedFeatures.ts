import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { restGet, restPatch, supabaseForSession } from "@/lib/supabase";
import { getMyCouple } from "./api";

export type FeatureKey = "daily_question" | "appreciation_notes" | "micro_challenges";
export type DepthDial = "light" | "mixed" | "deep";

export type FeatureSettings = {
  depth_dial?: DepthDial;
  [key: string]: unknown;
};

export type FeatureSetting = {
  feature_key: FeatureKey;
  enabled: boolean;
  settings: FeatureSettings;
  updated_at: string;
  updated_by?: string | null;
};

export const FEATURE_INFO: {
  key: FeatureKey;
  label: string;
  shortLabel: string;
  detail: string;
  iconName: "HelpCircle" | "Heart" | "Zap";
}[] = [
  {
    key: "daily_question",
    label: "Daily question",
    shortLabel: "Daily question",
    detail: "A private answer from each of you, then a shared reveal.",
    iconName: "HelpCircle",
  },
  {
    key: "appreciation_notes",
    label: "Appreciation notes",
    shortLabel: "Appreciation",
    detail: "Small thank-yous you can send and reread together.",
    iconName: "Heart",
  },
  {
    key: "micro_challenges",
    label: "Micro daily challenges",
    shortLabel: "Daily challenge",
    detail: "One small invitation to connect each day.",
    iconName: "Zap",
  },
];

const LOCAL_STORAGE_KEY = "twologue_couple_features";
const BROADCAST_CHANNEL_NAME = "twologue_shared_features_sync";

const DEFAULT_SETTINGS: FeatureSetting[] = [
  {
    feature_key: "daily_question",
    enabled: true,
    settings: { depth_dial: "mixed" },
    updated_at: new Date().toISOString(),
  },
  {
    feature_key: "appreciation_notes",
    enabled: true,
    settings: {},
    updated_at: new Date().toISOString(),
  },
  {
    feature_key: "micro_challenges",
    enabled: true,
    settings: {},
    updated_at: new Date().toISOString(),
  },
];

function getStoredFeatures(): FeatureSetting[] {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SETTINGS;
    // Ensure all known feature keys exist
    return DEFAULT_SETTINGS.map((def) => {
      const found = parsed.find((p) => p.feature_key === def.feature_key);
      return found ? { ...def, ...found } : def;
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function setStoredFeatures(settings: FeatureSetting[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch { }
}

export function useSharedFeatures() {
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? "local-user";
  const [coupleId, setCoupleId] = React.useState<string | null>(null);
  const [partnerId, setPartnerId] = React.useState<string | null>(null);
  const [partnerName, setPartnerName] = React.useState<string>("Partner");
  const [isPaired, setIsPaired] = React.useState<boolean>(false);
  const [settings, setSettings] = React.useState<FeatureSetting[]>(getStoredFeatures);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<FeatureKey | null>(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);

  // Broadcast channel for multi-tab sync
  const channelRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === "UPDATE" && Array.isArray(event.data?.settings)) {
          setSettings(event.data.settings);
          setStoredFeatures(event.data.settings);
          setLastSyncTime(new Date());
        }
      };
      return () => {
        bc.close();
      };
    }
  }, []);

  function broadcastUpdate(newSettings: FeatureSetting[]) {
    try {
      channelRef.current?.postMessage({ type: "UPDATE", settings: newSettings });
      window.dispatchEvent(new CustomEvent("twologue:shared_features_changed", { detail: newSettings }));
    } catch { }
  }

  const reload = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    // Start with local storage values so UI is never blank
    const local = getStoredFeatures();
    setSettings(local);

    if (!session) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      const couple = await getMyCouple(session);
      if (!couple.couple) {
        setCoupleId(null);
        setPartnerId(null);
        setIsPaired(false);
        setPartnerName("Partner");
        if (!silent) setLoading(false);
        return;
      }

      setCoupleId(couple.couple.id);
      setIsPaired(Boolean(couple.partner));
      if (couple.partner?.id) {
        setPartnerId(couple.partner.id);
      }
      if (couple.partner?.display_name) {
        setPartnerName(couple.partner.display_name);
      }

      const rows = await restGet<FeatureSetting[]>(
        `couple_features?select=feature_key,enabled,settings,updated_at,updated_by&couple_id=eq.${encodeURIComponent(couple.couple.id)}&order=feature_key.asc`,
        session,
      );

      // Merge backend rows with defaults so any un-migrated feature still shows up
      const merged = DEFAULT_SETTINGS.map((def) => {
        const found = rows.find((r) => r.feature_key === def.feature_key);
        return found ? { ...def, ...found } : def;
      });

      setSettings(merged);
      setStoredFeatures(merged);
      setLastSyncTime(new Date());
    } catch (err) {
      // If remote fails, fallback gracefully to cached settings
      if (!silent) {
        setError(err instanceof Error ? err.message : "Couldn't load couple shared settings.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session]);

  // Initial load
  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Supabase Realtime channel subscription + focus listener for couple sync
  React.useEffect(() => {
    if (!session || !coupleId) return;

    let sub: ReturnType<ReturnType<typeof supabaseForSession>["channel"]> | undefined;
    try {
      const client = supabaseForSession(session);
      sub = client
        .channel(`couple-features-sync-${coupleId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "couple_features",
            filter: `couple_id=eq.${coupleId}`,
          },
          () => {
            void reload(true);
          },
        )
        .subscribe();
    } catch { }

    const onFocus = () => void reload(true);
    window.addEventListener("focus", onFocus);

    const onCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FeatureSetting[]>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };
    window.addEventListener("twologue:shared_features_changed", onCustomEvent);

    return () => {
      if (sub) void sub.unsubscribe();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("twologue:shared_features_changed", onCustomEvent);
    };
  }, [coupleId, reload, session]);

  function isEnabled(key: FeatureKey): boolean {
    const setting = settings.find((item) => item.feature_key === key);
    return setting ? setting.enabled : true;
  }

  function isPausedByPartner(key: FeatureKey): boolean {
    const setting = settings.find((item) => item.feature_key === key);
    if (!setting || setting.enabled) return false;
    return Boolean(setting.updated_by && setting.updated_by !== currentUserId);
  }

  function isPausedByMe(key: FeatureKey): boolean {
    const setting = settings.find((item) => item.feature_key === key);
    if (!setting || setting.enabled) return false;
    return Boolean(setting.updated_by && setting.updated_by === currentUserId);
  }

  function canToggleFeature(key: FeatureKey): boolean {
    const setting = settings.find((item) => item.feature_key === key);
    if (!setting || setting.enabled) {
      // Anyone can turn an active feature off
      return true;
    }
    // If paused, only the partner who turned it off can turn it back on
    if (isPausedByPartner(key)) {
      return false;
    }
    return true;
  }

  // Set feature on/off
  async function setFeature(key: FeatureKey, enabled: boolean) {
    if (enabled && isPausedByPartner(key)) {
      const info = FEATURE_INFO.find((f) => f.key === key);
      const label = info?.shortLabel ?? "this feature";
      setError(`Only ${partnerName} can turn ${label} back on.`);
      return;
    }

    const previous = settings;
    const nowIso = new Date().toISOString();
    const updated = settings.map((item) =>
      item.feature_key === key
        ? { ...item, enabled, updated_by: currentUserId, updated_at: nowIso }
        : item,
    );

    // Optimistic local update
    setSettings(updated);
    setStoredFeatures(updated);
    broadcastUpdate(updated);
    setSaving(key);
    setError("");
    setNotice("");

    // If paired and session is active, persist to database
    if (session && coupleId) {
      try {
        const rows = await restPatch<FeatureSetting[]>(
          `couple_features?couple_id=eq.${encodeURIComponent(coupleId)}&feature_key=eq.${encodeURIComponent(key)}`,
          { enabled },
          session,
        );
        if (rows.length) {
          const synced = settings.map((item) => (item.feature_key === key ? rows[0] : item));
          setSettings(synced);
          setStoredFeatures(synced);
          broadcastUpdate(synced);
        }
        setNotice(
          enabled
            ? `Turned on for both you and ${partnerName}.`
            : `Paused for both you and ${partnerName}. Only you can turn this back on.`,
        );
      } catch (err) {
        setSettings(previous);
        setStoredFeatures(previous);
        broadcastUpdate(previous);
        setError(err instanceof Error ? err.message : "Couldn't save this setting to your shared space.");
      } finally {
        setSaving(null);
      }
    } else {
      // Local/solo mode: saved successfully
      setSaving(null);
      setNotice(
        enabled
          ? "Turned on (will sync with your partner once paired)."
          : "Paused for the couple. Only you can turn this back on.",
      );
    }
  }

  // Set daily question depth dial
  async function setDepthDial(value: DepthDial) {
    const previous = settings;
    const updated = settings.map((item) =>
      item.feature_key === "daily_question"
        ? { ...item, settings: { ...item.settings, depth_dial: value } }
        : item,
    );

    setSettings(updated);
    setStoredFeatures(updated);
    broadcastUpdate(updated);
    setSaving("daily_question");
    setError("");
    setNotice("");

    if (session && coupleId) {
      try {
        const daily = settings.find((item) => item.feature_key === "daily_question");
        const rows = await restPatch<FeatureSetting[]>(
          `couple_features?couple_id=eq.${encodeURIComponent(coupleId)}&feature_key=eq.daily_question`,
          { settings: { ...(daily?.settings ?? {}), depth_dial: value } },
          session,
        );
        if (rows.length) {
          const synced = settings.map((item) => (item.feature_key === "daily_question" ? rows[0] : item));
          setSettings(synced);
          setStoredFeatures(synced);
          broadcastUpdate(synced);
        }
        setNotice(`Daily question depth updated for both of you.`);
      } catch (err) {
        setSettings(previous);
        setStoredFeatures(previous);
        broadcastUpdate(previous);
        setError(err instanceof Error ? err.message : "Couldn't save depth dial.");
      } finally {
        setSaving(null);
      }
    } else {
      setSaving(null);
      setNotice("Depth dial saved.");
    }
  }

  function getDepthDial(): DepthDial {
    const daily = settings.find((item) => item.feature_key === "daily_question");
    return daily?.settings?.depth_dial ?? "mixed";
  }

  return {
    settings,
    isEnabled,
    canToggleFeature,
    isPausedByPartner,
    isPausedByMe,
    currentUserId,
    partnerId,
    getDepthDial,
    setFeature,
    setDepthDial,
    loading,
    saving,
    error,
    notice,
    isPaired,
    partnerName,
    coupleId,
    lastSyncTime,
    reload,
  };
}
