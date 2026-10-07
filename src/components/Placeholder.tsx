// Stand-in screen until the real feature is built
export default function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section className="w-full max-w-3xl">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-ink-soft">{blurb}</p>
    </section>
  );
}