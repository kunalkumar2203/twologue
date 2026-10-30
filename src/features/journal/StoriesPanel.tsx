import * as React from "react";
import { Download } from "lucide-react";
import { Notice } from "@/components/inline-prompts";
import { Button } from "@/components/ui/button";
import { DICTIONARY } from "@/content/dictionary";
import { cn } from "@/lib/utils";
import StartStoryForm from "./StartStoryForm";
import StoryView from "./StoryView";
import { useStoryShelf } from "./hooks";
import { downloadText, kindLabel, slugify, storyToText } from "./journal-utils";
import { storyMessage, type Story } from "./stories-api";

export default function StoriesPanel() {
  const shelf = useStoryShelf();
  const [starting, setStarting] = React.useState(false);

  if (shelf.isLoading) return <p className="text-sm text-ink-soft">Opening your stories…</p>;
  if (shelf.isError) {
    return (
      <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
        {storyMessage(shelf.error)}
      </p>
    );
  }

  const data = shelf.data;
  if (!data) return <Notice text="Stories are paused for you both right now." />;

  return (
    <div className="space-y-8">
      {data.active ? (
        <StoryView key={data.active.id} story={data.active} partnerName={data.partner_name} />
      ) : !data.has_partner ? (
        <Notice text="Stories are written together. Invite your partner first, then start one." />
      ) : starting ? (
        <StartStoryForm partnerName={data.partner_name} onDone={() => setStarting(false)} />
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-soft/30 bg-surface p-6 text-center">
          <p className="font-medium">No story in progress</p>
          <p className="mt-1 text-sm text-ink-soft">{DICTIONARY.voice.story.empty}</p>
          <Button type="button" onClick={() => setStarting(true)} className="mt-4 rounded-full bg-accent text-on-accent hover:bg-accent/90">
            Start a story
          </Button>
        </div>
      )}

      {data.archive.length > 0 && <Archive stories={data.archive} />}
    </div>
  );
}

function Archive({ stories }: { stories: Story[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Finished stories</h2>
      {stories.map((story) => (
        <details key={story.id} className="rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-5">
          <summary className="cursor-pointer">
            <span className="font-semibold">{story.title}</span>
            <span className="ml-2 text-xs text-ink-soft">
              {kindLabel(story.kind)} · {story.paragraph_count} paragraphs
            </span>
          </summary>
          <div className="mt-4 space-y-3 border-t border-ink-soft/15 pt-4">
            {story.paragraphs.map((paragraph) => (
              <p
                key={paragraph.position}
                className={cn(
                  "whitespace-pre-line font-hand leading-relaxed text-ink",
                  paragraph.opening ? "text-lg font-semibold" : "text-base",
                )}
              >
                {paragraph.body}
              </p>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => downloadText(`${slugify(story.title)}.txt`, storyToText(story))}
            >
              <Download className="size-4" /> Download as text
            </Button>
          </div>
        </details>
      ))}
    </section>
  );
}