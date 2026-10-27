import {
  SlidersHorizontal,
  HelpCircle,
  Heart,
  Zap,
  LoaderCircle,
  Lock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  useSharedFeatures,
  FEATURE_INFO,
  type DepthDial,
} from "./useSharedFeatures";

const DEPTH_OPTIONS: { value: DepthDial; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Playful & casual" },
  { value: "mixed", label: "Mixed", hint: "Everyday balance" },
  { value: "deep", label: "Deep", hint: "Vulnerable & intimate" },
];

export function SharedFeatureSettings() {
  const {
    settings,
    setFeature,
    setDepthDial,
    canToggleFeature,
    isPausedByPartner,
    loading,
    saving,
    error,
    notice,
    partnerName,
  } = useSharedFeatures();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "HelpCircle":
        return <HelpCircle className="size-5" />;
      case "Heart":
        return <Heart className="size-5" />;
      case "Zap":
        return <Zap className="size-5" />;
      default:
        return <SlidersHorizontal className="size-5" />;
    }
  };

  return (
    <section className="mt-10 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <SlidersHorizontal className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Shared features</h2>
          <p className="text-sm text-ink-soft">
            Switches apply to both partners. Paused features can only be re-enabled by whoever paused them.
          </p>
        </div>
      </div>

      {/* Error or Notice Alert */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300 animate-in fade-in"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-accent animate-in fade-in"
        >
          {notice}
        </p>
      )}

      {/* Feature Cards List */}
      {loading ? (
        <p className="flex items-center gap-2 py-4 text-sm text-ink-soft">
          <LoaderCircle className="size-4 animate-spin text-accent" /> Loading shared settings…
        </p>
      ) : (
        <div className="space-y-3">
          {FEATURE_INFO.map((feature) => {
            const setting = settings.find((item) => item.feature_key === feature.key);
            const isEnabled = setting ? setting.enabled : true;
            const isSavingThis = saving === feature.key;
            const pausedByPartner = isPausedByPartner(feature.key);
            const canToggle = canToggleFeature(feature.key);

            return (
              <div
                key={feature.key}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isEnabled
                    ? "border-ink-soft/20 bg-surface shadow-2xs"
                    : "border-ink-soft/10 bg-surface/50 opacity-80"
                }`}
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isEnabled
                          ? "bg-accent/15 text-accent"
                          : "bg-ink-soft/10 text-ink-soft"
                      }`}
                    >
                      {getIcon(feature.iconName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink text-base">{feature.label}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                            isEnabled
                              ? "bg-accent/15 text-accent border border-accent/30"
                              : pausedByPartner
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              : "bg-ink-soft/15 text-ink-soft border border-ink-soft/20"
                          }`}
                        >
                          {isEnabled
                            ? "Active for both"
                            : pausedByPartner
                            ? `Paused by ${partnerName}`
                            : "Paused by you"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm leading-5 text-ink-soft">
                        {feature.detail}
                      </p>

                      {/* Daily Question Depth Dial Sub-Selector */}
                      {feature.key === "daily_question" && isEnabled && (
                        <div className="mt-3.5 pt-3 border-t border-ink-soft/10">
                          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                            Depth Level
                          </p>
                          <div
                            className="flex flex-wrap gap-1.5"
                            aria-label="Daily question depth selection"
                          >
                            {DEPTH_OPTIONS.map((option) => {
                              const currentDepth = setting?.settings?.depth_dial ?? "mixed";
                              const selected = currentDepth === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  disabled={saving !== null}
                                  onClick={() => void setDepthDial(option.value)}
                                  aria-pressed={selected}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                                    selected
                                      ? "border-accent bg-accent text-on-accent shadow-2xs"
                                      : "border-ink-soft/20 bg-page/60 text-ink-soft hover:border-accent/40 hover:text-ink"
                                  }`}
                                  title={option.hint}
                                >
                                  <span>{option.label}</span>
                                  <span className="text-[10px] opacity-75 hidden sm:inline">
                                    · {option.hint}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* On/Off Switch + Spinner */}
                  <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-ink-soft/10 sm:border-0">
                    <span className="text-xs font-medium text-ink-soft">
                      {isEnabled ? "On" : pausedByPartner ? "Off (Locked)" : "Off"}
                    </span>
                    <div className="flex items-center gap-2">
                      {isSavingThis && (
                        <LoaderCircle className="size-4 animate-spin text-accent" />
                      )}
                      {pausedByPartner && (
                        <span
                          className="inline-flex size-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          title={`Only ${partnerName} can turn this back on`}
                        >
                          <Lock className="size-3.5" />
                        </span>
                      )}
                      <Switch
                        checked={isEnabled}
                        disabled={saving !== null || !canToggle}
                        onCheckedChange={(checked) => void setFeature(feature.key, checked)}
                        aria-label={`Toggle ${feature.label} shared feature`}
                        title={
                          pausedByPartner
                            ? `Paused by ${partnerName}. Only ${partnerName} can turn this back on.`
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
