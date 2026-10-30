import * as React from "react";
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

  const [optimisticOverrides, setOptimisticOverrides] = React.useState<
    Partial<Record<FeatureKey, { enabled?: boolean; settings?: Partial<FeatureSettings> }>>
  >({});

  const find = (key: FeatureKey) => {
    const original = features.find((item) => item.key === key);
    const override = optimisticOverrides[key];
    if (!original && !override) return undefined;
    return {
      ...(original ?? { key, enabled: true, settings: {} }),
      ...(override?.enabled !== undefined ? { enabled: override.enabled } : {}),
      settings: {
        ...(original?.settings ?? {}),
        ...(override?.settings ?? {}),
      },
    };
  };

  const isEnabled = (key: FeatureKey) => find(key)?.enabled ?? true;
  const isPausedByPartner = (key: FeatureKey) => {
    if (optimisticOverrides[key]?.enabled === true) return false;
    const item = features.find((entry) => entry.key === key);
    return Boolean(item && !item.enabled && item.updated_by && item.updated_by !== currentUserId);
  };
  const canToggleFeature = (key: FeatureKey) => !isPausedByPartner(key);
  const getDepthDial = (): DepthDial => find("daily_question")?.settings.depth_dial ?? "mixed";

  function updateFeature(key: FeatureKey, patch: { enabled?: boolean; settings?: Partial<FeatureSettings> }) {
    if (patch.enabled !== undefined || patch.settings !== undefined) {
      setOptimisticOverrides((prev) => ({
        ...prev,
        [key]: {
          enabled: patch.enabled !== undefined ? patch.enabled : prev[key]?.enabled,
          settings: { ...prev[key]?.settings, ...patch.settings },
        },
      }));
    }
    const change = { features: { [key]: patch } } as SettingsChange;
    save.mutate(
      { change },
      {
        onError: () => {
          setOptimisticOverrides((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        },
        onSettled: () => {
          setOptimisticOverrides((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        },
      },
    );
  }

  const effectiveSettings = features.map((item) => ({
    ...item,
    enabled: optimisticOverrides[item.key]?.enabled ?? item.enabled,
    settings: {
      ...item.settings,
      ...(optimisticOverrides[item.key]?.settings ?? {}),
    },
  }));

  return {
    settings: effectiveSettings,
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
