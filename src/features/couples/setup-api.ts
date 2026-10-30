import { callRpc, errorMessage } from "@/lib/rpc";
import type { AuthSession } from "@/lib/supabase";

export type FeatureKey =
  | "daily_question"
  | "appreciation_notes"
  | "micro_challenges"
  | "mood"
  | "journal"
  | "story"
  | "time_capsule";

export type DepthDial = "light" | "mixed" | "deep";

export type RelationshipStage = "just_started" | "few_years" | "many_years";

export type FeatureSettings = {
  depth_dial?: DepthDial;
  spicy?: boolean;
  disabled_categories?: string[];
};

export type CoupleFeature = {
  key: FeatureKey;
  name: string;
  enabled: boolean;
  settings: FeatureSettings;
  updated_by: string | null;
};

export type CoupleSettings = {
  anchor_time_zone: string;
  is_long_distance: boolean;
  relationship_stage: RelationshipStage | null;
  has_children: boolean | null;
  is_married: boolean | null;
  anniversary_date: string | null;
};

export type CoupleSetup = {
  couple_id: string;
  status: "solo" | "active" | "ended";
  is_setup_owner: boolean;
  setup_completed: boolean;
  me: { name: string; time_zone: string | null };
  partner: { name: string; time_zone: string | null } | null;
  settings: CoupleSettings;
  features: CoupleFeature[];
};

// What can be saved. Leave a key out to keep its current value. Send null to clear it.
export type SettingsChange = {
  settings?: Partial<CoupleSettings>;
  features?: Partial<Record<FeatureKey, { enabled?: boolean; settings?: Partial<FeatureSettings> }>>;
};

const SETUP_MESSAGES: Record<string, string> = {
  paused_by_partner: "Your partner paused this. Only they can switch it back on.",
  setup_owner_only: "The person who sent the invitation finishes the setup. You can change everything in Settings.",
  invalid_time_zone: "That time zone isn't recognised. Please pick one from the list.",
  invalid_stage: "Please pick one of the options for how long you've been together.",
  unknown_feature: "That switch isn't available yet.",
  no_couple: "Your shared space isn't ready yet. Please try again in a moment.",
};

export const setupMessage = (error: unknown) => errorMessage(error, SETUP_MESSAGES);

export const getCoupleSetup = (session: AuthSession) =>
  callRpc<CoupleSetup | null>(session, "get_couple_setup");

export const saveCoupleSettings = (session: AuthSession, change: SettingsChange, complete = false) =>
  callRpc<void>(session, "save_couple_settings", {
    p_settings: { ...change.settings, features: change.features ?? {} },
    p_complete: complete,
  });
