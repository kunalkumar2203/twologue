import { Button } from "@/components/ui/button";

export function Notice({ text }: { text: string }) {
  return <p className="rounded-2xl border border-ink-soft/20 bg-surface p-4 text-sm text-ink-soft">{text}</p>;
}

// A two-step action: the button first, then this calm confirmation
export function ConfirmStep({
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => unknown;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ink-soft/20 bg-page p-4">
      <p className="text-sm leading-6">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void onConfirm()} className="rounded-full bg-accent text-on-accent hover:bg-accent/90">
          {confirmLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel} className="rounded-full">
          Not yet
        </Button>
      </div>
    </div>
  );
}