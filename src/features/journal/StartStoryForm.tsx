import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStartStory, useStoryStarters } from "./hooks";
import { storyMessage, type StoryKind, type StoryStarter } from "./stories-api";

const KINDS: { value: StoryKind; label: string; hint: string }[] = [
  { value: "fiction", label: "Fiction", hint: "Invent a world together" },
  { value: "our_future", label: "Our future", hint: "Imagine the life ahead" },
];

export default function StartStoryForm({ partnerName, onDone }: { partnerName: string; onDone: () => void }) {
  const starters = useStoryStarters();
  const start = useStartStory();
  const [kind, setKind] = React.useState<StoryKind>("fiction");
  const [starterId, setStarterId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [opening, setOpening] = React.useState("");

  const options = (starters.data ?? []).filter((item) => (item.options.kind ?? "fiction") === kind);
  const canStart = title.trim().length > 0 && opening.trim().length > 0 && !start.isPending;

  const chooseKind = (next: StoryKind) => {
    setKind(next);
    setStarterId(null);
    setOpening("");
  };

  const chooseStarter = (item: StoryStarter) => {
    setStarterId(item.id);
    setOpening(item.body);
  };

  const begin = async () => {
    try {
      await start.mutateAsync({ title: title.trim(), kind, opening: opening.trim(), starterId });
      onDone();
    } catch {
      // Shown below the form
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Start a story with {partnerName}</h2>
        <p className="mt-1 text-sm text-ink-soft">Take turns, one paragraph at a time. Nobody has to hurry.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of story">
        {KINDS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={kind === item.value}
            onClick={() => chooseKind(item.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              kind === item.value ? "border-accent bg-accent text-on-accent" : "border-ink-soft/20 text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
            <span className="ml-2 hidden text-xs opacity-80 sm:inline">{item.hint}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Start from an idea</p>
        {starters.isLoading ? (
          <p className="text-sm text-ink-soft">Loading ideas…</p>
        ) : (
          <div className="grid gap-2">
            {options.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={starterId === item.id}
                onClick={() => chooseStarter(item)}
                className={cn(
                  "rounded-xl border bg-page p-3 text-left font-hand text-base leading-snug transition-colors hover:border-accent/60",
                  starterId === item.id ? "border-accent" : "border-ink-soft/20",
                )}
              >
                {item.body}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setStarterId(null);
                setOpening("");
              }}
              className="rounded-xl border border-dashed border-ink-soft/30 p-3 text-left text-sm text-ink-soft hover:text-ink"
            >
              Start from a blank line
            </button>
          </div>
        )}
      </div>

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={80}
        placeholder="Give it a name"
        aria-label="Story title"
        className="h-11 rounded-full"
      />
      <Textarea
        value={opening}
        onChange={(event) => setOpening(event.target.value)}
        maxLength={1500}
        rows={4}
        placeholder="The first line. Edit an idea, or write your own."
        aria-label="Opening line"
        className="rounded-2xl text-base"
      />
      <p className="text-xs text-ink-soft">{partnerName} writes the first paragraph after this.</p>

      {start.isError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{storyMessage(start.error)}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="rounded-full">Cancel</Button>
        <Button
          type="button"
          disabled={!canStart}
          onClick={() => void begin()}
          className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
        >
          Start story
        </Button>
      </div>
    </section>
  );
}