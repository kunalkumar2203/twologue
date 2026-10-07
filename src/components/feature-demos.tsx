import * as React from "react";
import {
  BookHeart,
  Check,
  Dices,
  HeartPulse,
  Lock,
  Route,
  type LucideIcon,
} from "lucide-react";
 
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
 
/* Fires once when the element scrolls into view. Skips straight to "seen"
   for reduced-motion users or browsers without IntersectionObserver. */
function useInView<T extends Element>() {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
 
  React.useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce || !("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
 
  return { ref, seen };
}

function DemoCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      <div className="mt-5 flex-1 rounded-2xl border bg-background p-4">
        {children}
      </div>
    </div>
  );
}

/* ---------- Shared journal ---------- */
 
const JOURNAL_LINES = [
  { who: "You", text: "The coast was colder than we planned for." },
  { who: "Them", text: "But the chips on the sea wall were worth it." },
  { who: "You", text: "Let's go back when it's warm. Same bench." },
];
 
export function JournalDemo() {
  const { ref, seen } = useInView<HTMLDivElement>();
  return (
    <DemoCard
      icon={BookHeart}
      title="A journal you write together"
      text="Take turns adding a line to a shared page. Every entry becomes a small keepsake you can reread."
    >
      <div ref={ref}>
        <p className="mb-3 text-xs text-muted-foreground">Our weekend away</p>
        <ul className="space-y-2.5">
          {JOURNAL_LINES.map((line, i) => (
            <li
              key={i}
              style={{ transitionDelay: `${i * 450}ms` }}
              className={cn(
                "flex gap-2 transition-all duration-500 motion-reduce:transition-none",
                seen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              )}
            >
              <span className="w-9 shrink-0 pt-0.5 text-xs font-semibold text-muted-foreground">
                {line.who}
              </span>
              <span className="font-hand text-base leading-snug">
                {line.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DemoCard>
  );
}
 
/* ---------- Gentle games ---------- */
 
const ROUNDS = [
  { q: "Sunday plans?", options: ["Slow breakfast", "Long walk"], them: 0 },
  { q: "Holiday style?", options: ["Beach", "Mountains"], them: 1 },
  { q: "Movie night?", options: ["Rewatch a favourite", "Try something new"], them: 1 },
];
 
export function GameDemo() {
  const [round, setRound] = React.useState(0);
  const [pick, setPick] = React.useState<number | null>(null);
  const r = ROUNDS[round];
  const done = pick !== null;
  const match = done && pick === r.them;
 
  const next = () => {
    setPick(null);
    setRound((round + 1) % ROUNDS.length);
  };
 
  return (
    <DemoCard
      icon={Dices}
      title="Games that stay gentle"
      text="Quick this-or-that rounds. Both of you choose in private, then see where you land together."
    >
      <p className="text-sm font-semibold">{r.q}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {r.options.map((opt, i) => {
          const isYou = pick === i;
          const isThem = done && r.them === i;
          return (
            <button
              key={opt}
              type="button"
              disabled={done}
              aria-pressed={isYou}
              onClick={() => setPick(i)}
              className={cn(
                "rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/60 disabled:cursor-default disabled:hover:border-border",
                (isYou || isThem) && "border-primary/50 bg-card"
              )}
            >
              <span className="block font-medium">{opt}</span>
              <span className="mt-1 block min-h-4 text-xs text-muted-foreground">
                {isYou && isThem && "You both"}
                {isYou && !isThem && "You"}
                {!isYou && isThem && "Them"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {!done && "Pick one. They've already chosen."}
          {done && match && "Same pick. That's a good sign."}
          {done && !match && "Different picks. Worth a chat."}
        </p>
        {done && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={next}>
            Next round
          </Button>
        )}
      </div>
    </DemoCard>
  );
}
 
/* ---------- Check-ins ---------- */
 
const MOODS = ["Drained", "Okay", "Good", "Great"];
 
export function CheckInDemo() {
  const [mood, setMood] = React.useState<number | null>(null);
 
  return (
    <DemoCard
      icon={HeartPulse}
      title="Check-ins that actually check in"
      text="Share how the week is going in one tap. Add a note if you want, or leave it at the mood."
    >
      <p className="text-sm font-semibold">How's your week feeling?</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Your mood">
        {MOODS.map((m, i) => (
          <button
            key={m}
            type="button"
            aria-pressed={mood === i}
            onClick={() => setMood(i)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm transition-colors hover:border-primary/60",
              mood === i && "border-primary bg-primary text-primary-foreground hover:border-primary"
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-14" aria-live="polite">
        {mood === null ? (
          <p className="text-xs text-muted-foreground">
            Their check-in appears once you've shared yours.
          </p>
        ) : (
          <div className="animate-in fade-in duration-300 motion-reduce:animate-none">
            <p className="text-sm">
              <span className="font-semibold">Them:</span> Okay.{" "}
              <span className="font-hand text-base">Long day, quiet night please.</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {mood <= 1
                ? "You're both running low. Maybe an early night."
                : "You're in a good place. Ask how their day went."}
            </p>
          </div>
        )}
      </div>
    </DemoCard>
  );
}
 
/* ---------- Guided programs ---------- */
 
const DAYS = [
  { title: "Notice", prompt: "What did your partner do today that you didn't thank them for?" },
  { title: "Ask", prompt: "What's one thing you wish I asked about more often?" },
  { title: "Listen", prompt: "Tell me about a day this month that felt heavy." },
  { title: "Share", prompt: "Which small habit of ours would you keep forever?" },
  { title: "Plan", prompt: "What's one thing we should do together this month?" },
  { title: "Thank", prompt: "Name three things you're grateful for about us." },
  { title: "Look ahead", prompt: "What would make next week feel good for both of us?" },
];
const TODAY = 2; // index of the current day in the demo
 
export function ProgramDemo() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const [selected, setSelected] = React.useState(TODAY);
 
  return (
    <DemoCard
      icon={Route}
      title="Guided programs"
      text="Short paths like “Seven days of listening”. One step a day, opening at a pace that suits you both."
    >
      <div ref={ref}>
        <p className="text-xs text-muted-foreground">Seven days of listening</p>
        <div className="relative mt-3">
          <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
          <div
            className="absolute left-4 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-[width] duration-1000 ease-out motion-reduce:transition-none"
            style={{ width: seen ? `calc((100% - 2rem) * ${TODAY / (DAYS.length - 1)})` : 0 }}
          />
          <div className="relative flex justify-between">
            {DAYS.map((d, i) => {
              const locked = i > TODAY;
              return (
                <button
                  key={d.title}
                  type="button"
                  disabled={locked}
                  aria-label={`Day ${i + 1}: ${d.title}${locked ? " (not open yet)" : ""}`}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border bg-background text-xs transition-colors",
                    i < TODAY && "border-primary bg-primary text-primary-foreground",
                    selected === i && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    locked && "text-muted-foreground"
                  )}
                >
                  {i < TODAY ? <Check className="size-3.5" /> : locked ? <Lock className="size-3" /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4" aria-live="polite">
          <p className="text-sm font-semibold">
            Day {selected + 1}: {DAYS[selected].title}
          </p>
          <p className="mt-1 font-hand text-base leading-snug">{DAYS[selected].prompt}</p>
        </div>
      </div>
    </DemoCard>
  );
}
