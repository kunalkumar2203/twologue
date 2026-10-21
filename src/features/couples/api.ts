import { supabaseForSession, type AuthSession } from "@/lib/supabase";

export type CoupleStatus = "solo" | "active" | "ended";

export type Couple = {
  id: string;
  status: CoupleStatus;
  partner_1_id: string;
  partner_2_id: string | null;
  paired_at: string | null;
  anchor_time_zone: string | null;
};

export type PartnerProfile = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
};

export type PendingInvite = {
  id: string;
  expires_at: string;
};

export type CoupleData = {
  couple: Couple | null;
  partner: PartnerProfile | null;
  pendingInvite: PendingInvite | null;
};

const INVITATION_MESSAGES: Record<string, string> = {
  invalid_invite: "That invitation is no longer available. Ask your partner to make a new one.",
  own_invite: "That is your own invitation. Share it with your partner instead.",
  already_paired: "You are already connected to someone. Unlink in Settings before joining another space.",
  inviter_unavailable: "That invitation is no longer available. Ask your partner to make a new one.",
  too_many_attempts: "Too many attempts for now. Please try again in a few minutes.",
  no_couple: "Your couple space is not ready yet. Please try again in a moment.",
  already_paired_inviter: "You are already connected. Unlink in Settings before creating another invitation.",
};

export function normalizeInviteCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 10);
}

export function formatInviteCode(value: string) {
  const normalized = normalizeInviteCode(value);
  return normalized.length > 5 ? `${normalized.slice(0, 5)}-${normalized.slice(5)}` : normalized;
}

function errorCode(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export function pairingMessage(errorOrResult: unknown) {
  const code = typeof errorOrResult === "string" ? errorOrResult : errorCode(errorOrResult);
  return INVITATION_MESSAGES[code] ?? "We couldn't complete that invitation. Please try again.";
}

function requireSession(session: AuthSession | null) {
  if (!session) throw new Error("Please sign in again.");
  return session;
}

export async function getMyCouple(session: AuthSession): Promise<CoupleData> {
  const client = supabaseForSession(session);
  const [{ data: couple, error: coupleError }, { data: pendingInvite, error: inviteError }] = await Promise.all([
    client.from("couples").select("id,status,partner_1_id,partner_2_id,paired_at,anchor_time_zone").maybeSingle(),
    client.from("invites").select("id,expires_at").eq("status", "pending").maybeSingle(),
  ]);
  if (coupleError) throw coupleError;
  if (inviteError) throw inviteError;

  const typedCouple = couple as Couple | null;
  if (!typedCouple?.partner_2_id) {
    return { couple: typedCouple, partner: null, pendingInvite: pendingInvite as PendingInvite | null };
  }

  const partnerId = typedCouple.partner_1_id === session.user.id
    ? typedCouple.partner_2_id
    : typedCouple.partner_1_id;
  const { data: partner, error: partnerError } = await client
    .from("profiles")
    .select("id,display_name,avatar_path")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerError) throw partnerError;
  return {
    couple: typedCouple,
    partner: partner as PartnerProfile | null,
    pendingInvite: null,
  };
}

export async function createInvite(session: AuthSession, targetEmail?: string) {
  const { data, error } = await supabaseForSession(requireSession(session)).rpc("create_invite", {
    p_target_email: targetEmail?.trim() || null,
  });
  if (error) throw error;
  return String(data);
}

export async function previewInvite(session: AuthSession, code: string) {
  const { data, error } = await supabaseForSession(requireSession(session)).rpc("preview_invite", { p_code: code });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { is_valid: boolean; inviter_name: string | null; inviter_avatar: string | null };
}

export async function acceptInvite(session: AuthSession, code: string) {
  const { data, error } = await supabaseForSession(requireSession(session)).rpc("accept_invite", { p_code: code });
  if (error) throw error;
  return String(data);
}

export async function cancelInvite(session: AuthSession) {
  const { error } = await supabaseForSession(requireSession(session)).rpc("cancel_invite");
  if (error) throw error;
}

export async function unlinkCouple(session: AuthSession) {
  const { error } = await supabaseForSession(requireSession(session)).rpc("unlink_couple");
  if (error) throw error;
}
