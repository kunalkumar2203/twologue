import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSharedFeatures } from "./useSharedFeatures";
import type { DepthDial, FeatureKey } from "./setup-api";

const GROUPS: { title: string; items: { key: FeatureKey; label: string; detail: string }[] }[] = [
  {
    title: "Daily connection",
    items: [
      { key: "daily_question", label: "Daily question", detail: "One shared question a day. Answers stay hidden until you both reveal." },
      { key: "micro_challenges", label: "Daily challenge", detail: "A two-minute invitation to connect, different every day." },
      { key: "appreciation_notes", label: "Appreciation notes", detail: "Short thank-you notes to send and reread together." },
      { key: "mood", label: "Emotional weather", detail: "A quick, private check-in on how the day feels." },
    ],
  },
  {
    title: "Journal and stories",
    items: [
      { key: "journal", label: "Write together", detail: "Shared prompts that stay private until you've both written." },
      { key: "story", label: "Stories", detail: "A story you write one paragraph at a time." },
      { key: "time_capsule", label: "Time capsules", detail: "Letters sealed until a day you choose." },
    ],
  },
];

const DEPTHS: { value: DepthDial; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "mixed", label: "Mixed" },
  { value: "deep", label: "Deep" },
];

const CATEGORIES = ["affection", "words", "play", "reflection", "service"];

export function SharedFeatureSettings() {
  const { settings, isEnabled, isPausedByPartner, canToggleFeature, updateFeature, setFeature, setDepthDial, getDepthDial, loading, saving, error, notice, partnerName } =
    useSharedFeatures();

  const challenge = settings.find((item) => item.key === "micro_challenges")?.settings ?? {};
  const disabledCategories = challenge.disabled_categories ?? [];

  function toggleCategory(category: string) {
    const next = disabledCategories.includes(category)
      ? disabledCategories.filter((item) => item !== category)
      : [...disabledCategories, category];
    updateFeature("micro_challenges", { settings: { disabled_categories: next } });
  }

  return (
    <section className="mt-10 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Shared features</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Switches apply to both of you. A paused feature can only be switched back on by whoever paused it.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-accent">{notice}</p>}
      {loading && <p className="text-sm text-ink-soft">Loading shared switches…</p>}

      {!loading && GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          <h3 className="text-sm font-medium text-ink-soft">{group.title}</h3>
          {group.items.map((item) => {
            const enabled = isEnabled(item.key);
            const paused = isPausedByPartner(item.key);
            const row = settings.find((entry) => entry.key === item.key);
            return (
              <div
                key={item.key}
                className={cn(
                  "rounded-2xl border p-4 sm:p-5",
                  enabled ? "border-ink-soft/20 bg-surface" : "border-ink-soft/10 bg-surface/50",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.label}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          enabled
                            ? "bg-accent/15 text-accent"
                            : paused
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-ink-soft/15 text-ink-soft",
                        )}
                      >
                        {enabled ? "On for both" : paused ? `Paused by ${partnerName}` : "Off"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-ink-soft">{item.detail}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={saving || !canToggleFeature(item.key)}
                    onCheckedChange={(checked) => setFeature(item.key, checked)}
                    aria-label={`Turn ${item.label} on or off`}
                  />
                </div>

                {item.key === "daily_question" && enabled && (
                  <div className="mt-4 border-t border-ink-soft/10 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Depth</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Question depth">
                      {DEPTHS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={getDepthDial() === option.value}
                          disabled={saving}
                          onClick={() => setDepthDial(option.value)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            getDepthDial() === option.value
                              ? "border-accent bg-accent text-on-accent"
                              : "border-ink-soft/20 text-ink-soft hover:border-accent/40 hover:text-ink",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {item.key === "micro_challenges" && enabled && (
                  <div className="mt-4 space-y-4 border-t border-ink-soft/10 pt-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map((category) => {
                          const on = !disabledCategories.includes(category);
                          return (
                            <button
                              key={category}
                              type="button"
                              aria-pressed={on}
                              disabled={saving}
                              onClick={() => toggleCategory(category)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                                on ? "border-accent bg-accent/10 text-accent" : "border-ink-soft/20 text-ink-soft line-through",
                              )}
                            >
                              {category}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Spicier challenges</p>
                        <p className="text-xs text-ink-soft">Off unless you both want them.</p>
                      </div>
                      <Switch
                        checked={Boolean(challenge.spicy)}
                        disabled={saving}
                        onCheckedChange={(checked) => updateFeature("micro_challenges", { settings: { spicy: checked } })}
                        aria-label="Allow spicier challenges"
                      />
                    </div>
                  </div>
                )}

                {row && !row.enabled && paused && (
                  <p className="mt-3 text-xs text-ink-soft">Only {partnerName} can switch this back on.</p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
