import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = { email?: unknown };

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  try {
    const supabase = createClient(
      readSecret("SUPABASE_URL"),
      readSecret("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: joinError } = await supabase.rpc("join_waitlist", { p_email: email });
    if (joinError) throw new Error(`Could not save waitlist signup: ${joinError.message}`);

    const { data: claim, error: claimError } = await supabase.rpc(
      "claim_waitlist_confirmation",
      { p_email: email },
    );
    if (claimError) throw new Error(`Could not claim waitlist email: ${claimError.message}`);

    if (!claim?.length) {
      const { data: existingSignup, error: statusError } = await supabase
        .from("waitlist_signups")
        .select("confirmation_sent_at")
        .eq("email", email)
        .maybeSingle();
      if (statusError) throw new Error(`Could not read waitlist email status: ${statusError.message}`);
      if (existingSignup?.confirmation_sent_at) {
        return json({ ok: true, message: "You're already on the waitlist." });
      }
      return json({ error: "Your signup is being processed. Please try again shortly." }, 429);
    }

    const resendApiKey = readSecret("RESEND_API_KEY");
    const fromEmail = readSecret("WAITLIST_FROM_EMAIL");
    const appUrl = Deno.env.get("APP_URL")?.trim() || "https://twologue.app";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "You're on the Twologue waitlist",
        text: [
          "Thanks for joining the Twologue waitlist.",
          "",
          "We'll send you one note when Twologue is ready to try.",
          "",
          `Learn more: ${appUrl}`,
        ].join("\n"),
        html: `<p>Thanks for joining the Twologue waitlist.</p><p>We'll send you one note when Twologue is ready to try.</p><p><a href="${appUrl}">Learn more about Twologue</a></p>`,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      throw new Error(`Email provider rejected the message: ${detail.slice(0, 300)}`);
    }

    const { error: markError } = await supabase.rpc(
      "mark_waitlist_confirmation_sent",
      { p_email: email },
    );
    if (markError) throw new Error(`Email sent but delivery status could not be saved: ${markError.message}`);

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "We couldn't complete your signup. Please try again shortly." }, 502);
  }
});
