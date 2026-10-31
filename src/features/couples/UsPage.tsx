import * as React from "react";
import { useLocation } from "react-router";
import { HeartHandshake, Hourglass, MessageCircleHeart, Zap } from "lucide-react";
import UnconnectedSectionCard from "@/components/UnconnectedSectionCard";
import TimeCapsuleSection from "@/features/capsules/TimeCapsuleSection";
import DailyAnswersHistory from "@/features/journal/DailyAnswersHistory";
import InvitePartnerCard from "./InvitePartnerCard";
import ChallengeHistory from "../challenges/ChallengeHistory";
import { useCoupleStatus } from "./hooks";

export default function UsPage() {
  const { isPaired, isLoading, hasPendingInvite } = useCoupleStatus();
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  if (!isLoading && !isPaired) {
    return (
      <UnconnectedSectionCard
        badge="Us, Together"
        icon={HeartHandshake}
        hasPendingInvite={hasPendingInvite}
        title="Your shared sanctuary."
        description="Where your history as a couple will live: time capsules, memories of revealed daily questions, and shared moments."
        highlights={[
          {
            icon: Hourglass,
            title: "Time capsules",
            description: "Seal notes today that unlock on future anniversaries.",
          },
          {
            icon: MessageCircleHeart,
            title: "Revealed answers archive",
            description: "Revisit daily questions you and your partner answered together.",
          },
          {
            icon: Zap,
            title: "Shared challenges history",
            description: "Look back on connection rituals completed together.",
          },
        ]}
      />
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-8 pb-12">
      <div>
        <p className="text-sm font-medium text-ink-soft">Your shared space</p>
        <h1 className="mt-1 text-3xl font-semibold">Us, together</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
          A calm place to check in, invite or connect with your partner, and look back on your shared moments.
        </p>
      </div>

      <div>
        <InvitePartnerCard />
      </div>

      <hr className="border-ink-soft/10" />

      <TimeCapsuleSection />

      <hr className="border-ink-soft/10" />

      <section id="answers" className="scroll-mt-8">
        <DailyAnswersHistory />
      </section>

      <hr className="border-ink-soft/10" />

      <div id="challenges" className="scroll-mt-8">
        <ChallengeHistory />
      </div>
    </section>
  );
}