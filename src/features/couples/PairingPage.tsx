import * as React from "react";
import { Check, Copy, HeartHandshake, Link2, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCouple, createPairInvite, getMyCouple, profileName, type CoupleSummary, tokenFromInput, acceptPairInvite } from "./api";

export default function PairingPage() {
  const { session, user } = useAuth();
  const [couple, setCouple] = React.useState<CoupleSummary | null>(null);
  const [coupleName, setCoupleName] = React.useState("");
  const [joinInput, setJoinInput] = React.useState("");
  const [inviteUrl, setInviteUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [copyDone, setCopyDone] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const reloadCouple = React.useCallback(async (silent = false) => {
    if (!session) return;
    if (!silent) setLoading(true);
    try {
      const result = await getMyCouple(session);
      setCouple(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your shared space.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session]);

  React.useEffect(() => { void reloadCouple(); }, [reloadCouple]);
  React.useEffect(() => {
    const onFocus = () => void reloadCouple(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void reloadCouple(true);
    }, 20_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [reloadCouple]);

  async function onCreateCouple(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await createCouple(session, String(user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Partner"), coupleName);
      setCoupleName("");
      setNotice("Your shared space is ready. Invite your partner when you're ready.");
      await reloadCouple();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your shared space.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateInvite() {
    if (!session) return;
    setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const invite = await createPairInvite(session);
      setInviteUrl(`${window.location.origin}/join/${invite.token}`);
      setNotice(`Invite link created. It expires ${new Date(invite.expires_at).toLocaleString()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create an invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function onJoinCouple(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const token = tokenFromInput(joinInput);
    if (!token) { setError("Paste an invitation link or token first."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await acceptPairInvite(session, token);
      setJoinInput("");
      setNotice("You're connected. This is now your shared space.");
      await reloadCouple();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That invitation couldn't be accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 1800);
    } catch {
      setError("Copy isn't available in this browser. Select the invitation link and copy it manually.");
    }
  }

  const partner = couple?.members.find((member) => member.user_id !== user?.id);

  if (loading) {
    return <section className="w-full" aria-live="polite"><p className="flex items-center gap-2 text-sm text-ink-soft"><LoaderCircle className="size-4 animate-spin" /> Loading your shared space…</p></section>;
  }

  return (
    <section className="w-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"><HeartHandshake className="size-6" /></div>
        <div>
          <p className="text-sm font-medium text-ink-soft">Your shared space</p>
          <h1 className="text-3xl font-semibold">Us, together</h1>
        </div>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">Pair once and the things you create in Twologue can belong to both of you, with private answers staying private until the reveal rules allow them to open.</p>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-ink-soft/20 bg-surface p-3 text-sm text-ink-soft">{notice}</p>}

      {couple ? (
        <div className="mt-7 space-y-4">
          <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Your couple space</p>
                <h2 className="mt-1 text-2xl font-semibold">{couple.name || "Our space"}</h2>
                <p className="mt-1 text-sm text-ink-soft">Created {new Date(couple.created_at).toLocaleDateString()}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full border border-ink-soft/20 bg-page text-accent"><UsersRound className="size-5" /></span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {couple.members.map((member) => {
                const isYou = member.user_id === user?.id;
                return <div key={member.user_id} className="flex items-center gap-3 rounded-xl border border-ink-soft/20 bg-page p-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent">{profileName(member).slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{isYou ? `${profileName(member)} (you)` : profileName(member)}</span><span className="block text-xs text-ink-soft">{isYou ? "Account owner" : "Connected partner"}</span></span>
                  {isYou && <Check className="ml-auto size-4 text-accent" />}
                </div>;
              })}
              {!partner && <div className="rounded-xl border border-dashed border-ink-soft/30 p-3 text-sm text-ink-soft">Your partner's place is waiting.</div>}
            </div>
          </div>

          {!partner ? (
            <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
              <h3 className="text-lg font-semibold">Invite your person</h3>
              <p className="mt-1 text-sm leading-6 text-ink-soft">Create a private invitation link and send it directly to your partner. It can be used once and expires after seven days.</p>
              <Button onClick={onCreateInvite} disabled={busy} className="mt-4 rounded-full bg-accent text-on-accent hover:bg-accent/90">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />} Create invitation link</Button>
              {inviteUrl && <div className="mt-4 space-y-2"><label htmlFor="invite-url" className="text-sm font-medium">Invitation link</label><div className="flex gap-2"><Input id="invite-url" readOnly value={inviteUrl} className="min-w-0" onFocus={(event) => event.currentTarget.select()} /><Button type="button" variant="outline" onClick={copyInvite} aria-label="Copy invitation link">{copyDone ? <Check className="size-4" /> : <Copy className="size-4" />}{copyDone ? "Copied" : "Copy"}</Button></div></div>}
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-soft"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> The database only stores a hash of the invitation token. The raw link is shown to you once when created.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5"><p className="flex items-center gap-2 text-sm font-medium"><Check className="size-4 text-accent" /> You're paired. Shared features can now be built on this couple space.</p></div>
          )}
        </div>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Start a space</p>
            <h2 className="mt-2 text-xl font-semibold">Create your shared space</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Give it a name or keep the default. You'll get an invitation link for your partner next.</p>
            <form onSubmit={onCreateCouple} className="mt-5 space-y-3">
              <label htmlFor="couple-name" className="block text-sm font-medium">Space name <span className="font-normal text-ink-soft">(optional)</span></label>
              <Input id="couple-name" value={coupleName} onChange={(event) => setCoupleName(event.target.value)} maxLength={60} placeholder="Our little world" />
              <Button type="submit" disabled={busy} className="w-full rounded-full bg-accent text-on-accent hover:bg-accent/90">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <HeartHandshake className="size-4" />} Create our space</Button>
            </form>
          </div>

          <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Join a space</p>
            <h2 className="mt-2 text-xl font-semibold">Your partner invited you?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Paste the full invitation link or its token. Make sure you're signed in to the account you want to pair with.</p>
            <form onSubmit={onJoinCouple} className="mt-5 space-y-3">
              <label htmlFor="join-invite" className="block text-sm font-medium">Invitation link or token</label>
              <Input id="join-invite" value={joinInput} onChange={(event) => setJoinInput(event.target.value)} autoComplete="off" placeholder="Paste invitation here" />
              <Button type="submit" variant="outline" disabled={busy} className="w-full rounded-full">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />} Join your partner</Button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export function JoinCouplePage({ token }: { token: string }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [goToSpace, setGoToSpace] = React.useState(false);

  async function join() {
    if (!session) return;
    setBusy(true); setError("");
    try {
      await acceptPairInvite(session, tokenFromInput(token));
      setDone(true);
      setGoToSpace(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This invitation couldn't be accepted.");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    if (goToSpace) navigate("/app/us", { replace: true });
  }, [goToSpace, navigate]);

  return <section className="mx-auto w-full max-w-lg self-center rounded-3xl border border-ink-soft/20 bg-surface p-6 sm:p-8">
    <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><HeartHandshake className="size-6" /></div>
    <h1 className="mt-5 text-2xl font-semibold">Join your partner's space</h1>
    <p className="mt-2 text-sm leading-6 text-ink-soft">Accepting this invitation connects your account to the same shared space. An account can belong to one active couple at a time.</p>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {done ? <p role="status" className="mt-4 text-sm text-ink-soft">You're connected. Opening your shared space…</p> : <Button onClick={join} disabled={busy} className="mt-5 w-full rounded-full bg-accent text-on-accent hover:bg-accent/90">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <HeartHandshake className="size-4" />} Accept invitation</Button>}
    <p className="mt-4 text-xs leading-5 text-ink-soft">Only accept a link sent to you by someone you trust.</p>
  </section>;
}
