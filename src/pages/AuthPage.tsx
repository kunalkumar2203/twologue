import * as React from "react";
import { ArrowLeft, Heart, LoaderCircle, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BRAND } from "@/config/brand";
import { useAuth } from "@/auth/AuthProvider";
import { supabaseConfigured, supabaseSetupMessage } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMMON_TIME_ZONES } from "@/config/time-zones";

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<"signin" | "signup">("signup");
  const [displayName, setDisplayName] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [age, setAge] = React.useState("");
  const [timeZone, setTimeZone] = React.useState(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return COMMON_TIME_ZONES.some((zone) => zone.value === detected) ? detected : "UTC";
  });
  const [signupStep, setSignupStep] = React.useState<1 | 2>(1);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const requestedNext = params.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/app";

  React.useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "signup" && displayName.trim().length < 2) {
      setError("Add a name with at least 2 characters.");
      return;
    }
    if (mode === "signup" && signupStep === 1) {
      setBusy(true);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      setSignupStep(2);
      setBusy(false);
      return;
    }
    if (mode === "signup" && !gender) {
      setError("Choose the option that feels right for you.");
      return;
    }
    const numericAge = Number(age);
    if (mode === "signup" && (!Number.isInteger(numericAge) || numericAge < 16 || numericAge > 120)) {
      setError("Enter an age between 16 and 120.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const signedIn = await signUp(email, password, { displayName, gender, age: numericAge, timeZone }, next);
        if (signedIn) navigate(next, { replace: true });
        else setNotice("Check your inbox to confirm your email, then come back to sign in.");
      } else {
        await signIn(email, password);
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-10 text-ink">
      <section className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="size-4" /> Back to {BRAND.name}
        </Link>

        <div className="mt-7 rounded-3xl border border-ink-soft/20 bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            {mode === "signup" ? <Heart className="size-6" /> : <LockKeyhole className="size-6" />}
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">{BRAND.tagline}</p>
          <h1 className="mt-2 text-3xl font-semibold">{mode === "signup" ? "Make room for us." : "Welcome back."}</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {mode === "signup" ? "Create your account first. You can invite your partner right after." : "Sign in to return to your shared space."}
          </p>

          {!supabaseConfigured ? (
            <div role="alert" className="mt-6 rounded-2xl border border-ink-soft/20 bg-page p-4 text-sm leading-6">
              <p className="font-semibold">Backend setup needed</p>
              <p className="mt-1 text-ink-soft">{supabaseSetupMessage}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && signupStep === 1 && (
                <label className="block space-y-1.5 text-sm font-medium">
                  Your name
                  <Input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="What should your partner call you?" required />
                </label>
              )}
              {(mode === "signin" || signupStep === 1) && (
                <>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Email
                    <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Password
                    <Input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="At least 8 characters" required />
                  </label>
                </>
              )}
              {mode === "signup" && signupStep === 2 && (
                <>
                  <div className="rounded-2xl bg-page p-4 text-sm text-ink-soft">
                    A little more about you helps personalize your shared space.
                  </div>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Gender
                    <select className="flex h-10 w-full rounded-md border border-ink-soft/20 bg-surface px-3 text-sm" value={gender} onChange={(event) => setGender(event.target.value)} required>
                      <option value="">Select an option</option>
                      <option value="woman">Woman</option>
                      <option value="man">Man</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Age
                    <Input type="number" min={16} max={120} value={age} onChange={(event) => setAge(event.target.value)} placeholder="16 or older" required />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Time zone
                    <select
                      className="flex h-10 w-full rounded-md border border-ink-soft/20 bg-surface px-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                      value={timeZone}
                      onChange={(event) => setTimeZone(event.target.value)}
                      required
                    >
                      <option value="" disabled>Select your time zone</option>
                      {COMMON_TIME_ZONES.map((zone) => (
                        <option key={zone.value} value={zone.value}>{zone.label}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
              {notice && <p role="status" className="rounded-xl border border-ink-soft/20 bg-page p-3 text-sm text-ink-soft">{notice}</p>}
              <Button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-accent text-on-accent hover:bg-accent/90">
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {busy ? "One moment…" : mode === "signup" && signupStep === 1 ? "Continue" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              {mode === "signup" && signupStep === 2 && (
                <button type="button" className="w-full text-sm font-medium text-ink-soft underline underline-offset-4" onClick={() => { setSignupStep(1); setError(""); }}>
                  Back
                </button>
              )}
            </form>
          )}

          {supabaseConfigured && (
            <p className="mt-5 text-center text-sm text-ink-soft">
              {mode === "signup" ? "Already have an account?" : "New to Twologue?"}{" "}
              <button type="button" className="font-semibold text-ink underline underline-offset-4" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setSignupStep(1); setError(""); setNotice(""); }}>
                {mode === "signup" ? "Sign in" : "Create account"}
              </button>
            </p>
          )}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-ink-soft">Your account is yours. Shared spaces are limited to two members.</p>
      </section>
    </main>
  );
}
