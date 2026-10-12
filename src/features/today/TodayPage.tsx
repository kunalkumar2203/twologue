import * as React from "react";
import { ArrowRight, Check, Eye, Heart, LoaderCircle, LockKeyhole, RefreshCw, Send } from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DevPartnerPanel } from "./DevPartnerPanel";
import {
  USE_MOCK_API,
  getTodayScreen,
  requestDailyReveal,
  submitDailyAnswer,
  type TodayState,
  type TodayScreen,
} from "./api";

const POLL_MS = 15_000;
const MAX_ANSWER = 2000;

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function formatDate(localDate?: string) {
  if (!localDate) return "Today";
  // Noon avoids the date slipping across a day boundary in some time zones
  return new Date(`${localDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  const { session } = useAuth();
  const [screen, setScreen] = React.useState<TodayScreen | null>(null);
  const [answer, setAnswer] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  // Refs let the timer and buttons use the newest session without restarting the page.
  // A token refresh would otherwise reload the screen and wipe an unsaved answer.
  const sessionRef = React.useRef(session);
  const busyRef = React.useRef(false);
  const userId = session?.user.id;

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // quiet: refresh without a spinner or error message (timer, after saving)
  // syncDraft: replace the text box with the saved answer
  const load = React.useCallback(async ({ quiet = false, syncDraft = false } = {}) => {
    if (!quiet) {
      setLoading(true);
      setError("");
    }
    try {
      const next = await getTodayScreen(sessionRef.current);
      setScreen(next);
      if (syncDraft && next.kind === "ready") setAnswer(next.state.my_answer ?? "");
    } catch (err) {
      if (!quiet) setError(errorText(err, "Couldn't load today's question."));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load({ syncDraft: true });
    const timer = window.setInterval(() => {
      if (!busyRef.current) void load({ quiet: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, userId]);

  // Runs a button action: locks the buttons, shows its message, then refreshes quietly
  async function run(task: () => Promise<string>, fallback: string) {
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setNotice(await task());
      await load({ quiet: true, syncDraft: true });
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const state = screen?.kind === "ready" ? screen.state : null;

  function saveAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state) return;
    const text = answer.trim();
    if (!text) {
      setError("Write a few words before saving your answer.");
      return;
    }
    void run(async () => {
      await submitDailyAnswer(sessionRef.current, state.session_id, text);
      return "Your answer is saved privately. Your partner cannot read it yet.";
    }, "Couldn't save your answer.");
  }

  function askToReveal() {
    if (!state) return;
    void run(async () => {
      const revealed = await requestDailyReveal(sessionRef.current, state.session_id);
      return revealed
        ? "You both chose to reveal. Your answers are now open."
        : "Your reveal request is saved. Your partner's answer stays hidden until they're ready too.";
    }, "Couldn't request the reveal.");
  }

  if (loading) {
    return (
      <section className="w-full max-w-3xl">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <LoaderCircle className="size-4 animate-spin" />
          Finding today's moment…
        </p>
      </section>
    );
  }

  if (screen?.kind === "no-couple") return <NoCoupleNotice />;
  if (screen?.kind === "paused") return <PausedNotice />;

  if (!state) {
    return (
      <section className="w-full max-w-3xl">
        <h1 className="text-3xl font-semibold">Today</h1>
        <p className="mt-4 text-sm text-ink-soft">{error || "Today's question could not be loaded."}</p>
        <Button className="mt-4 rounded-full" onClick={() => void load({ syncDraft: true })}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-soft">{formatDate(state.local_date)}</p>
          <h1 className="mt-1 text-3xl font-semibold">A moment for us.</h1>
        </div>
        <button
          type="button"
          onClick={() => void load({ quiet: true })}
          className="rounded-full p-2 text-ink-soft hover:bg-surface hover:text-ink"
          aria-label="Refresh today's question"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-5 rounded-xl border border-ink-soft/20 bg-surface p-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}

      <article className="mt-6 rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink-soft">Today's question</span>
          <span className="rounded-full border border-ink-soft/20 px-3 py-1 text-xs text-ink-soft">2-5 minutes</span>
        </div>
        <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl">{state.prompt}</h2>

        {state.revealed ? (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <AnswerPanel name={`${state.my_name} · You`} answer={state.my_answer ?? "No answer was saved."} />
            <AnswerPanel name={state.partner_name} answer={state.partner_answer ?? "No answer was saved."} partner />
          </div>
        ) : (
          <>
            <AnswerForm
              answer={answer}
              onChange={setAnswer}
              onSubmit={saveAnswer}
              busy={busy}
              saved={state.my_answered}
            />
            <RevealPanel state={state} busy={busy} onReveal={askToReveal} />
          </>
        )}
      </article>

      {USE_MOCK_API && (
        <DevPartnerPanel
          partnerAnswered={state.partner_answered}
          partnerWantsReveal={state.partner_reveal_requested}
          onChange={(resetDraft) => void load({ quiet: true, syncDraft: resetDraft })}
        />
      )}

      <p className="mx-auto mt-4 max-w-lg text-center text-xs leading-5 text-ink-soft">
        No scores, no streaks. Just a little space to understand each other better.
      </p>
    </section>
  );
}

function NoCoupleNotice() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-accent/10 text-accent">
        <Heart className="size-7" />
      </div>
      <p className="mt-6 text-sm font-semibold text-ink-soft">A little ritual for two</p>
      <h1 className="mt-2 text-3xl font-semibold">Start with your shared space.</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink-soft">
        Pair your account first. Then today's question, private answers and the reveal will belong to both of you.
      </p>
      <Button asChild className="mt-6 rounded-full bg-accent text-on-accent hover:bg-accent/90">
        <Link to="/app/us">
          Set up your shared space
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  );
}

function PausedNotice() {
  return (
    <section className="w-full max-w-3xl">
      <h1 className="text-3xl font-semibold">Today</h1>
      <div className="mt-6 rounded-2xl border border-ink-soft/20 bg-surface p-5">
        <p className="font-semibold">Daily questions are paused</p>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          Either partner can turn this shared feature back on in Settings.
        </p>
        <Link to="/app/settings" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
          Manage shared features
        </Link>
      </div>
    </section>
  );
}

type AnswerFormProps = {
  answer: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  saved: boolean;
};

function AnswerForm({ answer, onChange, onSubmit, busy, saved }: AnswerFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-6">
      <label htmlFor="today-answer" className="block text-sm font-semibold">
        Your answer <span className="font-normal text-ink-soft">(private for now)</span>
      </label>
      <Textarea
        id="today-answer"
        value={answer}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_ANSWER}
        rows={4}
        placeholder="Take a moment. It can be just a few words…"
        disabled={busy}
        className="mt-2 resize-y rounded-2xl border-ink-soft/20 bg-page text-base"
        aria-describedby="answer-privacy"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p id="answer-privacy" className="flex items-center gap-1.5 text-xs text-ink-soft">
          <LockKeyhole className="size-3.5" />
          Only you can read this until the reveal.
        </p>
        <span className="text-xs text-ink-soft">
          {answer.length}/{MAX_ANSWER}
        </span>
      </div>
      <Button
        type="submit"
        disabled={busy || !answer.trim()}
        className="mt-4 rounded-full bg-accent text-on-accent hover:bg-accent/90"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {saved ? "Update private answer" : "Save private answer"}
      </Button>
    </form>
  );
}

function RevealPanel({ state, busy, onReveal }: { state: TodayState; busy: boolean; onReveal: () => void }) {
  return (
    <div className="mt-7 rounded-2xl border border-ink-soft/20 bg-page p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ink-soft/20 bg-surface text-accent">
          <Eye className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Reveal together</h3>
          <p className="mt-1 text-sm leading-5 text-ink-soft">
            Neither answer opens until you've both answered and both asked to reveal.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-ink-soft">
        <StatusLine done={state.my_answered} label={state.my_answered ? "Your answer is saved" : "Waiting for your answer"} />
        <StatusLine
          done={state.partner_answered}
          label={state.partner_answered ? "Your partner has answered" : "Your partner is still writing"}
        />
        <StatusLine
          done={state.my_reveal_requested}
          label={state.my_reveal_requested ? "You've asked to reveal" : "You're not ready to reveal yet"}
        />
        <StatusLine
          done={state.partner_reveal_requested}
          label={state.partner_reveal_requested ? "Your partner is ready to reveal" : "Your partner hasn't asked to reveal yet"}
        />
      </div>

      <Button
        onClick={onReveal}
        disabled={busy || !state.my_answered || state.my_reveal_requested}
        variant="outline"
        className="mt-4 w-full rounded-full"
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : state.my_reveal_requested ? (
          <Check className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
        {state.my_reveal_requested ? "Waiting for your partner" : "I'm ready · reveal together"}
      </Button>

      {!state.partner_answered && (
        <p className="mt-3 text-center text-xs text-ink-soft">Your partner's answer stays private, even after you save yours.</p>
      )}
    </div>
  );
}

function StatusLine({ done, label }: { done: boolean; label: string }) {
  return (
    <p className="flex items-center gap-2">
      <span
        className={`flex size-5 items-center justify-center rounded-full border ${
          done ? "border-accent bg-accent text-on-accent" : "border-ink-soft/30"
        }`}
      >
        {done && <Check className="size-3" />}
      </span>
      {label}
    </p>
  );
}

function AnswerPanel({ name, answer, partner = false }: { name: string; answer: string; partner?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${partner ? "border-accent/30 bg-accent/5" : "border-ink-soft/20 bg-page"}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        {partner ? <Heart className="size-4 text-accent" /> : <Check className="size-4 text-accent" />}
        {name}
      </p>
      <p className="mt-3 whitespace-pre-wrap font-hand text-lg leading-relaxed">{answer}</p>
    </div>
  );
}