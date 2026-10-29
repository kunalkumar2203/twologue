import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DICTIONARY } from "@/content/dictionary";
import { capsuleMessage, type Capsule } from "./api";
import { useOpenTimeCapsule } from "./hooks";

const LINES = DICTIONARY.voice.capsule.unlockCeremony;
const LINE_DELAY_MS = 1100;

// The unlock moment: the lines appear one by one, then the letter. Opening is recorded once per person.
export function CapsuleCeremony({ capsule, onClose }: { capsule: Capsule | null; onClose: () => void }) {
  const opener = useOpenTimeCapsule();
  const { mutate, reset } = opener;
  const [step, setStep] = React.useState(0);
  const [letter, setLetter] = React.useState<string | null>(null);
  const capsuleId = capsule?.id;

  React.useEffect(() => {
    if (!capsuleId) return;
    setStep(0);
    setLetter(null);
    reset();
    mutate(capsuleId, { onSuccess: (text) => setLetter(text) });
  }, [capsuleId, mutate, reset]);

  React.useEffect(() => {
    if (!capsuleId || step >= LINES.length) return;
    const timer = window.setTimeout(() => setStep((n) => n + 1), LINE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [capsuleId, step]);

  const finished = step >= LINES.length && letter !== null;

  return (
    <Dialog open={Boolean(capsule)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{capsule?.title}</DialogTitle>
          <DialogDescription>
            {capsule?.audience === "joint" ? "Written for both of you" : `From ${capsule?.author_name ?? "your partner"}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 text-center">
          {LINES.slice(0, step).map((line) => (
            <p key={line} className="text-sm text-ink-soft motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
              {line}
            </p>
          ))}
        </div>

        {finished && (
          <div className="rounded-2xl border border-ink-soft/20 bg-page p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
            <p className="whitespace-pre-line font-hand text-xl leading-relaxed">{letter}</p>
          </div>
        )}

        {opener.isError && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {capsuleMessage(opener.error)}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}