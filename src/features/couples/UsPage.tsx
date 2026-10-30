import * as React from "react";
import { useLocation } from "react-router";
import TimeCapsuleSection from "@/features/capsules/TimeCapsuleSection";
import DailyAnswersHistory from "@/features/journal/DailyAnswersHistory";
import InvitePartnerCard from "./InvitePartnerCard";
import ChallengeHistory from "../challenges/ChallengeHistory";

export default function UsPage() {
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