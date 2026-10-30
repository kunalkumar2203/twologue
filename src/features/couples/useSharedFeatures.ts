import { useAuth } from "@/auth/AuthProvider";
import {
  setupMessage,
  type CoupleFeature,
  type DepthDial,
  type FeatureKey,
  type FeatureSettings,
  type SettingsChange,
} from "./setup-api";
import { useCoupleSetup, useSaveCoupleSettings } from "./setup-hooks";

export type { DepthDial, FeatureKey, FeatureSettings };
export type FeatureSetting = CoupleFeature;

// The couple's shared switches. Reads and writes go straight to the database,
// so both partners always see the same state.
export function useSharedFeatures() {
  const { session } = useAuth();
  const setup = useCoupleSetup();
  const save = useSaveCoupleSettings();
  const currentUserId = session?.user.id ?? null;
  const features = setup.data?.features ?? [];

  const find = (key: FeatureKey) => features.find((item) => item.key === key);
  const isEnabled = (key: FeatureKey) => find(key)?.enabled ?? true;
  const isPausedByPartner = (key: FeatureKey) => {
    const item = find(key);
    return Boolean(item && !item.enabled && item.updated_by && item.updated_by !== currentUserId);
  };
  const canToggleFeature = (key: FeatureKey) => !isPausedByPartner(key);
  const getDepthDial = (): DepthDial => find("daily_question")?.settings.depth_dial ?? "mixed";

  function updateFeature(key: FeatureKey, patch: { enabled?: boolean; settings?: Partial<FeatureSettings> }) {
    const change = { features: { [key]: patch } } as SettingsChange;
    save.mutate({ change });
  }

  return {
    settings: features,
    isEnabled,
    isPausedByPartner,
    canToggleFeature,
    setFeature: (key: FeatureKey, enabled: boolean) => updateFeature(key, { enabled }),
    updateFeature,
    setDepthDial: (value: DepthDial) => updateFeature("daily_question", { settings: { depth_dial: value } }),
    getDepthDial,
    loading: setup.isLoading,
    saving: save.isPending,
    error: save.isError ? setupMessage(save.error) : setup.isError ? setupMessage(setup.error) : "",
    notice: save.isSuccess ? "Saved. Your partner sees this too." : "",
    partnerName: setup.data?.partner?.name ?? "Partner",
    isPaired: Boolean(setup.data?.partner),
    coupleId: setup.data?.couple_id ?? null,
    currentUserId,
    reload: () => setup.refetch(),
  };
}
