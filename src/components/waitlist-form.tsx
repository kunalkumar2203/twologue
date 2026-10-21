import * as React from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

type WaitlistResponse = { ok?: boolean; message?: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState(""); // for basic bot filtering.
  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, "");
    const publicKey = (
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
    )?.trim();
    const configuredUrl = (import.meta.env.VITE_WAITLIST_URL as string | undefined)?.trim();
    const usesRpc = !configuredUrl;
    const endpoint = configuredUrl || (supabaseUrl ? `${supabaseUrl}/rest/v1/rpc/join_waitlist` : "");

    if (!endpoint || !publicKey) {
      setStatus("error");
      setMessage("The waitlist isn't connected yet. Please try again later.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publicKey,
          Authorization: `Bearer ${publicKey}`,
        },
        body: JSON.stringify(usesRpc ? { p_email: normalizedEmail } : { email: normalizedEmail, website }),
      });

      const payload = (await response.json().catch(() => ({}))) as WaitlistResponse;
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || payload.error || "Couldn't submit your email.");
      }

      setStatus("success");
      setMessage("You're on the list. We'll let you know when Twologue is ready.");
      setEmail("");
      setWebsite("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error && error.message && !error.message.includes("Failed to fetch")
          ? error.message
          : "Something went wrong. Please try again in a moment.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-3"
      noValidate
    >
      <label htmlFor="waitlist-email" className="sr-only">
        Email address
      </label>

      {/* Hidden from people; bots that fill every field are ignored server-side. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="waitlist-website">Leave this field empty</label>
        <input
          id="waitlist-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="waitlist-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage("");
            }
          }}
          disabled={status === "loading"}
          aria-invalid={status === "error"}
          aria-describedby="waitlist-status"
          className={cn("h-11 flex-1 rounded-full", status === "error" && "border-destructive")}
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="group relative h-11 shrink-0 cursor-pointer rounded-full bg-accent text-on-accent shadow-sm transition-[background-color,color,box-shadow] duration-300 hover:bg-ink hover:text-page hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-ink active:text-page motion-reduce:transition-none"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <span>Join the waitlist</span>
              <span className="relative flex size-4 items-center justify-center" aria-hidden="true">
                <ArrowRight className="size-4" />
              </span>
            </>
          )}
        </Button>
      </div>

      {message && (
        <p
          id="waitlist-status"
          aria-live="polite"
          role={status === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center gap-1.5 text-sm",
            status === "success" && "text-ink",
            status === "error" && "text-destructive",
          )}
        >
          {status === "success" && <CheckCircle2 className="size-4" />}
          {status === "error" && <AlertCircle className="size-4" />}
          {message}
        </p>
      )}
    </form>
  );
}
