import { MessageCircleHeart, Lock, Sparkles } from "lucide-react";

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
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main>
        <Hero />
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
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-heading text-xl font-semibold">
          {BRAND.name}
        </span>
        <ThemePicker />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:pt-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">
            {BRAND.tagline}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Answer privately.
            <br />
            Reveal together.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
            {BRAND.name} is a small daily ritual for two. One question, two
            private answers, one shared moment.
          </p>
        </div>

        <div className="mt-10 sm:mt-14">
          <RevealWidget />
        </div>

        <div className="mt-10 text-center">
          <a
            href="#waitlist"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </section>
  );
}

function RitualSection() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-semibold sm:text-2xl">
          A small ritual, every day
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground sm:text-base">
          Three quiet steps that take under five minutes.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {RITUAL_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div className="flex size-12 items-center justify-center rounded-full border">
                <step.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {step.text}
              </p>
            </div>
          ))}
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
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground sm:text-base">
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
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
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
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
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
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">
              Help
            </a>
            <span aria-hidden="true">·</span>
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy
            </a>
          </nav>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground sm:text-left">
          {BRAND.name} is not therapy or a crisis service. If you need urgent
          support, please reach out to a qualified professional in your area.
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}.
        </p>
      </div>
    </footer>
  );
}
