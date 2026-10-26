import { useEffect, useState, useTransition } from "react";
import { Check, Sparkles, Zap } from "lucide-react";
import { getChallengeHistory, type ChallengeHistoryItem } from "@/features/today/api";
import { useAuth } from "@/auth/AuthProvider";

const categoryStyles: Record<string, { label: string; badge: string }> = {
  affection: { label: "Affection", badge: "text-pink-600 bg-pink-500/10 border-pink-500/20" },
  words: { label: "Words", badge: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  play: { label: "Play", badge: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  reflection: { label: "Reflection", badge: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  service: { label: "Service", badge: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
};

function formatHistoryDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const itemDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return itemDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffDays > 300 ? "numeric" : undefined });
}

export default function ChallengeHistory() {
  const { session } = useAuth();
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "done" | "skipped">("all");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadHistory = async () => {
    try {
      setLoading(true);
      const items = await getChallengeHistory(session, 50, 0);
      setHistory(items);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [session]);

  const filtered = history.filter((item) => {
    if (filter === "done") return item.action === "saved";
    if (filter === "skipped") return item.action === "skipped";
    return true;
  });

  const doneCount = history.filter((h) => h.action === "saved").length;

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
            {doneCount} {doneCount === 1 ? "moment" : "moments"} completed together
          </p>
        </div>

        {/* Action Filters */}
        <div className="flex items-center gap-1.5 rounded-full border border-ink-soft/20 bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => startTransition(() => setFilter("all"))}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${filter === "all" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
              }`}
          >
            All ({history.length})
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => setFilter("done"))}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${filter === "done" ? "bg-emerald-600 text-white" : "text-ink-soft hover:text-ink"
              }`}
          >
            Done ({doneCount})
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => setFilter("skipped"))}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${filter === "skipped" ? "bg-ink-soft/40 text-ink" : "text-ink-soft hover:text-ink"
              }`}
          >
            Skipped ({history.length - doneCount})
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
          <Sparkles className="mx-auto size-7 text-ink-soft/50" />
          <p className="mt-2 text-sm font-medium">No challenge records yet</p>
          <p className="mt-1 text-xs text-ink-soft">
            {filter === "all"
              ? "Complete or check in on daily challenges on the Today screen to build your shared memory."
              : `No ${filter} challenges recorded yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isDone = item.action === "saved";
            const categoryMeta = categoryStyles[item.category] ?? {
              label: item.category,
              badge: "text-ink-soft bg-ink-soft/10 border-ink-soft/20",
            };

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${isDone
                    ? "border-ink-soft/20 bg-surface hover:border-accent/40 shadow-sm"
                    : "border-ink-soft/10 bg-surface/40 opacity-70"
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex size-5 items-center justify-center rounded-full text-xs ${isDone ? "bg-emerald-500/15 text-emerald-600 font-bold" : "bg-ink-soft/10 text-ink-soft"
                        }`}
                    >
                      {isDone ? <Check className="size-3" /> : "–"}
                    </span>
                    <span className="text-xs font-semibold text-ink-soft">
                      {formatHistoryDate(item.shown_on)}
                    </span>
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
