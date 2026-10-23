import * as React from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import {
  MOOD_OPTIONS,
  getMyMood,
  getPartnerMood,
  setMyMood,
  clearMyMood,
  type MoodEntry,
  REMOTE_EXTENSIONS_ENABLED,
} from "./api";
import { getMyCouple } from "@/features/couples/api";
import { supabaseForSession } from "@/lib/supabase";

type MoodContextValue = {
  myMood: MoodEntry | null;
  partnerMood: MoodEntry | null;
  partnerName: string;
  setPartnerName: (name: string) => void;
  saving: boolean;
  saveMood: (icon: string, label: string, note: string) => Promise<void>;
  clearMood: () => Promise<void>;
  refreshMoods: () => Promise<void>;
};

const MoodContext = React.createContext<MoodContextValue | null>(null);

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const sessionRef = React.useRef(session);
  React.useEffect(() => { sessionRef.current = session; }, [session]);

  const [myMood, setMyMood_] = React.useState<MoodEntry | null>(null);
  const [partnerMood, setPartnerMood] = React.useState<MoodEntry | null>(null);
  const [partnerName, setPartnerName] = React.useState("Partner");
  const [saving, setSaving] = React.useState(false);

  const refreshMoods = React.useCallback(async () => {
    try {
      const [mm, pm] = await Promise.all([
        getMyMood(sessionRef.current),
        getPartnerMood(sessionRef.current),
      ]);
      setMyMood_(mm);
      setPartnerMood(pm);
    } catch {
      // Mood load errors are non-blocking
    }
  }, []);

  // Load both moods on mount and on sign in
  React.useEffect(() => {
    void refreshMoods();
  }, [session, refreshMoods]);

  React.useEffect(() => {
    if (!session || !REMOTE_EXTENSIONS_ENABLED) return;
    const authSession = session;
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof supabaseForSession>["channel"]> | undefined;

    async function subscribeToMoodChanges() {
      try {
        const coupleData = await getMyCouple(authSession);
        if (cancelled || !coupleData.couple || !coupleData.partner) return;
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
        // Polling below remains the fallback when Realtime is unavailable.
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
      setMyMood_({
        id: `mood-${Date.now()}`,
        icon,
        label,
        note,
        private: false,
        created_at: new Date().toISOString(),
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
        partnerName,
        setPartnerName,
        saving,
        saveMood,
        clearMood,
        refreshMoods,
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
  const { myMood, partnerMood, partnerName: ctxPartnerName, saving, saveMood, clearMood } = useMood();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<{ icon: string; label: string } | null>(null);
  const [note, setNote] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  const isOwn = side === "left";
  const partnerName = propPartnerName ?? ctxPartnerName ?? "Partner";
  const mood = isOwn ? myMood : partnerMood;

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
  }, [open]);

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

  return (
    <div ref={ref} className="relative flex items-center">
      {/* The circular status bubble */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        title={
          mood
            ? `${isOwn ? "Your" : `${partnerName}'s`} emotional weather: ${mood.label}${mood.note ? ` — "${mood.note}"` : ""}`
            : isOwn
            ? "Set your emotional weather (+)"
            : `${partnerName} hasn't shared their weather yet`
        }
        aria-label={
          isOwn
            ? mood
              ? `Your mood: ${mood.label}. Click to update.`
              : "Set your emotional weather (+)"
            : `${partnerName}'s status: ${mood ? mood.label : "not set"}`
        }
        className={[
          "flex size-11 items-center justify-center rounded-full border text-lg transition-all select-none cursor-pointer sm:size-9",
          mood
            ? "border-accent/40 bg-accent/10 hover:border-accent hover:bg-accent/15"
            : isOwn
            ? "border-ink-soft/30 bg-surface text-ink hover:border-accent/60 hover:text-accent hover:bg-surface/80"
            : "border-ink-soft/20 bg-surface text-ink-soft hover:border-ink-soft/40",
          open && "border-accent bg-accent/20 ring-2 ring-accent/30",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {mood ? (
          <span className="leading-none text-xl">{mood.icon}</span>
        ) : isOwn ? (
          <Plus className="size-4 text-ink-soft transition-colors group-hover:text-accent" />
        ) : (
          <span className="text-sm text-ink-soft/50">–</span>
        )}
      </button>

      {/* Popover for own mood picker */}
      {isOwn && open && (
        <div
          role="dialog"
          aria-label="Set your emotional weather"
          className={[
            "absolute left-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-ink-soft/20 bg-page p-3 shadow-2xl sm:p-4",
            "animate-in fade-in slide-in-from-top-2 duration-200",
            side === "left" ? "sm:left-0" : "sm:right-0 sm:left-auto",
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

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!selected || saving}
              className={[
                "flex min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all cursor-pointer",
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
                className="rounded-full px-3 py-2 text-xs text-red-600 hover:bg-red-500/10 cursor-pointer"
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

      {/* Popover for partner's mood status card */}
      {!isOwn && open && mood && (
        <div
          role="dialog"
          aria-label={`${partnerName}'s emotional weather`}
          className={[
            "absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-[min(16rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-ink-soft/20 bg-page p-3 shadow-2xl sm:p-4",
            "animate-in fade-in slide-in-from-top-2 duration-200",
          ].join(" ")}
        >
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
            Visible only to you two
          </p>
        </div>
      )}
    </div>
  );
}
