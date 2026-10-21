import InvitePartnerCard from "./InvitePartnerCard";

export default function InvitePartnerPage() {
  return (
    <section className="w-full max-w-3xl">
      <p className="text-sm font-medium text-ink-soft">Your shared space</p>
      <h1 className="mt-1 text-3xl font-semibold">Us, together</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
        Twologue gives the two of you a calm place to share small moments, at your own pace.
      </p>
      <div className="mt-7"><InvitePartnerCard /></div>
    </section>
  );
}
