import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DICTIONARY } from "@/content/dictionary";
import { cn } from "@/lib/utils";
import { journalMessage, type JournalEntry } from "./api";
import { useReactToEntry } from "./hooks";

const EMOJIS = DICTIONARY.appreciation.emojis;

// Both entries side by side (stacked on phones). Reacting is only offered once revealed.
export function EntryPair({
  entries,
  instanceId,
  reactable = false,
}: {
  entries: JournalEntry[];
  instanceId: string;
  reactable?: boolean;
}) {
  const partnerName = entries.find((entry) => !entry.is_me)?.name ?? "Your partner";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map((entry) => (
        <article key={entry.response_id} className="flex flex-col rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold">{entry.name}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{entry.body}</p>
          <div className="mt-4 space-y-2 border-t border-ink-soft/15 pt-3">
            {reactable && !entry.is_me ? (
              <ReactionForm instanceId={instanceId} entry={entry} />
            ) : (
              <ReactionSummary entry={entry} partnerName={partnerName} />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ReactionSummary({ entry, partnerName }: { entry: JournalEntry; partnerName: string }) {
  if (!entry.reaction && !entry.reply) return null;
  const who = entry.is_me ? partnerName : "You";
  return (
    <div className="text-sm">
      {entry.reaction && <p className="text-ink-soft">{who} reacted {entry.reaction}</p>}
      {entry.reply && <p className="mt-1 font-hand text-base leading-snug">“{entry.reply}”</p>}
    </div>
  );
}

function ReactionForm({ instanceId, entry }: { instanceId: string; entry: JournalEntry }) {
  const react = useReactToEntry();
  const [emoji, setEmoji] = React.useState<string | null>(entry.reaction);
  const [reply, setReply] = React.useState(entry.reply ?? "");
  const canSave = Boolean(emoji || reply.trim());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="React to this entry">
        {EMOJIS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={emoji === item}
            onClick={() => setEmoji(emoji === item ? null : item)}
            className={cn(
              "size-9 rounded-full border text-lg transition-colors hover:border-accent/60",
              emoji === item && "border-accent bg-accent/15",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <Textarea
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        maxLength={280}
        rows={2}
        placeholder="A short reply, if you'd like"
        aria-label="Reply to this entry"
        className="resize-none rounded-xl text-sm"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!canSave || react.isPending}
          onClick={() => react.mutate({ instanceId, emoji: emoji ?? "💬", reply: reply.trim() || null })}
          className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
        >
          {entry.reaction || entry.reply ? "Update" : "Save"}
        </Button>
        {react.isError && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-300">{journalMessage(react.error)}</p>
        )}
        {react.isSuccess && !react.isPending && <p role="status" className="text-xs text-ink-soft">Saved</p>}
      </div>
    </div>
  );
}