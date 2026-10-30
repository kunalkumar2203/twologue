import * as React from "react";
import { Check, MessageCircleHeart, Sparkles } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { formatHistoryDateDetails } from "@/lib/format";
import { EntryPair } from "./EntryPair";
import { getDailyQuestionHistory, type DailyQuestionHistoryItem } from "./api";

const PAGE_SIZE = 10;

type FilterType = "done" | "skipped";

export default function DailyAnswersHistory() {
  const { session } = useAuth();
  const [history, setHistory] = React.useState<DailyQuestionHistoryItem[]>([]);
  const [filter, setFilter] = React.useState<FilterType>("done");
  const [loading, setLoading] = React.useState(true);
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [, startTransition] = React.useTransition();

  const loadHistory = React.useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const items = await getDailyQuestionHistory(session, 100, 0);
      setHistory(items);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [session]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const doneItems = history.filter((item) => item.status === "revealed");
  const skippedItems = history.filter((item) => item.status === "skipped");
  const filtered = filter === "done" ? doneItems : skippedItems;
  const visibleItems = filtered.slice(0, limit);

  return (
    <div className="w-full space-y-4">
      {/* Header and stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <MessageCircleHeart className="size-5 text-accent" /> Our answers
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {filter === "done"
              ? `${doneItems.length} ${doneItems.length === 1 ? "answer" : "answers"} revealed together`
              : `${skippedItems.length} ${skippedItems.length === 1 ? "question" : "questions"} skipped`}
          </p>
        </div>

        {/* Action Filters: Simple Done & Skipped */}
        <div className="flex items-center gap-1.5 rounded-full border border-ink-soft/20 bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => startTransition(() => { setFilter("done"); setLimit(PAGE_SIZE); })}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              filter === "done" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            Done ({doneItems.length})
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => { setFilter("skipped"); setLimit(PAGE_SIZE); })}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              filter === "skipped" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink"
            }`}
          >
            Skipped ({skippedItems.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-36 items-center justify-center rounded-2xl border border-ink-soft/10 bg-surface text-sm text-ink-soft animate-pulse">
          Gathering your answers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-soft/20 bg-surface/50 p-8 text-center">
          {filter === "done" && <Sparkles className="mx-auto size-7 text-ink-soft/50 mb-2" />}
          <p className="text-sm font-medium">
            {filter === "done" ? "No revealed answers yet" : "No skipped questions"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {filter === "done"
              ? "Your answers gather here once you've both answered and revealed a daily question."
              : "You haven't skipped any daily questions."}
          </p>
        </div>
      ) : filter === "done" ? (
        <div className="space-y-8">
          {visibleItems.map((page) => {
            const dateDetails = formatHistoryDateDetails(page.for_date);
            return (
              <article key={page.instance_id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-2xs">
                    <Check className="size-3 stroke-[2.5]" />
                  </span>
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

                <p className="font-hand text-lg leading-snug">{page.prompt}</p>

                <EntryPair entries={page.entries} instanceId={page.instance_id} />
              </article>
            );
          })}

          {filtered.length > limit && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
            >
              Show earlier answers
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((page) => {
            const dateDetails = formatHistoryDateDetails(page.for_date);
            return (
              <article
                key={page.instance_id}
                className="rounded-2xl border border-ink-soft/15 bg-surface/50 p-4 sm:p-5 opacity-80"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    {dateDetails.relative && (
                      <>
                        <span className="font-semibold text-ink">{dateDetails.relative}</span>
                        <span className="text-ink-soft/40">•</span>
                      </>
                    )}
                    <span className="text-[11px] font-medium text-ink-soft">{dateDetails.fullDate}</span>
                  </div>

                  <span className="inline-flex items-center rounded-lg border border-ink-soft/20 bg-page/80 px-2 py-0.5 text-xs font-medium text-ink-soft shadow-2xs">
                    Skipped
                  </span>
                </div>

                <p className="mt-2.5 font-hand text-lg leading-snug text-ink/90">
                  {page.prompt}
                </p>

                <p className="mt-1 text-xs text-ink-soft/70 italic">
                  This question was passed or skipped.
                </p>
              </article>
            );
          })}

          {filtered.length > limit && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
            >
              Show earlier skipped questions
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
