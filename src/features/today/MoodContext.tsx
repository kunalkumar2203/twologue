import * as React from "react";
import { CloudSun, Cloud } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import {
  MOOD_OPTIONS,
  getMyMood,
  getPartnerMood,
  setMyMood,
  clearMyMood,
  type MoodEntry,
  isMoodFresh,
  getMsUntilNextMidnight,
} from "./api";
import { getMyCouple } from "@/features/couples/api";
import { useSharedFeatures } from "@/features/couples/useSharedFeatures";
import { supabaseForSession } from "@/lib/supabase";

type MoodContextValue = {
  myMood: MoodEntry | null;
  partnerMood: MoodEntry | null;
  hasPartner: boolean;
  setHasPartner: (has: boolean) => void;
  partnerName: string;
  setPartnerName: (name: string) => void;
  saving: boolean;
  saveMood: (icon: string, label: string, note: string) => Promise<void>;
  clearMood: () => Promise<void>;
  refreshMoods: () => Promise<void>;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
};

const MoodContext = React.createContext<MoodContextValue | null>(null);

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const sessionRef = React.useRef(session);
  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [myMood, setMyMood_] = React.useState<MoodEntry | null>(null);
  const [partnerMood, setPartnerMood] = React.useState<MoodEntry | null>(null);
  const [hasPartner, setHasPartner] = React.useState(false);
  const [partnerName, setPartnerName] = React.useState("Partner");
  const [saving, setSaving] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const refreshMoods = React.useCallback(async () => {
    try {
      const [mm, pm] = await Promise.all([
        getMyMood(sessionRef.current),
        getPartnerMood(sessionRef.current),
      ]);
      setMyMood_(mm);
      setPartnerMood(pm);
      if (pm !== null) {
        setHasPartner(true);
      }
    } catch {
      // Mood load errors are non-blocking
    }
  }, []);

  // Initial load, couple detection, and scheduled resets (midnight & 24h & visibility)
  React.useEffect(() => {
    void refreshMoods();

    // Check couple info for partner existence
    if (sessionRef.current) {
      getMyCouple(sessionRef.current)
        .then((coupleData) => {
          if (coupleData?.partner) {
            setHasPartner(true);
            if (coupleData.partner.display_name) {
              setPartnerName(coupleData.partner.display_name);
            }
          }
        })
        .catch(() => {});
    }

    // Schedule automatic reset timer at midnight in local/anchor timezone
    let midnightTimer: number | undefined;
    function scheduleMidnightCheck() {
      const ms = getMsUntilNextMidnight();
      midnightTimer = window.setTimeout(() => {
        // At midnight, reset stale moods
        setMyMood_((prev) => (isMoodFresh(prev) ? prev : null));
        setPartnerMood((prev) => (isMoodFresh(prev) ? prev : null));
        void refreshMoods();
        scheduleMidnightCheck();
      }, ms);
    }
    scheduleMidnightCheck();

    // Periodic freshness check every 30 seconds for 24-hour expiration
    const interval = window.setInterval(() => {
      setMyMood_((prev) => (isMoodFresh(prev) ? prev : null));
      setPartnerMood((prev) => (isMoodFresh(prev) ? prev : null));
    }, 30_000);

    // Refresh and re-validate on tab wake / visibility change
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        setMyMood_((prev) => (isMoodFresh(prev) ? prev : null));
        setPartnerMood((prev) => (isMoodFresh(prev) ? prev : null));
        void refreshMoods();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, refreshMoods]);

  // Realtime subscription for mood updates
  React.useEffect(() => {
    if (!session) return;
    const authSession = session;
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof supabaseForSession>["channel"]> | undefined;

    async function subscribeToMoodChanges() {
      try {
        const coupleData = await getMyCouple(authSession);
        if (cancelled || !coupleData.couple || !coupleData.partner) return;
        setHasPartner(true);
        if (coupleData.partner.display_name) {
          setPartnerName(coupleData.partner.display_name);
        }
        const client = supabaseForSession(authSession);
        channel = client
          .channel(`mood-updates-${authSession.user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "daily_moods", filter: `couple_id=eq.${coupleData.couple.id}` },
            () => void refreshMoods(),
          )
          .subscribe();
      } catch {
        // Polling fallback
      }
    }

    void subscribeToMoodChanges();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshMoods();
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (channel) void channel.unsubscribe();
    };
  }, [refreshMoods, session]);

  const saveMood = React.useCallback(async (icon: string, label: string, note: string) => {
    setSaving(true);
    try {
      await setMyMood(sessionRef.current, { icon, label, note, private: false });
      const now = new Date().toISOString();
      setMyMood_({
        id: `mood-${Date.now()}`,
        icon,
        label,
        note,
        private: false,
        created_at: now,
        updated_at: now,
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const clearMood = React.useCallback(async () => {
    setSaving(true);
    try {
      await clearMyMood(sessionRef.current);
      setMyMood_(null);
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <MoodContext.Provider
      value={{
        myMood,
        partnerMood,
        hasPartner,
        setHasPartner,
        partnerName,
        setPartnerName,
        saving,
        saveMood,
        clearMood,
        refreshMoods,
        pickerOpen,
        setPickerOpen,
      }}
    >
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const ctx = React.useContext(MoodContext);
  if (!ctx) throw new Error("useMood must be used inside <MoodProvider>");
  return ctx;
}

export function MoodBubble({ side, partnerName: propPartnerName }: { side: "left" | "right"; partnerName?: string }) {
  const {
    myMood,
    partnerMood,
    partnerName: ctxPartnerName,
    saving,
    saveMood,
    clearMood,
    pickerOpen,
    setPickerOpen,
  } = useMood();
  const [partnerPopupOpen, setPartnerPopupOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<{ icon: string; label: string } | null>(null);
  const [note, setNote] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const { isEnabled } = useSharedFeatures();

  const isOwn = side === "left";
  const partnerName = propPartnerName ?? ctxPartnerName ?? "Partner";
  const mood = isOwn ? myMood : partnerMood;
  const open = isOwn ? pickerOpen : partnerPopupOpen;
  const setOpen = React.useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      if (isOwn) {
        setPickerOpen(typeof v === "function" ? v(pickerOpen) : v);
      } else {
        setPartnerPopupOpen(v);
      }
    },
    [isOwn, pickerOpen, setPickerOpen],
  );

  // Sync initial selection from current mood when opening
  React.useEffect(() => {
    if (open && isOwn) {
      if (myMood) {
        setSelected({ icon: myMood.icon, label: myMood.label });
        setNote(myMood.note ?? "");
      } else {
        setSelected(null);
        setNote("");
      }
    }
  }, [open, isOwn, myMood]);

  // Close popover when clicking outside
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  function handleToggleOpen() {
    setOpen((v) => !v);
  }

  async function handleConfirm() {
    if (!selected || saving) return;
    try {
      await saveMood(selected.icon, selected.label, note);
      setOpen(false);
    } catch {
      // Handled in saveMood
    }
  }

  async function handleClear() {
    if (saving) return;
    try {
      await clearMood();
      setOpen(false);
      setSelected(null);
      setNote("");
    } catch {
      // Handled in clearMood
    }
  }

  if (!isEnabled("mood")) return null;

  return (
    <div ref={ref} className="relative group flex items-center">
      {/* The circular status bubble */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={
          mood
            ? `${isOwn ? "Your" : `${partnerName}'s`} emotional weather: ${mood.label}${mood.note ? ` — "${mood.note}"` : ""}`
            : isOwn
            ? "No mood set for today. Click to set your emotional weather."
            : `${partnerName} hasn't shared their weather today.`
        }
        aria-label={
          isOwn
            ? mood
              ? `Your mood: ${mood.label}. Click to update.`
              : "No mood set for today. Click to set your emotional weather."
            : `${partnerName}'s weather: ${mood ? mood.label : "not set today"}`
        }
        className={[
          "group/btn relative flex size-11 items-center justify-center rounded-full text-lg transition-all duration-200 select-none cursor-pointer sm:size-9",
          mood
            ? "border-accent/40 bg-accent/10 hover:border-accent hover:bg-accent/15 hover:shadow-xs"
            : isOwn
            ? "border-2 border-dashed border-accent/40 bg-accent/5 text-accent hover:border-accent hover:bg-accent/15 hover:shadow-xs active:scale-95"
            : "border border-dashed border-ink-soft/30 bg-surface/40 text-ink-soft/40 hover:border-ink-soft/50 hover:bg-surface/70 active:scale-95",
          open && "border-accent bg-accent/20 ring-2 ring-accent/30",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {mood ? (
          <span className="leading-none text-xl transition-transform duration-200 group-hover/btn:scale-110">
            {mood.icon}
          </span>
        ) : isOwn ? (
          <div className="relative flex items-center justify-center">
            <CloudSun className="size-4.5 text-accent/75 transition-transform duration-200 group-hover/btn:scale-110" />
            <span className="absolute -bottom-1 -right-1 flex size-3 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-on-accent shadow-xs">
              +
            </span>
          </div>
        ) : (
          <Cloud className="size-4 text-ink-soft/40 transition-transform duration-200 group-hover/btn:scale-110" />
        )}
      </button>

      {/* Desktop Hover Prompt Tooltip — hidden on mobile and when dialog is open */}
      {!open && (
        <div
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-40 mt-2.5 hidden w-64 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 sm:block"
        >
          <div className="relative rounded-2xl border border-accent/25 bg-page/95 p-3.5 shadow-xl backdrop-blur-md">
            {/* Arrow pointer centered under bubble */}
            <div className="absolute -top-1.5 right-3.5 size-3 rotate-45 border-l border-t border-accent/25 bg-page" />

            {isOwn ? (
              mood ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{mood.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">Your weather: {mood.label}</p>
                      <p className="truncate text-[11px] text-ink-soft">
                        {mood.note ? `"${mood.note}"` : `Shared with ${partnerName}`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 border-t border-ink-soft/10 pt-1.5 text-[10px] text-accent font-medium">
                    Click to update or clear • Resets at midnight
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-lg">
                      🌤️
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">Set your mood for today</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                        Share your atmosphere with {partnerName}. Tap to choose your weather.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-ink-soft/10 pt-2 text-[10px] text-accent font-medium">
                    <span>Resets daily at midnight</span>
                    <span className="tracking-widest">☀️⛅🌩️🌫️</span>
                  </div>
                </div>
              )
            ) : mood ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{mood.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">{partnerName}'s weather: {mood.label}</p>
                    <p className="truncate text-[11px] text-ink-soft">
                      {mood.note ? `"${mood.note}"` : "Shared today"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 border-t border-ink-soft/10 pt-1.5 text-[10px] text-ink-soft opacity-80">
                  Visible only to you two • Resets at midnight
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface border border-ink-soft/15 text-lg">
                    ☁️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">{partnerName}'s weather</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                      {partnerName} hasn't shared their atmosphere today yet.
                    </p>
                  </div>
                </div>
                <div className="mt-2 border-t border-ink-soft/10 pt-1.5 text-[10px] text-ink-soft/70">
                  Resets daily at 12:00 midnight
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popover for own mood picker */}
      {isOwn && open && (
        <div
          role="dialog"
          aria-label="Set your emotional weather"
          className={[
            "absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-ink-soft/20 bg-page p-3.5 shadow-2xl sm:p-4 backdrop-blur-md",
            "animate-in fade-in slide-in-from-top-2 duration-200",
          ].join(" ")}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Emotional weather</p>
              <p className="text-[13px] text-ink font-medium">How's your atmosphere today?</p>
            </div>
            {myMood && (
              <span className="text-xs text-accent font-semibold flex items-center gap-1">
                {myMood.icon} {myMood.label}
              </span>
            )}
          </div>

          {/* 4 Icon grid */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {MOOD_OPTIONS.map((m) => {
              const isSel = selected?.icon === m.icon;
              return (
                <button
                  key={m.icon}
                  type="button"
                  onClick={() => setSelected(isSel ? null : m)}
                  aria-pressed={isSel}
                  aria-label={m.label}
                  className={[
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-2xl transition-all cursor-pointer sm:p-2.5",
                    isSel
                      ? "border-accent bg-accent/15 ring-2 ring-accent ring-offset-2 ring-offset-page scale-105"
                      : "border-ink-soft/20 bg-surface hover:border-accent/40 hover:bg-surface/80",
                  ].join(" ")}
                >
                  <span className="leading-none">{m.icon}</span>
                  <span className={`text-[10px] font-medium ${isSel ? "text-accent font-semibold" : "text-ink-soft"}`}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Note input */}
          {selected && (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              maxLength={120}
              autoFocus
              className="mt-3 w-full rounded-2xl border border-ink-soft/20 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/60 animate-in fade-in duration-150"
            />
          )}

          {/* Micro-footnote about midnight reset */}
          <p className="mt-2.5 text-[10px] text-ink-soft/70 text-center">
            Resets automatically at 12:00 midnight
          </p>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!selected || saving}
              className={[
                "flex min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all cursor-pointer",
                selected && !saving
                  ? "bg-accent text-on-accent hover:bg-accent/90"
                  : "bg-ink-soft/10 text-ink-soft cursor-not-allowed",
              ].join(" ")}
            >
              {saving ? (
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-on-accent border-t-transparent" />
              ) : null}
              {saving ? "Saving…" : "Set mood"}
            </button>
            {myMood && (
              <button
                type="button"
                onClick={() => void handleClear()}
                disabled={saving}
                className="rounded-full px-3 py-2 text-xs text-ink-soft hover:bg-surface hover:text-ink cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-2 text-xs text-ink-soft hover:bg-surface hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Popover for partner's mood status card (both when set and when empty) */}
      {!isOwn && open && (
        <div
          role="dialog"
          aria-label={`${partnerName}'s emotional weather`}
          className={[
            "absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-[min(16rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-ink-soft/20 bg-page p-3.5 shadow-2xl sm:p-4 backdrop-blur-md",
            "animate-in fade-in slide-in-from-top-2 duration-200",
          ].join(" ")}
        >
          {mood ? (
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 border border-accent/30 text-2xl">
                  {mood.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">{partnerName}'s weather</p>
                  <p className="text-base font-semibold text-ink leading-tight">{mood.label}</p>
                </div>
              </div>
              {mood.note && (
                <p className="mt-3 break-words rounded-2xl border border-ink-soft/15 bg-surface p-3 text-xs leading-relaxed text-ink font-hand text-[15px]">
                  "{mood.note}"
                </p>
              )}
              <p className="mt-3 text-[11px] text-ink-soft text-center opacity-70">
                Visible only to you two • Resets at midnight
              </p>
            </div>
          ) : (
            <div className="text-center py-1">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-surface border border-ink-soft/20 text-2xl mb-2">
                ☁️
              </div>
              <p className="text-sm font-semibold text-ink">{partnerName}'s weather</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                {partnerName} hasn't checked in with their atmosphere today yet. When they share it, you'll see it here.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-ink-soft/20 bg-surface px-4 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
