import * as React from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const url = import.meta.env.VITE_WAITLIST_URL as string | undefined;

    // No endpoint configured — surface an honest error instead of faking success
    if (!url) {
      setStatus("error");
      setMessage(
        "The waitlist isn't connected yet. Please check back soon."
      );
      return;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      setStatus("success");
      setMessage("You're on the list. We'll be in touch.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again in a moment.");
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="waitlist-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage("");
            }
          }}
          disabled={status === "loading"}
          aria-invalid={status === "error"}
          aria-describedby="waitlist-status"
          className={cn(
            "h-11 flex-1 rounded-full",
            status === "error" && "border-destructive"
          )}
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-11 shrink-0 rounded-full"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Joining...
            </>
          ) : (
            "Join the waitlist"
          )}
        </Button>
      </div>

      {message && (
        <p
          id="waitlist-status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-1.5 text-sm",
            status === "success" && "text-foreground",
            status === "error" && "text-destructive"
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
