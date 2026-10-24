import * as React from "react";
import {
  ArrowRight,
  Check,

  Eye,
  Gift,
  Heart,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Send,
  Shuffle,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMood } from "./MoodContext";
import InvitePartnerCard from "@/features/couples/InvitePartnerCard";
import {
  NOTE_TEMPLATES,
  getTodayScreen,
  requestDailyReveal,
  submitDailyAnswer,
  swapDailyQuestion,
  submitRevealReaction,
  getReceivedNotes,
  getSentNotes,
  sendAppreciationNote,
  markNoteRead,
  getDailyChallenge,
  getChallengeStatus,
  completeChallenge,
  skipChallenge,
  type TodayState,
  type TodayScreen,
  type AppreciationNote,
  type DailyChallenge,
} from "./api";

const POLL_MS = 15_000;
const MAX_ANSWER = 2000;

const REACTIONS = ["❤️", "😮", "😄", "🥺", "💫"];

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function formatDate(localDate?: string) {
  if (!localDate) return "Today";
  return new Date(`${localDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export default function TodayPage() {
  const { session } = useAuth();
  const [screen, setScreen] = React.useState<TodayScreen | null>(null);
  const [answer, setAnswer] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const { setPartnerName } = useMood();

  // Appreciation notes state
  const [receivedNotes, setReceivedNotes] = React.useState<AppreciationNote[]>([]);
  const [sentNotes, setSentNotes] = React.useState<AppreciationNote[]>([]);
  const [showNoteCompose, setShowNoteCompose] = React.useState(false);
  const [showNoteInbox, setShowNoteInbox] = React.useState(false);
  const [showAppreciationJar, setShowAppreciationJar] = React.useState(false);

  // Challenge state
  const [challenge, setChallenge] = React.useState<DailyChallenge | null>(null);
  const [challengeStatus, setChallengeStatus] = React.useState<{ done: boolean; skipped: boolean; note: string }>({ done: false, skipped: false, note: "" });
  const [showChallengeComplete, setShowChallengeComplete] = React.useState(false);

  const sessionRef = React.useRef(session);
  const busyRef = React.useRef(false);
  const userId = session?.user.id;

  React.useEffect(() => { sessionRef.current = session; }, [session]);

  const load = React.useCallback(async ({ quiet = false, syncDraft = false } = {}) => {
    if (!quiet) { setLoading(true); setError(""); }
    try {
      const next = await getTodayScreen(sessionRef.current);
      setScreen(next);
      if (next.kind === "ready") {
        if (syncDraft) setAnswer(next.state.my_answer ?? "");
        setPartnerName(next.state.partner_name);
      }
    } catch (err) {
      if (!quiet) setError(errorText(err, "Couldn't load today's question."));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [setPartnerName]);

  const loadSideData = React.useCallback(async () => {
    try {
      const [notes, sent, ch, cs] = await Promise.all([
        getReceivedNotes(sessionRef.current),
        getSentNotes(sessionRef.current),
        getDailyChallenge(sessionRef.current),
        getChallengeStatus(sessionRef.current),
      ]);
      setReceivedNotes(notes);
      setSentNotes(sent);
      setChallenge(ch);
      setChallengeStatus(cs);
    } catch {
      // Side data failures are silent
    }
  }, []);

  React.useEffect(() => {
    void load({ syncDraft: true });
    void loadSideData();
    const timer = window.setInterval(() => {
      if (!busyRef.current) void load({ quiet: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, loadSideData, userId]);

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
    if (!text) { setError("Write a few words before saving your answer."); return; }
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

  function doSwap() {
    if (!state) return;
    void run(async () => {
      await swapDailyQuestion(sessionRef.current, state.session_id);
      return "Question swapped. One new question for today.";
    }, "Couldn't swap the question.");
  }

  function doReact(emoji: string) {
    if (!state) return;
    void run(async () => {
      await submitRevealReaction(sessionRef.current, state.session_id, emoji);
      return "";
    }, "Couldn't save your reaction.");
  }



  async function doSendNote(template: string, body: string, emoji?: string) {
    try {
      await sendAppreciationNote(sessionRef.current, { template, body, emoji });
      setShowNoteCompose(false);
      setNotice("Your note is on its way 💌");
    } catch {
      // silent
    }
  }

  async function doCompleteChallenge(note: string) {
    try {
      await completeChallenge(sessionRef.current, note);
      setChallengeStatus({ done: true, skipped: false, note });
      setShowChallengeComplete(false);
      setNotice("Challenge complete! 🎉");
    } catch {
      // silent
    }
  }

  async function doSkipChallenge() {
    try {
      await skipChallenge(sessionRef.current);
      setChallengeStatus({ done: false, skipped: true, note: "" });
      setNotice("No problem. There is no penalty for skipping today.");
    } catch {
      setError("Couldn't skip today's challenge.");
    }
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

  const unreadCount = receivedNotes.filter((n) => !n.read).length;

  return (
    <section className="w-full max-w-3xl space-y-4">
      <InvitePartnerCard />
      {/* Header */}
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
        <button
          type="button"
          onClick={() => setShowAppreciationJar(true)}
          className="flex items-center gap-2 rounded-full border border-ink-soft/20 bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-accent/50 hover:bg-accent/5 transition-colors"
        >
          <Star className="size-4 text-ink-soft" />
          Appreciation jar
        </button>
      </div>

      {/* Notices */}
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {showAppreciationJar && (
        <AppreciationJar
          notes={sentNotes}
          onClose={() => setShowAppreciationJar(false)}
        />
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-ink-soft/20 bg-surface p-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}

      {/* Quick Actions (Appreciation) */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowNoteCompose(true)}
          className="flex items-center gap-2 rounded-full border border-ink-soft/20 bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-accent/50 hover:bg-accent/5 transition-colors"
        >
          <Heart className="size-4 text-accent" />
          Appreciate {state.partner_name}
        </button>
        <button
          type="button"
          onClick={() => { setShowNoteInbox(true); }}
          className="relative flex items-center gap-2 rounded-full border border-ink-soft/20 bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-accent/50 hover:bg-accent/5 transition-colors"
        >
          <Gift className="size-4 text-ink-soft" />
          Notes for you
          {unreadCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-on-accent">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Appreciate Compose Sheet */}
      {showNoteCompose && (
        <AppreciateCompose
          partnerName={state.partner_name}
          onSend={doSendNote}
          onClose={() => setShowNoteCompose(false)}
        />
      )}

      {/* Note Inbox */}
      {showNoteInbox && (
        <NoteInbox
          notes={receivedNotes}
          onMarkRead={async (id) => {
            await markNoteRead(sessionRef.current, id);
            setReceivedNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
          }}
          onClose={() => setShowNoteInbox(false)}
        />
      )}

      {/* Daily Question Hero */}
      <article className="rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink-soft">Today's question</span>
          <div className="flex items-center gap-2">
            <DepthBadge dial={state.depth_dial} />
            <span className="rounded-full border border-ink-soft/20 px-3 py-1 text-xs text-ink-soft">2–5 min</span>
          </div>
        </div>
        <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl">{state.prompt}</h2>

        {/* Days answered together */}
        {state.days_answered_together > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
            <Star className="size-3.5 text-accent" />
            {state.days_answered_together} days answered together
          </p>
        )}

        {state.revealed ? (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <AnswerPanel name={`${state.my_name} · You`} answer={state.my_answer ?? "No answer was saved."} />
              <AnswerPanel name={state.partner_name} answer={state.partner_answer ?? "No answer was saved."} partner />
            </div>
            {/* Post-reveal reactions */}
            <ReactionRow
              myReaction={state.my_reaction}
              partnerReaction={state.partner_reaction}
              partnerName={state.partner_name}
              onReact={doReact}
              busy={busy}
            />
          </>
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
            {/* Swap question */}
            {!state.swap_used_today && !state.my_answered && (
              <button
                type="button"
                onClick={doSwap}
                disabled={busy}
                className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors disabled:opacity-50"
              >
                <Shuffle className="size-3.5" />
                Swap today's question (once)
              </button>
            )}
          </>
        )}
      </article>

      {/* Micro Daily Challenge */}
      {challenge && (
        <ChallengeCard
          challenge={challenge}
          status={challengeStatus}
          showComplete={showChallengeComplete}
          onOpenComplete={() => setShowChallengeComplete(true)}
          onCloseComplete={() => setShowChallengeComplete(false)}
          onComplete={doCompleteChallenge}
          onSkip={doSkipChallenge}
          busy={busy}
        />
      )}

      <p className="mx-auto mt-2 max-w-lg text-center text-xs leading-5 text-ink-soft">
        No scores, no streaks. Just a little space to understand each other better.
      </p>
    </section>
  );
}

function AppreciateCompose({
  partnerName, onSend, onClose,
}: {
  partnerName: string;
  onSend: (template: string, body: string, emoji?: string) => void;
  onClose: () => void;
}) {
  const [template, setTemplate] = React.useState(NOTE_TEMPLATES[0]);
  const [body, setBody] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    await onSend(template, body.trim(), emoji || undefined);
    setSending(false);
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Note to {partnerName}</p>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-soft hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {/* Template selector */}
      <div className="mt-3 flex flex-wrap gap-2">
        {NOTE_TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTemplate(t)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              template === t ? "border-accent bg-accent text-on-accent" : "border-ink-soft/20 hover:border-accent/40"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {/* Body */}
      <div className="mt-3 rounded-xl border border-ink-soft/20 bg-page p-3">
        <span className="font-hand text-base text-ink-soft">{template} </span>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="your words here…"
          rows={3}
          maxLength={500}
          className="mt-1 resize-none border-0 bg-transparent p-0 font-hand text-base focus-visible:ring-0"
        />
      </div>
      {/* Emoji + send */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {["💛", "☕", "🌸", "✨", "🫂"].map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? "" : e)}
              className={`rounded-full p-1.5 text-lg transition-colors ${emoji === e ? "bg-accent/20 ring-1 ring-accent" : "hover:bg-surface"}`}
            >
              {e}
            </button>
          ))}
        </div>
        <Button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
        >
          {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send
        </Button>
      </div>
    </div>
  );
}

function NoteInbox({
  notes, onMarkRead, onClose,
}: {
  notes: AppreciationNote[];
  onMarkRead: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Notes for you</p>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-soft hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No notes yet — they'll appear here when your partner sends one.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className={`rounded-xl border p-4 transition-colors ${note.read ? "border-ink-soft/20 bg-page" : "border-accent/30 bg-accent/5"}`}>
              {!note.read && (
                <span className="mb-2 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-on-accent">New</span>
              )}
              <p className="font-hand text-base leading-relaxed">
                <span className="font-medium not-font-hand text-sm text-ink-soft">{note.template} </span>
                {note.body}
                {note.emoji && ` ${note.emoji}`}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-ink-soft">{note.from_name} · {timeAgo(note.created_at)}</p>
                {!note.read && (
                  <button
                    type="button"
                    onClick={() => void onMarkRead(note.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AppreciationJar({ notes, onClose }: { notes: AppreciationNote[]; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-ink-soft/20 bg-surface p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Appreciation jar</p>
          <p className="mt-1 text-sm text-ink-soft">Notes you have sent, saved to revisit.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-soft hover:text-ink" aria-label="Close appreciation jar">
          <X className="size-4" />
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Your sent notes will collect here.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-ink-soft/20 bg-page p-4">
              <p className="font-hand text-base leading-relaxed">
                <span className="font-medium not-font-hand text-sm text-ink-soft">{note.template} </span>
                {note.body}
                {note.emoji && ` ${note.emoji}`}
              </p>
              <p className="mt-2 text-xs text-ink-soft">Sent {timeAgo(note.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
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
        <span className="text-xs text-ink-soft">{answer.length}/{MAX_ANSWER}</span>
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
        <StatusLine done={state.partner_answered} label={state.partner_answered ? "Your partner has answered" : "Your partner is still writing"} />
        <StatusLine done={state.my_reveal_requested} label={state.my_reveal_requested ? "You've asked to reveal" : "You're not ready to reveal yet"} />
        <StatusLine done={state.partner_reveal_requested} label={state.partner_reveal_requested ? "Your partner is ready to reveal" : "Your partner hasn't asked to reveal yet"} />
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

function ReactionRow({
  myReaction, partnerReaction, partnerName, onReact, busy,
}: {
  myReaction: string | null;
  partnerReaction: string | null;
  partnerName: string;
  onReact: (emoji: string) => void;
  busy: boolean;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-ink-soft/20 bg-page p-4">
      <p className="text-xs font-semibold text-ink-soft">React to their answer</p>
      {myReaction ? (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-2xl">{myReaction}</span>
          <span className="text-sm text-ink-soft">You reacted</span>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={busy}
              onClick={() => onReact(emoji)}
              className="rounded-full border border-ink-soft/20 p-2 text-xl hover:border-accent/50 hover:bg-accent/5 transition-colors disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {partnerReaction && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="text-lg">{partnerReaction}</span>
          {partnerName} reacted
        </p>
      )}
    </div>
  );
}

function DepthBadge({ dial }: { dial: string }) {
  const map: Record<string, { label: string; color: string }> = {
    light: { label: "Light", color: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" },
    mixed: { label: "Mixed", color: "text-amber-600 border-amber-500/30 bg-amber-500/5" },
    deep: { label: "Deep", color: "text-purple-600 border-purple-500/30 bg-purple-500/5" },
  };
  const { label, color } = map[dial] ?? map.mixed;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

function StatusLine({ done, label }: { done: boolean; label: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className={`flex size-5 items-center justify-center rounded-full border ${done ? "border-accent bg-accent text-on-accent" : "border-ink-soft/30"}`}>
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

type ChallengeCardProps = {
  challenge: DailyChallenge;
  status: { done: boolean; skipped: boolean; note: string };
  showComplete: boolean;
  onOpenComplete: () => void;
  onCloseComplete: () => void;
  onComplete: (note: string) => void;
  onSkip: () => void;
  busy: boolean;
};

function ChallengeCard({ challenge, status, showComplete, onOpenComplete, onCloseComplete, onComplete, onSkip }: ChallengeCardProps) {
  const [noteText, setNoteText] = React.useState("");

  const categoryColor: Record<string, string> = {
    affection: "text-pink-600 bg-pink-500/10 border-pink-500/20",
    words: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    play: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    reflection: "text-purple-600 bg-purple-500/10 border-purple-500/20",
    service: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <article className="rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-accent" />
          <span className="text-sm font-semibold text-ink-soft">Today's challenge</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${categoryColor[challenge.category] ?? ""}`}>
            {challenge.category}
          </span>
          <span className="rounded-full border border-ink-soft/20 px-2.5 py-0.5 text-xs text-ink-soft">{challenge.duration_label}</span>
        </div>
      </div>

      <h2 className="mt-4 text-xl font-semibold">{challenge.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{challenge.body}</p>

      {status.done ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <Sparkles className="size-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Done today ✓</p>
            {status.note && <p className="mt-0.5 truncate text-xs text-ink-soft">{status.note}</p>}
          </div>
        </div>
      ) : status.skipped ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-ink-soft/20 bg-page px-4 py-3">
          <span className="size-2 rounded-full bg-ink-soft/50" />
          <p className="text-sm text-ink-soft">Skipped today. There is no penalty.</p>
        </div>
      ) : showComplete ? (
        <div className="mt-4 space-y-3 animate-in fade-in duration-200">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note or photo caption (optional)…"
            rows={2}
            maxLength={300}
            className="resize-none rounded-2xl border-ink-soft/20 bg-page text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => { onComplete(noteText); setNoteText(""); }}
              className="flex-1 rounded-full bg-accent text-on-accent hover:bg-accent/90"
            >
              <Check className="size-4" />
              Mark done
            </Button>
            <Button variant="outline" onClick={onCloseComplete} className="rounded-full">
              Keep for later
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={onOpenComplete}
            className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
          >
            <Check className="size-4" />
            Done
          </Button>
          <Button variant="outline" onClick={onSkip} className="rounded-full text-ink-soft">
            Not today
          </Button>
        </div>
      )}
    </article>
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