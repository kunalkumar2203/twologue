import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CAPSULE_OCCASIONS } from "@/content/dictionary";
import { cn } from "@/lib/utils";
import { capsuleMessage, type Audience, type Capsule, type CapsuleShelf, type Occasion } from "./api";
import { useCreateTimeCapsule, useSetAnniversary, useUpdateTimeCapsule } from "./hooks";

// Dictionary ids use dashes; the database uses underscores
const OCCASIONS = CAPSULE_OCCASIONS.map((item) => ({
  value: item.id.replace(/-/g, "_") as Occasion,
  label: item.label,
}));

export function CapsuleComposer({
  open,
  onOpenChange,
  shelf,
  initialCapsule = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shelf: CapsuleShelf;
  initialCapsule?: Capsule | null;
}) {
  const create = useCreateTimeCapsule();
  const update = useUpdateTimeCapsule();
  const saveAnniversary = useSetAnniversary();
  const isEditing = Boolean(initialCapsule);

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [audience, setAudience] = React.useState<Audience>("joint");
  const [occasion, setOccasion] = React.useState<Occasion>("six_months");
  const [customDate, setCustomDate] = React.useState("");
  const [anniversary, setAnniversary] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (initialCapsule) {
        setTitle(initialCapsule.title ?? "");
        setBody(initialCapsule.body ?? "");
        setAudience(initialCapsule.audience);
        setOccasion(initialCapsule.occasion);
        setCustomDate(initialCapsule.occasion === "custom" ? initialCapsule.unlock_on : "");
      } else {
        setTitle("");
        setBody("");
        setAudience("joint");
        setOccasion("six_months");
        setCustomDate("");
      }
      setError("");
    }
  }, [open, initialCapsule]);

  const needsAnniversary = occasion === "anniversary" && !shelf.anniversary_date;
  const isPending = create.isPending || update.isPending;
  const canSave =
    Boolean(title.trim() && body.trim()) &&
    (occasion !== "custom" || Boolean(customDate)) &&
    !needsAnniversary &&
    !isPending;

  // Earliest custom date is today in the couple's own calendar
  const minDate = shelf.today;

  const save = async () => {
    setError("");
    try {
      if (initialCapsule) {
        await update.mutateAsync({
          id: initialCapsule.id,
          title: title.trim(),
          body: body.trim(),
          audience,
          occasion,
          customDate: occasion === "custom" ? customDate : null,
        });
      } else {
        await create.mutateAsync({
          title: title.trim(),
          body: body.trim(),
          audience,
          occasion,
          customDate: occasion === "custom" ? customDate : null,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(capsuleMessage(err));
    }
  };

  const saveDate = async () => {
    setError("");
    try {
      await saveAnniversary.mutateAsync({ coupleId: shelf.couple_id, date: anniversary });
      setAnniversary("");
    } catch (err) {
      setError(capsuleMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg bg-surface border-ink-soft/20 text-ink">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-ink">
            {isEditing ? "Edit time capsule" : "Seal a time capsule"}
          </DialogTitle>
          <DialogDescription className="text-ink-soft">
            {isEditing
              ? "Update your sealed message and settings."
              : "Write it now. It stays sealed until the day you choose."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Who is it for?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Who is it for">
              <ChoiceButton active={audience === "joint"} onClick={() => setAudience("joint")}>
                Both of us
              </ChoiceButton>
              <ChoiceButton
                active={audience === "letter"}
                disabled={!shelf.has_partner}
                onClick={() => setAudience("letter")}
              >
                A letter to {shelf.partner_name}
              </ChoiceButton>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Opens</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="When it opens">
              {OCCASIONS.map((item) => (
                <ChoiceButton key={item.value} active={occasion === item.value} onClick={() => setOccasion(item.value)}>
                  {item.label}
                </ChoiceButton>
              ))}
            </div>
            {occasion === "custom" && (
              <Input
                type="date"
                min={minDate}
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
                aria-label="Unlock date"
                className="h-11 rounded-full border border-ink-soft/20 bg-page/60 px-4 text-ink placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
              />
            )}
            {needsAnniversary && (
              <div className="rounded-2xl border border-ink-soft/20 bg-page/60 p-4 text-sm">
                <p className="text-ink-soft">Add your anniversary date to use this option.</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    type="date"
                    value={anniversary}
                    onChange={(event) => setAnniversary(event.target.value)}
                    aria-label="Anniversary date"
                    className="h-10 rounded-full border border-ink-soft/20 bg-surface px-4 text-ink placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!anniversary || saveAnniversary.isPending}
                    onClick={() => void saveDate()}
                    className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            placeholder="Give it a title"
            aria-label="Title"
            className="h-11 rounded-full border border-ink-soft/20 bg-page/60 px-4 text-ink placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
          />

          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            rows={7}
            placeholder="Pen down your special message... write your heart out"
            aria-label="Your letter"
            className="rounded-2xl border border-ink-soft/20 bg-page/60 p-4 text-base leading-relaxed text-ink placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
          />

          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-ink-soft hover:bg-page/60 hover:text-ink"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => void save()}
              className="rounded-full bg-accent text-on-accent hover:bg-accent/90 disabled:opacity-50"
            >
              {isEditing
                ? update.isPending
                  ? "Saving…"
                  : "Save changes"
                : create.isPending
                  ? "Sealing…"
                  : "Seal it"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-accent bg-accent text-on-accent shadow-xs"
          : "border-ink-soft/20 bg-page/60 text-ink-soft hover:border-accent/40 hover:text-ink",
        className,
      )}
    />
  );
}