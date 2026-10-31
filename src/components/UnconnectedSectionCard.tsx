import { Link } from "react-router";
import { type LucideIcon, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoupleStatus } from "@/features/couples/hooks";

export type FeatureHighlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export interface UnconnectedSectionCardProps {
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights?: FeatureHighlight[];
  hasPendingInvite?: boolean;
}

export default function UnconnectedSectionCard({
  badge,
  title,
  description,
  icon: MainIcon,
  highlights = [],
  hasPendingInvite: propHasPendingInvite,
}: UnconnectedSectionCardProps) {
  const coupleStatus = propHasPendingInvite === undefined ? useCoupleStatus() : null;
  const hasPendingInvite = propHasPendingInvite ?? coupleStatus?.hasPendingInvite ?? false;

  return (
    <section className="mx-auto my-auto flex w-full max-w-xl flex-col animate-in fade-in duration-300">
      <div className="rounded-3xl border border-ink-soft/20 bg-surface p-5 sm:px-6 sm:py-5 shadow-xs">
        {/* Top Header & Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent sm:size-11">
            <MainIcon className="size-5" />
          </div>

          <div className="mt-2 inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            <span>{badge}</span>
          </div>

          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl font-heading text-ink">
            {title}
          </h2>

          <p className="mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        </div>

        {/* Feature Highlights (What unlocks when connected) */}
        {highlights.length > 0 && (
          <div className="mt-3.5 space-y-2 border-t border-ink-soft/10 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              What unlocks with your partner
            </p>
            <div className="grid gap-2">
              {highlights.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 rounded-xl border border-ink-soft/15 bg-page/60 px-3.5 py-2 sm:px-4 sm:py-2"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <ItemIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink leading-snug">{item.title}</p>
                      <p className="text-xs sm:text-[13px] text-ink-soft leading-snug mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Call to Action */}
        <div className="mt-3.5 flex flex-col items-center text-center border-t border-ink-soft/10 pt-3">
          <p className="text-xs text-ink-soft mb-2.5">
            {hasPendingInvite
              ? "Your invitation is waiting to be accepted. Share your link to unlock this space."
              : "Connect with your partner to start your shared experience."}
          </p>

          <Button asChild className="rounded-full bg-accent text-on-accent hover:bg-accent/90 shadow-2xs h-9.5 sm:h-10 px-6 text-sm font-medium">
            <Link to="/app" className="inline-flex items-center gap-2">
              <UserPlus className="size-4" />
              <span>{hasPendingInvite ? "View invitation link" : "Create invitation"}</span>
              <ArrowRight className="size-3.5 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
