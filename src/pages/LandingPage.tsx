import {
  ArrowDown,
  ArrowRight,
  BookHeart,
  Dices,
  HeartPulse,
  Lock,
  MessageCircleHeart,
  Route,
  Sparkles,
} from "lucide-react";

import { BRAND } from "@/config/brand";
import { RevealWidget } from "@/components/reveal-widget";
import { WaitlistForm } from "@/components/waitlist-form";
import { ThemePicker } from "@/components/theme-picker";
import {
  CheckInDemo,
  GameDemo,
  JournalDemo,
  ProgramDemo,
} from "@/components/feature-demos";

const RITUAL_STEPS = [
  {
    icon: MessageCircleHeart,
    title: "A question a day",
    text: "One gentle prompt lands each morning. Nothing long, nothing heavy.",
  },
  {
    icon: Lock,
    title: "Answer in private",
    text: "Both partners write on their own. No peeking until it's time.",
  },
  {
    icon: Sparkles,
    title: "Reveal together",
    text: "When you both tap reveal, the answers appear side by side.",
  },
];


export default function App() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <Header />
      <main>
        <Hero />
        <AudienceSection />
        <RitualSection />
        <ShowcaseSection />
        <FeatureSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-page/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-heading text-xl font-semibold">
          {BRAND.name}
        </span>
        <ThemePicker />
      </div>
    </header>
  );
}

const OVERVIEW = [
  { icon: MessageCircleHeart, title: "A daily question", text: "One gentle prompt each morning" },
  { icon: BookHeart, title: "A shared journal", text: "Write a page together" },
  { icon: Dices, title: "Gentle games", text: "This-or-that and guessing rounds" },
  { icon: HeartPulse, title: "Check-ins", text: "How the week is really going" },
  { icon: Route, title: "Guided programs", text: "Short paths, one step a day" },
];

const AUDIENCE = [
  { title: "Newer couples", text: "Learn the small things about each other without a formal getting-to-know-you talk." },
  { title: "Together for years", text: "Break out of logistics and rediscover what you each think about, one prompt at a time." },
  { title: "Long distance", text: "Share a daily moment across time zones, even when you can't talk live." },
];

function Hero() {
  return (
    <section className="px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:pt-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="text-center lg:text-left">
          <span className="inline-block text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            {BRAND.tagline}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            A small daily space for the two of you.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-ink-soft sm:text-lg lg:mx-0">
            {BRAND.name} is an app for couples who want to stay close without
            the pressure. A question, a shared journal, gentle games and
            check-ins, in about five minutes a day.
          </p>

          <ul
            aria-label="Who it's for"
            className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start"
          >
            {AUDIENCE.map((a) => (
              <li key={a.title} className="rounded-md bg-surface px-2.5 py-1 text-xs text-ink-soft">
                {a.title}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="#waitlist"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-semibold text-on-accent shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none"
            >
              Join the waitlist
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a
              href="#how"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-page shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:transition-none"
            >
              See how it works
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-5 lg:mr-0">
          <p className="mb-3 text-sm font-semibold text-ink-soft">
            Everything in {BRAND.name}
          </p>
          <ul className="space-y-2">
            {OVERVIEW.map((item, i) => (
              <li
                key={item.title}
                style={{ animationDelay: `${i * 90}ms` }}
                className="flex items-center gap-3 rounded-xl border border-ink-soft/20 bg-page p-3 duration-500 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards motion-reduce:animate-none"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                  <item.icon className="size-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-ink-soft">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-semibold sm:text-2xl">
          Made for two, wherever you are
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-soft sm:text-base">
          Calm, private and never competitive. No streaks, no scores to beat.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {AUDIENCE.map((a) => (
            <div key={a.title} className="rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-5">
              <h3 className="text-base font-semibold">{a.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RitualSection() {
  return (
    <section id="how" className="scroll-mt-20 px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-semibold sm:text-2xl">
          A small ritual, every day
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-soft sm:text-base">
          Three quiet steps that take under five minutes.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {RITUAL_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div className="flex size-12 items-center justify-center rounded-full border">
                <step.icon className="size-5 text-accent" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">
                {step.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-14">
          <h3 className="text-center text-lg font-semibold sm:text-xl">
            Answer privately. Reveal together.
          </h3>
          <p className="mx-auto mb-6 mt-2 max-w-md text-center text-sm text-ink-soft sm:text-base">
            Try it: tap reveal to see how a shared moment lands.
          </p>
          <RevealWidget />
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-semibold sm:text-2xl">
          The daily question is just the start
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-soft sm:text-base">
          Four more ways to stay close. Try them right here.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <JournalDemo />
          <GameDemo />
          <CheckInDemo />
          <ProgramDemo />
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-xl font-semibold sm:text-2xl">
          Why {BRAND.name}
        </h2>

        <div className="mt-8 space-y-6">
          <FeatureItem
            title="Privacy between partners"
            text="Your answer stays hidden until both of you have replied. No one sees your words early, and nothing is shared without both sides saying yes."
          />
          <FeatureItem
            title="Small rituals, not streaks"
            text="There are no breaking streaks or penalties. Just a calm daily question that invites you to check in with each other."
          />
          <FeatureItem
            title="More than questions"
            text="Journaling, games, check-ins and guided programs all follow the same idea: each of you answers privately, then you see it together. Pick what fits your week."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-ink-soft/20 bg-surface p-4 sm:p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft">{text}</p>
    </div>
  );
}

function WaitlistSection() {
  return (
    <section
      id="waitlist"
      className="scroll-mt-20 px-4 py-14 sm:px-6 lg:py-20"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-semibold sm:text-2xl">
          Be first to try it
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft sm:text-base">
          Leave your email and we'll let you know when {BRAND.name} is ready.
          No spam, just one note when the doors open.
        </p>

        <div className="mt-8">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="font-heading text-lg font-semibold">
            {BRAND.name}
          </span>
          <nav className="flex items-center gap-4 text-sm text-ink-soft">
            <a href="#" className="transition-colors hover:text-ink">
              Help
            </a>
            <span aria-hidden="true">·</span>
            <a href="#" className="transition-colors hover:text-ink">
              Privacy
            </a>
          </nav>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft sm:text-left">
          {BRAND.name} is not therapy or a crisis service. If you need urgent
          support, please reach out to a qualified professional in your area.
        </p>

        <p className="mt-4 text-center text-xs text-ink-soft sm:text-left">
          © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}.
        </p>
      </div>
    </footer>
  );
}
