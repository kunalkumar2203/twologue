import { Link } from "react-router";
import {
  NotebookPen,
  Gamepad2,
  Sprout,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComingSoonProps {
  title?: string;
  blurb?: string;
  section?: string;
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  journal: NotebookPen,
  play: Gamepad2,
  grow: Sprout,
};

export default function ComingSoon({
  title = "Coming Soon",
  blurb,
  section,
}: ComingSoonProps) {
  const normalizedKey = (section || title).toLowerCase();
  const IconComponent = SECTION_ICONS[normalizedKey] ?? Sparkles;

  return (
    <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-16 sm:py-24 text-center animate-in fade-in duration-300">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-ink-soft/15 bg-surface text-accent shadow-xs sm:size-16">
        <IconComponent className="size-6 sm:size-7" />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
        Coming Soon
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight font-heading sm:text-4xl text-ink">
        {title}
      </h1>

      {blurb && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft sm:text-base">
          {blurb}
        </p>
      )}

      <p className="mt-4 font-hand text-base text-accent">
        Crafted with care for two ♡
      </p>

      <Button asChild variant="outline" className="mt-8 rounded-full">
        <Link to="/app">Back to Today</Link>
      </Button>
    </section>
  );
}
