import * as React from "react";
import { Check, HeartHandshake, LoaderCircle, RefreshCw, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInvite, formatInviteCode, pairingMessage, previewInvite } from "./api";
import { coupleQueryKey } from "./hooks";
import { useQueryClient } from "@tanstack/react-query";

const PENDING_INVITE_KEY = "twologue-pending-invite";

type Preview = {
  is_valid: boolean;
  inviter_name: string | null;
  inviter_avatar: string | null;
};

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function savePendingCode(code: string) {
  localStorage.setItem(PENDING_INVITE_KEY, code);
}

function clearPendingCode() {
  localStorage.removeItem(PENDING_INVITE_KEY);
}

export default function JoinInvitePage({ code: routeCode }: { code: string }) {
  const { session, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const normalizedRouteCode = formatInviteCode(routeCode);
  const [code, setCode] = React.useState(normalizedRouteCode);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [accepting, setAccepting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const returnPath = `/join/${encodeURIComponent(code)}`;

  React.useEffect(() => {
    if (!authLoading && !user) savePendingCode(code);
  }, [authLoading, code, user]);

  const loadPreview = React.useCallback(async () => {
    if (!session || !code) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await previewInvite(session, code);
      if (!result.is_valid) {
        clearPendingCode();
        setPreview(null);
        setError(pairingMessage("invalid_invite"));
        return;
      }
      setPreview(result);
    } catch (err) {
      setError(pairingMessage(err));
    } finally {
      setLoading(false);
    }
  }, [code, session]);

  React.useEffect(() => {
    if (session && code) void loadPreview();
  }, [code, loadPreview, session]);

  function updateCode(value: string) {
    setCode(formatInviteCode(value));
    setPreview(null);
    setError("");
    setNotice("");
  }

  function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.replace("-", "").length !== 10) {
      setError("Enter the 10-character invitation code.");
      return;
    }
    navigate(`/join/${encodeURIComponent(code)}`, { replace: true });
  }

  async function accept() {
    if (!session || !code) return;
    setAccepting(true);
    setError("");
    setNotice("");
    try {
      const result = await acceptInvite(session, code);
      if (result !== "accepted") {
        clearPendingCode();
        setPreview(null);
        setError(pairingMessage(result));
        return;
      }
      clearPendingCode();
      await queryClient.invalidateQueries({ queryKey: coupleQueryKey });
      navigate("/app", {
        replace: true,
        state: {
          pairedWelcome: {
            name: preview?.inviter_name || "Your partner",
            note: "Your previous solo space is closed, and its data is kept.",
          },
        },
      });
    } catch (err) {
      setError(pairingMessage(err));
    } finally {
      setAccepting(false);
    }
  }

  function notNow() {
    clearPendingCode();
    navigate("/", { replace: true });
  }

  if (authLoading) {
    return <JoinShell><Status text="Opening your invitation…" /></JoinShell>;
  }

  if (!user) {
    savePendingCode(code);
    return (
      <JoinShell>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><HeartHandshake className="size-6" /></div>
        <p className="mt-5 text-sm font-medium text-ink-soft">A private invitation</p>
        <h1 className="mt-1 text-3xl font-semibold">You’ve been invited to Twologue</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">Sign in or create an account to see who invited you. Opening this page does not accept the invitation.</p>
        <div className="mt-6 grid gap-3">
          <Link to={`/auth?next=${encodeURIComponent(returnPath)}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent/90">Sign in</Link>
          <Link to={`/auth?next=${encodeURIComponent(returnPath)}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-soft/25 px-5 text-sm font-semibold text-ink hover:border-accent/50">Create account</Link>
        </div>
        <p className="mt-5 text-center text-xs text-ink-soft">Your invitation code is saved on this device until you decide.</p>
      </JoinShell>
    );
  }

  const inviterName = preview?.inviter_name?.trim() || "Your partner";

  return (
    <JoinShell>
      {preview ? (
        <>
          <Avatar size="lg" className="size-16 bg-accent/15 text-accent">
            {preview.inviter_avatar && <AvatarImage src={preview.inviter_avatar} alt="" />}
            <AvatarFallback className="bg-accent/15 text-xl font-semibold text-accent">{initials(inviterName)}</AvatarFallback>
          </Avatar>
          <p className="mt-5 text-sm font-medium text-ink-soft">Your invitation</p>
          <h1 className="mt-1 text-3xl font-semibold">{inviterName} invited you</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">Accept to join their Twologue couple space. You can keep your own answers and memories when you join.</p>
          <div className="mt-6 grid gap-3">
            <Button type="button" onClick={() => void accept()} disabled={accepting} className="min-h-11 rounded-full bg-accent text-on-accent hover:bg-accent/90">
              {accepting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} {accepting ? "Connecting…" : "Accept invitation"}
            </Button>
            <Button type="button" variant="outline" onClick={notNow} disabled={accepting} className="min-h-11 rounded-full">Not now</Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><UserRound className="size-6" /></div>
          <h1 className="mt-5 text-3xl font-semibold">Have a code?</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">Enter the invitation code your partner shared with you.</p>
          <form onSubmit={submitCode} className="mt-6 space-y-3">
            <Input value={code} onChange={(event) => updateCode(event.target.value)} placeholder="ABCDE-23456" autoCapitalize="characters" autoComplete="off" className="min-h-11 text-center text-lg tracking-[0.15em]" aria-label="Invitation code" />
            <Button type="submit" className="min-h-11 w-full rounded-full bg-accent text-on-accent hover:bg-accent/90">Continue</Button>
          </form>
        </>
      )}
      {loading && <Status text="Checking the invitation…" />}
      {error && <p role="alert" aria-live="polite" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
        {error}
        {error.includes("Settings") && <Link to="/app/settings" className="mt-2 block font-semibold underline underline-offset-4">Open Settings</Link>}
      </p>}
      {notice && <p role="status" aria-live="polite" className="mt-5 rounded-xl border border-ink-soft/20 bg-page p-3 text-sm text-ink-soft">{notice}</p>}
      {error && session && (
        <Button type="button" variant="ghost" onClick={() => void loadPreview()} disabled={loading} className="mt-3 min-h-11 rounded-full">
          <RefreshCw className="size-4" /> Try again
        </Button>
      )}
    </JoinShell>
  );
}

function JoinShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-10 text-ink"><section className="w-full max-w-md rounded-3xl border border-ink-soft/20 bg-surface p-6 shadow-sm sm:p-8">{children}</section></main>;
}

function Status({ text }: { text: string }) {
  return <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft" role="status" aria-live="polite"><LoaderCircle className="size-4 animate-spin" />{text}</p>;
}
