import { useEffect, useState, useTransition } from "react";
import { Check, Sparkles, Zap } from "lucide-react";
import { getChallengeHistory, type ChallengeHistoryItem } from "@/features/today/api";
import { useAuth } from "@/auth/AuthProvider";
import { formatHistoryDateDetails } from "@/lib/format";

const categoryStyles: Record<string, { label: string; badge: string }> = {
  affection: { label: "Affection", badge: "text-pink-600 bg-pink-500/10 border-pink-500/20" },
  words: { label: "Words", badge: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  play: { label: "Play", badge: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  reflection: { label: "Reflection", badge: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  service: { label: "Service", badge: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
};

type HistoryFilter = "done" | "skipped";

export default function ChallengeHistory() {
  const { session } = useAuth();
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>("done");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadHistory = async () => {
    try {
      setLoading(true);
      const items = await getChallengeHistory(session, 50, 0);

      // Only completed ('saved') or 'skipped' items belong in history (never raw 'shown' events)
      const validItems = (items ?? []).filter(
        (item) => item.action === "saved" || item.action === "skipped"
      );

      // Deduplicate by shown_on date, keeping the latest and preferring 'saved' if both exist
      const byDate = new Map<string, ChallengeHistoryItem>();
      for (const item of validItems) {
        const existing = byDate.get(item.shown_on);
        if (!existing) {
          byDate.set(item.shown_on, item);
        } else if (existing.action !== "saved" && item.action === "saved") {
          byDate.set(item.shown_on, item);
        }
      }

      const deduplicated = Array.from(byDate.values()).sort(
        (a, b) => new Date(b.shown_on).getTime() - new Date(a.shown_on).getTime()
      );

      setHistory(deduplicated);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [session]);

  const doneItems = history.filter((h) => h.action === "saved");
  const skippedItems = history.filter((h) => h.action === "skipped");
  const filtered = filter === "done" ? doneItems : skippedItems;

  return (
    <div className="w-full space-y-4">
      {/* Header and stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-accent" />
            <h2 className="text-lg font-semibold">Shared Challenges History</h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">
            {filter === "done"
              ? `${doneItems.length} ${doneItems.length === 1 ? "moment" : "moments"} completed together`
              : `${skippedItems.length} ${skippedItems.length === 1 ? "challenge" : "challenges"} skipped`}
          </p>
        </div>

        {/* Action Filters: Simple Done & Skipped */}
        <div className="flex items-center gap-1.5 rounded-full border border-ink-soft/20 bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => startTransition(() => setFilter("done"))}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              filter === "done" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            Done ({doneItems.length})
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => setFilter("skipped"))}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              filter === "skipped" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            Skipped ({skippedItems.length})
          </button>
        </div>
      </div>

      {/* List content */}
      {loading ? (
        <div className="flex h-36 items-center justify-center rounded-2xl border border-ink-soft/10 bg-surface text-sm text-ink-soft animate-pulse">
          Loading history…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-soft/20 bg-surface/50 p-8 text-center">
          {filter === "done" && <Sparkles className="mx-auto size-7 text-ink-soft/50 mb-2" />}
          <p className="text-sm font-medium">
            {filter === "done" ? "No completed challenges yet" : "No skipped challenges"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {filter === "done"
              ? "Complete daily challenges on the Today screen to build your shared memory."
              : "You haven't skipped any challenges."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isDone = item.action === "saved";
            const dateDetails = formatHistoryDateDetails(item.shown_on);
            const categoryMeta = categoryStyles[item.category] ?? {
              label: item.category,
              badge: "text-ink-soft bg-ink-soft/10 border-ink-soft/20",
            };

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                  isDone
                    ? "border-ink-soft/20 bg-surface hover:border-accent/40 shadow-sm"
                    : "border-ink-soft/15 bg-surface/50 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isDone && (
                      <span className="flex size-5 items-center justify-center rounded-full text-xs bg-emerald-500/15 text-emerald-600 font-bold">
                        <Check className="size-3" />
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs">
                      {dateDetails.relative && (
                        <>
                          <span className="font-semibold text-ink">{dateDetails.relative}</span>
                          <span className="text-ink-soft/40">•</span>
                        </>
                      )}
                      <span className="text-[11px] font-medium text-ink-soft">{dateDetails.fullDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${categoryMeta.badge}`}
                    >
                      {categoryMeta.label}
                    </span>
                    <span className="rounded-full border border-ink-soft/20 px-2 py-0.5 text-[10px] text-ink-soft">
                      {item.duration_label}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink">
                  {item.body}
                </p>

                {item.note && (
                  <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs leading-relaxed text-ink-soft">
                    <span className="font-semibold text-accent">Note: </span>
                    {item.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
