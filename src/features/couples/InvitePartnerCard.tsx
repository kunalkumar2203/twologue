import * as React from "react";
import { Check, Clipboard, Link2, LoaderCircle, Share2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pairingMessage, formatInviteCode } from "./api";
import { useCancelInvite, useCouple, useCreateInvite } from "./hooks";

const CODE_STORAGE_KEY = "twologue-pending-invite-code";

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function expiryLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function InvitePartnerCard() {
  const coupleQuery = useCouple();
  const createMutation = useCreateInvite();
  const cancelMutation = useCancelInvite();
  const [code, setCode] = React.useState(() => sessionStorage.getItem(CODE_STORAGE_KEY) ?? "");
  const [copied, setCopied] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const couple = coupleQuery.data?.couple;
  const partner = coupleQuery.data?.partner;
  const pendingInvite = coupleQuery.data?.pendingInvite;
  const link = code ? `${window.location.origin}/join/${code}` : "";
  const busy = createMutation.isPending || cancelMutation.isPending;

  React.useEffect(() => {
    if (!pendingInvite || new Date(pendingInvite.expires_at).getTime() <= Date.now()) {
      sessionStorage.removeItem(CODE_STORAGE_KEY);
      setCode("");
    }
  }, [pendingInvite]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setNotice("Copy is not available here. Select the invitation and copy it manually.");
    }
  }

  async function share() {
    if (!link) return;
    if (navigator.share) {
      await navigator.share({ title: "Your Twologue invitation", text: `Join me on Twologue with code ${code}.`, url: link });
      return;
    }
    await copy(link, "link");
  }

  async function create() {
    setNotice("");
    try {
      const nextCode = await createMutation.mutateAsync();
      const formatted = formatInviteCode(nextCode);
      sessionStorage.setItem(CODE_STORAGE_KEY, formatted);
      setCode(formatted);
      setNotice("Your invitation is ready to share.");
    } catch (error) {
      setNotice(pairingMessage(error instanceof Error && error.message === "already_paired" ? "already_paired_inviter" : error));
    }
  }

  async function cancel() {
    setNotice("");
    try {
      await cancelMutation.mutateAsync();
      sessionStorage.removeItem(CODE_STORAGE_KEY);
      setCode("");
      setNotice("Your invitation was cancelled.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't cancel that invitation. Please try again.");
    }
  }

  if (coupleQuery.isLoading) {
    return <p className="flex items-center gap-2 text-sm text-ink-soft" aria-live="polite"><LoaderCircle className="size-4 animate-spin" /> Checking your couple space…</p>;
  }

  if (partner) {
    const name = partner.display_name?.trim() || "Your partner";
    return (
      <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent">{initials(name)}</span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Connected</p><h2 className="text-xl font-semibold">{name}</h2></div>
          <Check className="ml-auto size-5 text-accent" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm text-ink-soft">You are connected. Your shared space is ready.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><UserPlus className="size-5" /></div>
        <div><p className="text-sm font-medium text-ink-soft">Your couple space</p><h2 className="text-xl font-semibold">Invite your partner</h2></div>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft">Make a private invitation to share. It works once and expires after seven days.</p>

      {notice && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-ink-soft/20 bg-page p-3 text-sm text-ink-soft">{notice}</p>}
      {!code || !pendingInvite ? (
        <Button type="button" onClick={() => void create()} disabled={busy} className="mt-5 min-h-11 rounded-full bg-accent text-on-accent hover:bg-accent/90">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />} Create invitation
        </Button>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="invite-link" className="text-sm font-medium">Invitation link</label>
            <div className="mt-1 flex gap-2">
              <Input id="invite-link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-h-11 min-w-0" />
              <Button type="button" variant="outline" onClick={() => void copy(link, "link")} className="min-h-11 min-w-11 px-3" aria-label="Copy invitation link"><Clipboard className="size-4" /></Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Code</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-lg bg-page px-3 py-2 text-lg font-semibold tracking-[0.18em]">{code}</code>
              <Button type="button" variant="outline" onClick={() => void copy(code, "code")} className="min-h-11 min-w-11 px-3" aria-label="Copy invitation code"><Clipboard className="size-4" /></Button>
            </div>
          </div>
          <p className="text-xs text-ink-soft">Expires {expiryLabel(pendingInvite.expires_at)}. {copied === "link" ? "Link copied." : copied === "code" ? "Code copied." : ""}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void share()} disabled={busy} className="min-h-11 rounded-full bg-accent text-on-accent hover:bg-accent/90"><Share2 className="size-4" /> Share</Button>
            <Button type="button" variant="outline" onClick={() => void create()} disabled={busy} className="min-h-11 rounded-full"><Link2 className="size-4" /> Make a new invite</Button>
            <Button type="button" variant="ghost" onClick={() => void cancel()} disabled={busy} className="min-h-11 rounded-full"><X className="size-4" /> Cancel invite</Button>
          </div>
        </div>
      )}
    </div>
  );
}
