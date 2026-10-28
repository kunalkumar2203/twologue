import * as React from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Eye,
  Gift,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  PauseCircle,
  Pencil,
  RefreshCw,
  Send,
  Shuffle,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMood } from "./MoodContext";
import InvitePartnerCard from "@/features/couples/InvitePartnerCard";
import { useSharedFeatures } from "@/features/couples/useSharedFeatures";
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
  const { isEnabled } = useSharedFeatures();
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

  function doReact(emoji: string, reply?: string) {
    if (!state) return;
    void run(async () => {
      await submitRevealReaction(sessionRef.current, state.session_id, emoji, reply);
      return reply ? "Reaction and reply saved ✨" : "Reaction saved ✨";
    }, "Couldn't save your reaction.");
  }



  async function doSendNote(template: string, body: string, emoji?: string) {
    try {
      await sendAppreciationNote(sessionRef.current, { template, body, emoji });
      // Refresh sent list so the history section in the compose panel updates
      const sent = await getSentNotes(sessionRef.current);
      setSentNotes(sent);
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

  function doUnskipChallenge() {
    // Locally clear the skip flag — no API call; completing later will persist to DB
    setChallengeStatus({ done: false, skipped: false, note: "" });
    setNotice("");
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
  if (screen?.kind === "paused" || !isEnabled("daily_question")) return <PausedNotice />;

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
      </div>

      {/* Notices */}
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}


      {notice && (
        <p role="status" className="rounded-xl border border-ink-soft/20 bg-surface p-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}


      {/* Quick Actions (Appreciation) - reciprocally synced */}
      {isEnabled("appreciation_notes") && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowNoteCompose((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                showNoteCompose
                  ? "border-accent bg-accent/10 text-accent shadow-2xs"
                  : "border-ink-soft/20 bg-surface text-ink hover:border-accent/50 hover:bg-accent/5"
              }`}
            >
              <Heart className="size-4 text-accent" />
              Appreciate {state.partner_name}
            </button>
            <button
              type="button"
              onClick={() => setShowNoteInbox((prev) => !prev)}
              className={`relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                showNoteInbox
                  ? "border-accent bg-accent/10 text-accent shadow-2xs"
                  : "border-ink-soft/20 bg-surface text-ink hover:border-accent/50 hover:bg-accent/5"
              }`}
            >
              <Gift className={`size-4 ${showNoteInbox ? "text-accent" : "text-ink-soft"}`} />
              Notes for you
              {unreadCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-on-accent">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Side-by-side panels — responsive stack on mobile, 2-col on desktop */}
          {(showNoteCompose || showNoteInbox) && (
            <div
              className={`grid gap-3 transition-all duration-300 ${
                showNoteCompose && showNoteInbox ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {showNoteCompose && (
                <div className="min-w-0 transition-all duration-300">
                  <AppreciateCompose
                    partnerName={state.partner_name}
                    sentNotes={sentNotes}
                    onSend={doSendNote}
                    onClose={() => setShowNoteCompose(false)}
                  />
                </div>
              )}
              {showNoteInbox && (
                <div className="min-w-0 transition-all duration-300">
                  <NoteInbox
                    notes={receivedNotes}
                    onMarkRead={async (id) => {
                      await markNoteRead(sessionRef.current, id);
                      setReceivedNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
                    }}
                    onClose={() => setShowNoteInbox(false)}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Daily Question Hero */}
      <article className="rounded-3xl border border-ink-soft/20 bg-surface p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-ink-soft/10">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/75">
              Today's Question
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Depth Badge: soft squarish tag with theme accent styling */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent shadow-2xs">
              <span className="flex items-center gap-0.5" aria-hidden="true">
                <span className="size-1.5 rounded-full bg-accent" />
                <span className={`size-1.5 rounded-full ${state.depth_dial !== "light" ? "bg-accent" : "bg-accent/20"}`} />
                <span className={`size-1.5 rounded-full ${state.depth_dial === "deep" ? "bg-accent" : "bg-accent/20"}`} />
              </span>
              <span className="capitalize">{state.depth_dial} reflection</span>
            </div>

            {/* Reading/Connection Time: crisp, subtle, theme-aligned chip */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-ink-soft/20 bg-page/80 px-2.5 py-1 text-xs font-medium text-ink shadow-2xs">
              <Clock className="size-3 text-accent" />
              <span>2–5 mins</span>
            </div>
          </div>
        </div>

        <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl font-heading">
          {state.prompt}
        </h2>

        {/* Days answered together */}
        {state.days_answered_together > 0 && (
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-ink-soft/10">
            <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Heart className="size-3 fill-accent/30 text-accent" />
            </span>
            <p className="text-xs font-medium text-ink">
              <span>{state.days_answered_together} {state.days_answered_together === 1 ? "day" : "days"} answered together</span>
              <span className="ml-2 font-hand text-accent text-sm">keep the rhythm going ♡</span>
            </p>
          </div>
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
              myReply={state.my_reply ?? null}
              partnerReaction={state.partner_reaction}
              partnerReply={state.partner_reply ?? null}
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

      {/* Micro Daily Challenge - only when enabled */}
      {isEnabled("micro_challenges") && challenge && (
        <ChallengeCard
          challenge={challenge}
          status={challengeStatus}
          showComplete={showChallengeComplete}
          onOpenComplete={() => setShowChallengeComplete(true)}
          onCloseComplete={() => setShowChallengeComplete(false)}
          onComplete={doCompleteChallenge}
          onSkip={doSkipChallenge}
          onUnskip={doUnskipChallenge}
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
  partnerName, sentNotes, onSend, onClose,
}: {
  partnerName: string;
  sentNotes: AppreciationNote[];
  onSend: (template: string, body: string, emoji?: string) => void;
  onClose: () => void;
}) {
  const [template, setTemplate] = React.useState(NOTE_TEMPLATES[0]);
  const [body, setBody] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    await onSend(template, body.trim(), emoji || undefined);
    // Clear form fields after sending; panel stays open so user sees history
    setBody("");
    setEmoji("");
    setShowHistory(true);
    setSending(false);
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Appreciate {partnerName}</p>
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

      {/* Sent history — collapsible */}
      {sentNotes.length > 0 && (
        <div className="mt-4 border-t border-ink-soft/10 pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((p) => !p)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink transition-colors"
          >
            <span>Sent ({sentNotes.length})</span>
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory && (
            <ul className="mt-3 space-y-2 animate-in fade-in duration-200">
              {sentNotes.map((note) => (
                <li key={note.id} className="rounded-xl border border-ink-soft/20 bg-page p-3">
                  <p className="font-hand text-sm leading-relaxed">
                    <span className="not-font-hand text-xs font-medium text-ink-soft">{note.template} </span>
                    {note.body}
                    {note.emoji && ` ${note.emoji}`}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-soft">Sent {timeAgo(note.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
        <p className="mt-4 text-sm text-ink-soft">No notes yet, they'll appear here when your partner sends one.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className={`rounded-xl border p-4 transition-colors ${note.read ? "border-ink-soft/20 bg-page" : "border-accent/30 bg-accent/5"}`}>
              {!note.read && (
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                  New note
                </span>
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
  myReaction,
  myReply,
  partnerReaction,
  partnerReply,
  partnerName,
  onReact,
  busy,
}: {
  myReaction: string | null;
  myReply: string | null;
  partnerReaction: string | null;
  partnerReply: string | null;
  partnerName: string;
  onReact: (emoji: string, reply?: string) => void;
  busy: boolean;
}) {
  const [selectedEmoji, setSelectedEmoji] = React.useState<string>(myReaction || REACTIONS[0]);
  const [replyText, setReplyText] = React.useState<string>(myReply || "");
  const [isEditing, setIsEditing] = React.useState<boolean>(!myReaction);

  React.useEffect(() => {
    if (myReaction) {
      setSelectedEmoji(myReaction);
      setReplyText(myReply || "");
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [myReaction, myReply]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmoji) return;
    onReact(selectedEmoji, replyText.trim() || undefined);
    setIsEditing(false);
  };

  return (
    <div className="mt-6 rounded-3xl border border-ink-soft/20 bg-page p-5 sm:p-6 space-y-4">
      {/* My Reaction Section */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Your reaction to {partnerName}'s answer
          </p>
          {myReaction && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <Pencil className="size-3" />
              Edit
            </button>
          )}
        </div>

        {myReaction && !isEditing ? (
          <div className="mt-3 rounded-2xl border border-ink-soft/15 bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0 animate-in zoom-in-50 duration-200">{myReaction}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft">You reacted</p>
                {myReply ? (
                  <p className="mt-1 font-hand text-base leading-relaxed text-ink">
                    “{myReply}”
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs italic text-ink-soft/70">No written reply added</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`rounded-2xl border p-2.5 text-2xl transition-all duration-150 ${
                    selectedEmoji === emoji
                      ? "border-accent bg-accent/15 scale-105 shadow-sm"
                      : "border-ink-soft/20 bg-surface hover:border-accent/40 hover:bg-accent/5 opacity-75 hover:opacity-100"
                  }`}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={200}
                placeholder={`Leave a gentle reply to ${partnerName}… (optional)`}
                disabled={busy}
                className="w-full rounded-2xl border border-ink-soft/20 bg-surface px-4 py-2.5 text-sm placeholder:text-ink-soft/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="absolute right-3 top-3 text-[10px] text-ink-soft">
                {replyText.length}/200
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={busy || !selectedEmoji}
                size="sm"
                className="rounded-full bg-accent text-on-accent hover:bg-accent/90"
              >
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {myReaction ? "Update reaction" : "Send reaction"}
              </Button>
              {myReaction && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full text-xs text-ink-soft"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Partner's Reaction Section */}
      <div className="pt-2 border-t border-ink-soft/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {partnerName}'s reaction
        </p>

        {partnerReaction ? (
          <div className="mt-2.5 rounded-2xl border border-accent/20 bg-accent/5 p-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">{partnerReaction}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft">
                  {partnerName} reacted to your answer
                </p>
                {partnerReply ? (
                  <p className="mt-1 font-hand text-base leading-relaxed text-ink">
                    “{partnerReply}”
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs italic text-ink-soft">
            Waiting for {partnerName}'s reaction…
          </p>
        )}
      </div>
    </div>
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
  onUnskip: () => void;
  busy: boolean;
};

function ChallengeCard({
  challenge,
  status,
  showComplete,
  onOpenComplete,
  onCloseComplete,
  onComplete,
  onSkip,
  onUnskip,
}: ChallengeCardProps) {
  const [noteText, setNoteText] = React.useState("");

  return (
    <article className="rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:p-6 transition-all shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-ink-soft/10">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/75">
            Daily Challenge
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Chip in theme accent */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent shadow-2xs capitalize">
            {challenge.category === "affection" ? (
              <Heart className="size-3 text-accent fill-accent/30" />
            ) : challenge.category === "words" ? (
              <MessageSquare className="size-3 text-accent" />
            ) : challenge.category === "play" ? (
              <Sparkles className="size-3 text-accent" />
            ) : challenge.category === "reflection" ? (
              <Compass className="size-3 text-accent" />
            ) : (
              <Gift className="size-3 text-accent" />
            )}
            <span>{challenge.category}</span>
          </div>

          {/* Duration Chip */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-ink-soft/20 bg-page/80 px-2.5 py-1 text-xs font-medium text-ink shadow-2xs">
            <Timer className="size-3 text-accent" />
            <span>{challenge.duration_label}</span>
          </div>
        </div>
      </div>

      <h2 className="mt-4 text-xl font-semibold font-heading">{challenge.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{challenge.body}</p>

      {status.done ? (
        <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-4 sm:p-5 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-xs">
                <Check className="size-4 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Completed for today</p>
                <p className="text-xs text-ink-soft">A shared micro-connection checked off together.</p>
              </div>
            </div>
            <span className="font-hand text-xs text-accent hidden sm:inline-block">moment shared ♡</span>
          </div>
          {status.note && (
            <div className="mt-3 rounded-xl border border-ink-soft/15 bg-page/90 p-3 font-hand text-sm text-ink leading-relaxed">
              “{status.note}”
            </div>
          )}
        </div>
      ) : status.skipped ? (
        <div className="mt-4 rounded-2xl border border-ink-soft/15 bg-page/70 p-4 transition-all">
          <div className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-ink-soft/40" />
            <p className="text-sm text-ink-soft">Taking a breather today. No pressure at all.</p>
          </div>
          <button
            type="button"
            onClick={onUnskip}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline transition-colors cursor-pointer"
          >
            <Zap className="size-3" />
            Actually, I'd like to do this
          </button>
        </div>
      ) : showComplete ? (
        <div className="mt-4 space-y-3 animate-in fade-in duration-200">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a sweet note or photo caption (optional)…"
            rows={2}
            maxLength={300}
            className="resize-none rounded-2xl border-ink-soft/20 bg-page text-sm font-hand"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onComplete(noteText);
                setNoteText("");
              }}
              className="flex-1 rounded-full bg-accent text-on-accent hover:bg-accent/90 cursor-pointer"
            >
              <Check className="size-4" />
              Mark done
            </Button>
            <Button
              variant="outline"
              onClick={onCloseComplete}
              className="rounded-full cursor-pointer"
            >
              Keep for later
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={onOpenComplete}
            className="rounded-full bg-accent text-on-accent hover:bg-accent/90 cursor-pointer"
          >
            <Check className="size-4" />
            Done
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            className="rounded-full text-ink-soft hover:text-ink cursor-pointer"
          >
            Not today
          </Button>
        </div>
      )}
    </article>
  );
}

function NoCoupleNotice() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent/10 text-accent">
        <Heart className="size-7" />
        </div>
        <p className="mt-6 text-sm font-semibold text-ink-soft">A little ritual for two</p>
        <h1 className="mt-2 text-3xl font-semibold">Start with your shared space.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-soft">
          Invite your partner to unlock today's question, challenges and the rest of your shared space.
        </p>
      </div>
      <div className="mt-8">
        <InvitePartnerCard />
      </div>
    </section>
  );
}

function PausedNotice() {
  return (
    <section className="w-full max-w-3xl">
      <h1 className="text-3xl font-semibold">Today</h1>
      <div className="mt-6 rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <PauseCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Daily questions are paused</h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Either partner can turn this shared feature back on anytime in Settings.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
              <Link to="/app/settings" className="inline-flex items-center gap-1.5">
                <span>Manage shared features</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}