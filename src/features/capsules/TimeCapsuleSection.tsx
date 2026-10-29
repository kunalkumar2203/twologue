import * as React from "react";
import { Hourglass, Lock, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { Notice } from "@/components/inline-prompts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DICTIONARY } from "@/content/dictionary";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { capsuleMessage, type Capsule } from "./api";
import { CapsuleCeremony } from "./CapsuleCeremony";
import { CapsuleComposer } from "./CapsuleComposer";
import { useDeleteTimeCapsule, useTimeCapsules } from "./hooks";

export default function TimeCapsuleSection() {
  const shelf = useTimeCapsules();
  const deleteCapsule = useDeleteTimeCapsule();
  const [composing, setComposing] = React.useState(false);
  const [editingCapsule, setEditingCapsule] = React.useState<Capsule | null>(null);
  const [deletingCapsule, setDeletingCapsule] = React.useState<Capsule | null>(null);
  const [opening, setOpening] = React.useState<Capsule | null>(null);
  const data = shelf.data;

  const ready = data?.capsules.filter((capsule) => capsule.ready_to_open) ?? [];
  const sealed = data?.capsules.filter((capsule) => capsule.days_left > 0) ?? [];
  const opened = data?.capsules.filter((capsule) => capsule.days_left === 0 && !capsule.ready_to_open) ?? [];

  const handleConfirmDelete = async () => {
    if (!deletingCapsule) return;
    try {
      await deleteCapsule.mutateAsync(deletingCapsule.id);
      setDeletingCapsule(null);
    } catch {
      // Handled by deleteCapsule error display
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Hourglass className="size-5 text-accent" /> Time capsules
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Seal a note today. It opens on a day you choose.</p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!data}
          onClick={() => {
            setEditingCapsule(null);
            setComposing(true);
          }}
          className="shrink-0 rounded-full bg-accent text-on-accent hover:bg-accent/90"
        >
          <Plus className="size-4" /> Seal one
        </Button>
      </div>

      {shelf.isLoading && <p className="text-sm text-ink-soft">Loading capsules…</p>}
      {shelf.isError && (
        <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          {capsuleMessage(shelf.error)}
        </p>
      )}
      {deleteCapsule.isError && (
        <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          {capsuleMessage(deleteCapsule.error)}
        </p>
      )}
      {shelf.isSuccess && !data && <Notice text="Time capsules are paused for you both right now." />}
      {data && data.capsules.length === 0 && <Notice text={DICTIONARY.voice.capsule.empty} />}

      {ready.length > 0 && (
        <Group title="Ready to open">
          {ready.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onOpen={() => setOpening(capsule)}
              onEdit={() => setEditingCapsule(capsule)}
              onDelete={() => setDeletingCapsule(capsule)}
            />
          ))}
        </Group>
      )}
      {sealed.length > 0 && (
        <Group title="Sealed">
          {sealed.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onEdit={() => setEditingCapsule(capsule)}
              onDelete={() => setDeletingCapsule(capsule)}
            />
          ))}
        </Group>
      )}
      {opened.length > 0 && (
        <Group title="Opened">
          {opened.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onEdit={() => setEditingCapsule(capsule)}
              onDelete={() => setDeletingCapsule(capsule)}
            />
          ))}
        </Group>
      )}

      {data && (
        <CapsuleComposer
          open={composing || Boolean(editingCapsule)}
          onOpenChange={(next) => {
            if (!next) {
              setComposing(false);
              setEditingCapsule(null);
            }
          }}
          shelf={data}
          initialCapsule={editingCapsule}
        />
      )}
      <CapsuleCeremony capsule={opening} onClose={() => setOpening(null)} />

      <AlertDialog open={Boolean(deletingCapsule)} onOpenChange={(open) => !open && setDeletingCapsule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time capsule?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingCapsule?.title}" will be permanently removed for both of you. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              disabled={deleteCapsule.isPending}
              className="rounded-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {deleteCapsule.isPending ? "Deleting…" : "Delete capsule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      {children}
    </div>
  );
}

function CapsuleCard({
  capsule,
  onOpen,
  onEdit,
  onDelete,
}: {
  capsule: Capsule;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const sealed = capsule.days_left > 0;
  const audience =
    capsule.audience === "joint"
      ? "Together"
      : capsule.is_mine
        ? `A letter to ${capsule.recipient_name}`
        : `A letter from ${capsule.author_name}`;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        capsule.ready_to_open ? "border-accent/50 bg-accent/10" : "border-ink-soft/20 bg-surface",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-page text-accent">
          {sealed ? <Lock className="size-4" /> : <Mail className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{capsule.title}</p>
              <p className="text-xs text-ink-soft">
                {audience} · {formatDay(capsule.unlock_on)}
              </p>
            </div>
            {capsule.is_mine && (
              <div className="flex shrink-0 items-center gap-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Edit ${capsule.title}`}
                    title="Edit capsule"
                    className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-page hover:text-ink cursor-pointer"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    aria-label={`Delete ${capsule.title}`}
                    title="Delete capsule"
                    className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {sealed && (
            <p className="mt-2 text-sm text-ink-soft">
              {capsule.days_left === 1 ? "Opens tomorrow." : `Opens in ${capsule.days_left} days.`} Sealed on{" "}
              {formatDay(capsule.sealed_on)}.
            </p>
          )}

          {capsule.ready_to_open && onOpen && (
            <Button type="button" size="sm" onClick={onOpen} className="mt-3 rounded-full bg-accent text-on-accent hover:bg-accent/90">
              {capsule.audience === "joint" ? "Open together" : "Open your letter"}
            </Button>
          )}

          {!sealed && capsule.body && (
            <p className="mt-3 whitespace-pre-line font-hand text-lg leading-relaxed">{capsule.body}</p>
          )}
          {!sealed && !capsule.body && !capsule.ready_to_open && (
            <p className="mt-2 text-sm text-ink-soft">Delivered to {capsule.recipient_name}. It's theirs to open now.</p>
          )}
        </div>
      </div>
    </article>
  );
}