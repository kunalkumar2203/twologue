import * as React from "react";
import { Heart, Lock, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PARTNER_A = {
  name: "You",
  answer: "That hike in the rain where we laughed the whole way.",
};

const PARTNER_B = {
  name: "Them",
  answer: "The morning you brought me coffee without asking.",
};

type Partner = (typeof PARTNER_A | typeof PARTNER_B) & {
  hidden: boolean;
};

export function RevealWidget() {
  const [revealed, setRevealed] = React.useState(false);
  const [reducesMotion, setReducesMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducesMotion(mq.matches);
    const handler = () => setReducesMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleReveal = () => setRevealed(true);
  const handleReset = () => setRevealed(false);

  const partners: Partner[] = [
    { ...PARTNER_A, hidden: !revealed },
    { ...PARTNER_B, hidden: !revealed },
  ];

  return (
    <div
      className="mx-auto w-full max-w-lg rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-6"
      role="group"
      aria-label="Paired response demo"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-soft">
          Today's question
        </p>
        <span className="text-xs text-ink-soft">
          A moment you felt closest
        </span>
      </div>

      <p className="mb-5 text-lg font-semibold sm:text-xl">
        What's a small moment when you felt most connected?
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {partners.map((partner, i) => (
          <AnswerCard
            key={i}
            name={partner.name}
            answer={partner.answer}
            hidden={partner.hidden}
            reducesMotion={reducesMotion}
            delay={i * 120}
          />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        {revealed ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleReset}
          >
            Try again
          </Button>
        ) : (
          <Button
            size="sm"
            className="rounded-full bg-accent text-on-accent shadow-sm hover:bg-accent/90"
            onClick={handleReveal}
          >
            <Heart className="size-4" />
            Reveal together
          </Button>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink-soft">
        Both answers stay hidden until you both tap reveal.
      </p>
    </div>
  );
}

function AnswerCard({
  name,
  answer,
  hidden,
  reducesMotion,
  delay,
}: {
  name: string;
  answer: string;
  hidden: boolean;
  reducesMotion: boolean;
  delay: number;
}) {
  // Reduced-motion: no flip, just fade the answer in
  if (reducesMotion) {
    return (
      <div className="rounded-2xl border border-ink-soft/20 bg-page p-4">
        <p className="mb-2 text-sm font-semibold">{name}</p>
        {hidden ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Lock className="size-3.5" />
            Hidden until revealed
          </p>
        ) : (
          <p className="font-hand text-base text-ink">{answer}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="group relative h-32 [perspective:800px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d]",
          hidden ? "[transform:rotateY(0deg)]" : "[transform:rotateY(180deg)]"
        )}
      >
        {/* Back of card (hidden state) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-ink-soft/20 bg-page p-4 [backface-visibility:hidden]">
          <Lock className="size-5 text-ink-soft" />
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-ink-soft">Hidden until revealed</p>
        </div>

        {/* Front of card (revealed state) */}
        <div className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-accent/30 bg-page p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Eye className="size-3.5 text-accent" />
            <p className="text-sm font-semibold">{name}</p>
          </div>
          <p className="font-hand text-base leading-snug text-ink">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
