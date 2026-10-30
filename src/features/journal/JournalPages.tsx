import * as React from "react";
import { Notice } from "@/components/inline-prompts";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/format";
import { journalMessage, type RevealedKind } from "./api";
import { EntryPair } from "./EntryPair";
import { useRevealedPrompts } from "./hooks";

const PAGE_SIZE = 10;

// A list of revealed prompts, newest first. Used for both "Our answers" and "Our pages".
export default function JournalPages({ kind, emptyText }: { kind: RevealedKind; emptyText: string }) {
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const pages = useRevealedPrompts(kind, limit);

  if (pages.isLoading) return <p className="text-sm text-ink-soft">Gathering your pages…</p>;
  if (pages.isError) {
    return (
      <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
        {journalMessage(pages.error)}
      </p>
    );
  }

  const list = pages.data ?? [];
  if (list.length === 0) return <Notice text={emptyText} />;

  return (
    <div className="space-y-8">
      {list.map((page) => (
        <article key={page.instance_id} className="space-y-3">
          <div>
            <p className="text-sm text-ink-soft">
              {formatDay(page.for_date, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p className="mt-1 font-hand text-lg leading-snug">{page.prompt}</p>
          </div>
          <EntryPair entries={page.entries} instanceId={page.instance_id} />
        </article>
      ))}

      {list.length === limit && (
        <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Show earlier pages
        </Button>
      )}
    </div>
  );
}
