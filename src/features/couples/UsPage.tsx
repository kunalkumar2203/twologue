import InvitePartnerCard from "./InvitePartnerCard";
import ChallengeHistory from "../challenges/ChallengeHistory";

export default function UsPage() {
  return (
    <section className="w-full max-w-3xl space-y-8 pb-12">
      <div>
        <p className="text-sm font-medium text-ink-soft">Your shared space</p>
        <h1 className="mt-1 text-3xl font-semibold">Us, together</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
          A calm place to check in, invite or connect with your partner, and look back on your shared moments.
        </p>
      </div>

      {/* Partner Connection / Invite Area */}
      <div>
        <InvitePartnerCard />
      </div>

      <hr className="border-ink-soft/10" />

      {/* Shared Challenge History from couple_content_history */}
      <div>
        <ChallengeHistory />
      </div>
    </section>
  );
}
