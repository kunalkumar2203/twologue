import { supabaseForSession, type AuthSession } from "@/lib/supabase";
import { callRpc, errorMessage } from "@/lib/rpc";

export type Occasion = "six_months" | "one_year" | "anniversary" | "custom";
export type Audience = "joint" | "letter";

export type Capsule = {
  id: string;
  title: string;
  audience: Audience;
  occasion: Occasion;
  sealed_on: string;
  unlock_on: string;
  days_left: number;
  is_mine: boolean;
  author_name: string;
  recipient_name: string;
  readable: boolean;
  ready_to_open: boolean;
  body: string | null;
};

export type CapsuleShelf = {
  couple_id: string;
  today: string;
  has_partner: boolean;
  partner_name: string;
  anniversary_date: string | null;
  capsules: Capsule[];
};

export type NewCapsule = {
  title: string;
  body: string;
  audience: Audience;
  occasion: Occasion;
  customDate: string | null;
};

export type UpdateCapsule = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  occasion: Occasion;
  customDate: string | null;
};

const CAPSULE_MESSAGES: Record<string, string> = {
  still_sealed: "This capsule opens on its day. Not yet.",
  capsule_not_found: "That capsule couldn't be found.",
  not_your_capsule: "This letter was written for your partner.",
  letter_needs_partner: "Letters need your partner to be connected first.",
  set_anniversary_first: "Add your anniversary date first to seal something for it.",
  invalid_audience: "Pick together or a letter.",
  invalid_occasion: "Pick when this should open.",
  not_authorized: "Only the author can update or delete this capsule.",
};

export const capsuleMessage = (error: unknown) => errorMessage(error, CAPSULE_MESSAGES);

export const listTimeCapsules = (session: AuthSession) =>
  callRpc<CapsuleShelf | null>(session, "list_time_capsules");

export const createTimeCapsule = (session: AuthSession, input: NewCapsule) =>
  callRpc<string>(session, "create_time_capsule", {
    p_title: input.title,
    p_body: input.body,
    p_audience: input.audience,
    p_occasion: input.occasion,
    p_custom_date: input.customDate,
  });

export const updateTimeCapsule = (session: AuthSession, input: UpdateCapsule) =>
  callRpc<void>(session, "update_time_capsule", {
    p_capsule_id: input.id,
    p_title: input.title,
    p_body: input.body,
    p_audience: input.audience,
    p_occasion: input.occasion,
    p_custom_date: input.customDate,
  });

export const deleteTimeCapsule = (session: AuthSession, capsuleId: string) =>
  callRpc<void>(session, "delete_time_capsule", { p_capsule_id: capsuleId });

export const openTimeCapsule = (session: AuthSession, capsuleId: string) =>
  callRpc<string>(session, "open_time_capsule", { p_capsule_id: capsuleId });

// The anniversary date lives on the couple row, which members can update
export async function setAnniversaryDate(session: AuthSession, coupleId: string, date: string) {
  const { error } = await supabaseForSession(session)
    .from("couples")
    .update({ anniversary_date: date })
    .eq("id", coupleId);
  if (error) throw new Error(error.message);
}