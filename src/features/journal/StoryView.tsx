import * as React from "react";
import { ConfirmStep } from "@/components/inline-prompts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";
import { useFinishStory, useSaveStoryDraft, useSubmitStoryParagraph } from "./hooks";
import { kindLabel, timeLeft } from "./journal-utils";
import { storyMessage, type Story } from "./stories-api";

const MAX_LENGTH = 1500;

export default function StoryView({ story, partnerName }: { story: Story; partnerName: string }) {
  const myTurn = story.turn === "me";
  const [draft, setDraft] = React.useState(story.my_draft ?? "");
  const [step, setStep] = React.useState<"send" | "finish" | null>(null);
  const saveDraft = useSaveStoryDraft();
  const submit = useSubmitStoryParagraph();
  const finish = useFinishStory();
  const autosave = useAutosave((value) => saveDraft.mutateAsync({ storyId: story.id, body: value }));
  const busy = submit.isPending || finish.isPending;
  const due = timeLeft(story.turn_due_at);

  const update = (value: string) => {
    setDraft(value);
    autosave.queue(value);
  };

  const send = async () => {
    try {
      await autosave.flush();
      await submit.mutateAsync({ storyId: story.id, body: draft.trim() });
      setDraft("");
      setStep(null);
    } catch {
      // Shown below the composer
    }
  };

  const end = async () => {
    try {
      await finish.mutateAsync({ storyId: story.id });
    } catch {
      // Shown below the composer
    }
  };

  const status =
    autosave.state === "saving"
      ? "Saving…"
      : autosave.state === "error"
        ? "Couldn't save your draft just now."
        : draft
          ? "Drafts stay private until you send them."
          : "";

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{kindLabel(story.kind)}</p>
          <h2 className="mt-1 text-2xl font-semibold">{story.title}</h2>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-block rounded-full px-3 py-1 text-xs font-medium",
              myTurn ? "bg-accent text-on-accent" : "border border-ink-soft/25 text-ink-soft",
            )}
          >
            {myTurn ? "Your turn" : `${partnerName}'s turn`}
          </span>
          {due && <p className="mt-1.5 text-xs text-ink-soft">{due}</p>}
        </div>
      </header>

      <ol className="space-y-3">
        {story.paragraphs.map((paragraph) => (
          <li
            key={paragraph.position}
            className={cn(
              "rounded-2xl border p-4",
              paragraph.is_me ? "border-ink-soft/20 bg-surface" : "border-ink-soft/20 bg-page",
            )}
          >
            {paragraph.name && <p className="mb-1 text-xs font-medium text-ink-soft">{paragraph.name}</p>}
            <p className={cn("whitespace-pre-line leading-relaxed", paragraph.opening ? "font-hand text-lg" : "text-sm")}>
              {paragraph.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="space-y-3">
        <p className="text-sm font-medium">{myTurn ? "Your paragraph" : "Draft ahead, if you like"}</p>
        <Textarea
          value={draft}
          onChange={(event) => update(event.target.value)}
          onBlur={() => void autosave.flush()}
          maxLength={MAX_LENGTH}
          rows={6}
          placeholder={myTurn ? "Pick up where it left off…" : "Your draft stays private until it's your turn."}
          aria-label="Your paragraph"
          className="rounded-2xl bg-surface p-4 text-base leading-relaxed"
        />
        <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-ink-soft" aria-live="polite">
          <span>{status}</span>
          <span>{draft.length}/{MAX_LENGTH}</span>
        </div>

        {step === "send" ? (
          <ConfirmStep
            message={`This goes to ${partnerName} and can't be changed afterwards.`}
            confirmLabel="Send paragraph"
            busy={busy}
            onConfirm={send}
            onCancel={() => setStep(null)}
          />
        ) : (
          <Button
            type="button"
            disabled={!myTurn || !draft.trim() || busy}
            onClick={() => setStep("send")}
            className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
          >
            Send paragraph
          </Button>
        )}
        {!myTurn && <p className="text-xs text-ink-soft">You can send once it's your turn.</p>}
      </div>

      {step === "finish" ? (
        <ConfirmStep
          message="Finishing moves the story to your archive. Unsent drafts are discarded."
          confirmLabel="Finish story"
          busy={busy}
          onConfirm={end}
          onCancel={() => setStep(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setStep("finish")}
          className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Finish and archive this story
        </button>
      )}

      {(submit.isError || finish.isError) && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {storyMessage(submit.isError ? submit.error : finish.error)}
        </p>
      )}
    </section>
  );
}