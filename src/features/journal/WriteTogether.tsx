import { ConfirmStep, Notice } from "@/components/inline-prompts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DICTIONARY } from "@/content/dictionary";
import { useAutosave } from "@/hooks/use-autosave";
import { journalMessage, type JournalToday } from "./api";
import * as React from "react";
import { EntryPair } from "./EntryPair";
import {
  useJournalToday,
  usePassJournalPrompt,
  useSaveJournalDraft,
  useSubmitJournalEntry,
} from "./hooks";

const COPY = DICTIONARY.voice.journal;
const MAX_LENGTH = 5000;

export default function WriteTogether() {
  const today = useJournalToday();

  if (today.isLoading) return <p className="text-sm text-ink-soft">Finding today's prompt…</p>;
  if (today.isError) {
    return (
      <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
        {journalMessage(today.error)}
      </p>
    );
  }
  const data = today.data;
  if (!data) return <Notice text="The journal is paused for you both right now." />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-soft">Today's prompt</p>
        <p className="mt-3 font-hand text-xl leading-snug">{data.prompt}</p>
      </div>

      {data.status === "open" && <OpenPrompt key={data.instance_id} data={data} />}
      {data.status === "skipped" && <Notice text="This one was passed on. A new prompt arrives tomorrow." />}
      {data.status === "revealed" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">Both entries are in. Read them, then react if you like.</p>
          <EntryPair entries={data.entries} instanceId={data.instance_id} reactable />
        </div>
      )}
    </div>
  );
}

function partnerLine(name: string, state: JournalToday["partner_state"]) {
  if (state === "done") return `${name} has written their entry.`;
  if (state === "passed") return `${name} passed on this one.`;
  return `${name} hasn't written yet.`;
}

function OpenPrompt({ data }: { data: JournalToday }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft" aria-live="polite">
        {partnerLine(data.partner_name, data.partner_state)}
      </p>

      {data.my_state === "submitted" ? (
        <div className="space-y-3">
          <p className="rounded-2xl bg-page p-3 text-sm text-ink-soft">
            {COPY.entryLocked.replace("{partner}", data.partner_name)}
          </p>
          <p className="whitespace-pre-line rounded-2xl border border-ink-soft/20 bg-surface p-4 text-sm leading-relaxed">
            {data.my_body}
          </p>
        </div>
      ) : data.my_state === "passed" ? (
        <Notice text={`${COPY.passed} A new prompt arrives tomorrow.`} />
      ) : (
        <EntryEditor instanceId={data.instance_id} initialBody={data.my_body ?? ""} />
      )}
    </div>
  );
}

function EntryEditor({ instanceId, initialBody }: { instanceId: string; initialBody: string }) {
  const [text, setText] = React.useState(initialBody);
  const [step, setStep] = React.useState<"send" | "pass" | null>(null);
  const saveDraft = useSaveJournalDraft();
  const submit = useSubmitJournalEntry();
  const pass = usePassJournalPrompt();
  const autosave = useAutosave((value) => saveDraft.mutateAsync({ instanceId, body: value }));
  const busy = submit.isPending || pass.isPending;

  const update = (value: string) => {
    setText(value);
    autosave.queue(value);
  };

  const send = async () => {
    try {
      await autosave.flush();
      await submit.mutateAsync({ instanceId, body: text.trim() });
    } catch {
      // Shown below the editor
    }
  };

  const skip = async () => {
    try {
      await pass.mutateAsync({ instanceId });
    } catch {
      // Shown below the editor
    }
  };

  const status =
    autosave.state === "saving"
      ? "Saving…"
      : autosave.state === "error"
        ? "Couldn't save just now. We'll keep trying as you type."
        : text
          ? COPY.autosave
          : "";

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(event) => update(event.target.value)}
        onBlur={() => void autosave.flush()}
        maxLength={MAX_LENGTH}
        rows={10}
        placeholder="Write however it comes. Nobody sees it until you're both done."
        aria-label="Your entry"
        className="min-h-64 resize-y rounded-2xl bg-surface p-4 text-base leading-relaxed"
      />
      <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-ink-soft" aria-live="polite">
        <span>{status}</span>
        <span>{text.length}/{MAX_LENGTH}</span>
      </div>

      {step === "send" ? (
        <ConfirmStep
          message="Once it's sent, it's locked. It opens up when you're both done."
          confirmLabel="Send and lock"
          busy={busy}
          onConfirm={send}
          onCancel={() => setStep(null)}
        />
      ) : step === "pass" ? (
        <ConfirmStep
          message="Pass on today's prompt? Neither entry will be shown."
          confirmLabel="Yes, pass"
          busy={busy}
          onConfirm={skip}
          onCancel={() => setStep(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!text.trim() || busy}
            onClick={() => setStep("send")}
            className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
          >
            Send and lock
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setStep("pass")} className="rounded-full">
            {COPY.pass}
          </Button>
        </div>
      )}

      {(submit.isError || pass.isError) && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {journalMessage(submit.isError ? submit.error : pass.error)}
        </p>
      )}
    </div>
  );
}