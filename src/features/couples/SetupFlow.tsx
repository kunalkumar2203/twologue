import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { middleTimeZone, zoneLabel } from "@/config/time-zones";
import { cn } from "@/lib/utils";
import {
  setupMessage,
  type CoupleSetup,
  type FeatureKey,
  type RelationshipStage,
  type SettingsChange,
} from "./setup-api";
import { useSaveCoupleSettings } from "./setup-hooks";
import { OptionGroup, STAGE_OPTIONS, TimeZoneSelect, YES_NO_OPTIONS } from "./setup-fields";

const FEATURE_CHOICES: { key: FeatureKey; label: string; detail: string }[] = [
  { key: "daily_question", label: "Daily question", detail: "One shared question a day, revealed together." },
  { key: "micro_challenges", label: "Daily challenge", detail: "A two-minute invitation to connect." },
  { key: "appreciation_notes", label: "Appreciation notes", detail: "Short thank-you notes to send and reread." },
  { key: "journal", label: "Write together", detail: "Shared prompts with a blind reveal." },
  { key: "story", label: "Stories", detail: "A story you write one paragraph at a time." },
  { key: "time_capsule", label: "Time capsules", detail: "Letters sealed until a day you choose." },
  { key: "mood", label: "Emotional weather", detail: "A quick, private check-in on how the day feels." },
];

const STEPS = [
  { title: "Tell us about you two", hint: "A few quick questions. Skip any of them." },
  { title: "Choose what's part of your space", hint: "Everything starts switched on. Turn off anything you don't want yet." },
  { title: "A few optional basics", hint: "Only if you'd like to share. They help us choose the right questions." },
];

type Draft = {
  timeZone: string;
  longDistance: boolean;
  stage: RelationshipStage | undefined;
  hasChildren: boolean | null | undefined;
  isMarried: boolean | null | undefined;
  anniversary: string;
  features: Partial<Record<FeatureKey, boolean>>;
};

type Update = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

function initialDraft(setup: CoupleSetup, middle: string): Draft {
  return {
    timeZone: middle,
    longDistance: setup.settings.is_long_distance,
    stage: setup.settings.relationship_stage ?? undefined,
    hasChildren: setup.settings.has_children ?? undefined,
    isMarried: setup.settings.is_married ?? undefined,
    anniversary: setup.settings.anniversary_date ?? "",
    features: Object.fromEntries(setup.features.map((item) => [item.key, item.enabled])) as Partial<
      Record<FeatureKey, boolean>
    >,
  };
}

// Unanswered questions are saved as "prefer not to say" (null), never guessed.
// Only switches that changed are sent, so a switch the partner paused is never touched.
function buildChange(draft: Draft, setup: CoupleSetup): SettingsChange {
  const changed = setup.features.filter((item) => (draft.features[item.key] ?? item.enabled) !== item.enabled);
  return {
    settings: {
      anchor_time_zone: draft.timeZone,
      is_long_distance: draft.longDistance,
      relationship_stage: draft.stage ?? null,
      has_children: draft.hasChildren ?? null,
      is_married: draft.isMarried ?? null,
      anniversary_date: draft.anniversary || null,
    },
    features: Object.fromEntries(
      changed.map((item) => [item.key, { enabled: draft.features[item.key] ?? item.enabled }]),
    ) as SettingsChange["features"],
  };
}

// Three short steps, one screen each. Skipping at any point keeps sensible defaults.
export function SetupFlow({ setup }: { setup: CoupleSetup }) {
  const save = useSaveCoupleSettings();
  const mine = setup.me.time_zone ?? "UTC";
  const theirs = setup.partner?.time_zone ?? mine;
  const middle = middleTimeZone(mine, theirs);
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft>(() => initialDraft(setup, middle));
  const busy = save.isPending;

  const update: Update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const finish = (change: SettingsChange) => save.mutate({ change, complete: true });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-page text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
        <section aria-labelledby="setup-title" className="rounded-3xl border border-ink-soft/20 bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={cn("h-1.5 w-8 rounded-full transition-colors", index <= step ? "bg-accent" : "bg-ink-soft/20")}
                />
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => finish({ settings: { anchor_time_zone: middle } })}
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Skip for now
            </button>
          </div>

          <h2 id="setup-title" className="mt-6 text-2xl font-semibold leading-snug">{STEPS[step].title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{STEPS[step].hint}</p>

          <div className="mt-6 space-y-6">
            {step === 0 && <TogetherStep setup={setup} draft={draft} update={update} middle={middle} sameZone={mine === theirs} />}
            {step === 1 && <FeaturesStep setup={setup} draft={draft} update={update} />}
            {step === 2 && <BasicsStep draft={draft} update={update} />}
          </div>

          {save.isError && (
            <p role="alert" className="mt-5 text-sm text-red-700 dark:text-red-300">{setupMessage(save.error)}</p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep(step - 1)} className="rounded-full">
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" disabled={busy} onClick={() => setStep(step + 1)} className="rounded-full bg-accent text-on-accent hover:bg-accent/90">
                Next
              </Button>
            ) : (
              <Button type="button" disabled={busy} onClick={() => finish(buildChange(draft, setup))} className="rounded-full bg-accent text-on-accent hover:bg-accent/90">
                {busy ? "Saving…" : "Finish setup"}
              </Button>
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-ink-soft">You can change any of this later in Settings.</p>
      </div>
    </div>
  );
}

function TogetherStep({
  setup,
  draft,
  update,
  middle,
  sameZone,
}: {
  setup: CoupleSetup;
  draft: Draft;
  update: Update;
  middle: string;
  sameZone: boolean;
}) {
  const partnerName = setup.partner?.name ?? "Your partner";
  const mine = setup.me.time_zone ?? "UTC";
  const theirs = setup.partner?.time_zone ?? mine;

  return (
    <>
      <OptionGroup
        label="Where are you right now?"
        options={[
          { value: false, label: "Together" },
          { value: true, label: "Long distance" },
        ]}
        value={draft.longDistance}
        onChange={(value) => update("longDistance", value)}
      />

      <OptionGroup
        label="How long have you been together?"
        options={STAGE_OPTIONS}
        value={draft.stage}
        onChange={(value) => update("stage", value)}
      />

      {!sameZone && (
        <div className="space-y-3">
          <OptionGroup<string>
            label="Which time zone should your shared day follow?"
            options={[
              { value: middle, label: "Middle ground" },
              { value: mine, label: `${setup.me.name}'s zone` },
              { value: theirs, label: `${partnerName}'s zone` },
            ]}
            value={draft.timeZone}
            onChange={(value) => update("timeZone", value)}
          />
          <p className="text-xs text-ink-soft">Your shared day will follow {zoneLabel(draft.timeZone)}.</p>
          <TimeZoneSelect label="Or pick another" value={draft.timeZone} onChange={(zone) => update("timeZone", zone)} />
        </div>
      )}
    </>
  );
}

function FeaturesStep({ setup, draft, update }: { setup: CoupleSetup; draft: Draft; update: Update }) {
  const partnerName = setup.partner?.name ?? "Your partner";
  return (
    <ul className="space-y-3">
      {FEATURE_CHOICES.map((item) => {
        const current = setup.features.find((entry) => entry.key === item.key);
        // Switched off with someone on record as the one who did it: the partner, since the owner
        // can't open settings before setup is finished
        const pausedByPartner = Boolean(current && !current.enabled && current.updated_by);
        const on = pausedByPartner ? false : (draft.features[item.key] ?? true);
        return (
          <li key={item.key} className="flex items-start justify-between gap-4 rounded-2xl border border-ink-soft/20 bg-page p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">{item.detail}</p>
              {pausedByPartner && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Paused by {partnerName}. Only they can switch it on.</p>}
            </div>
            <Switch
              checked={on}
              disabled={pausedByPartner}
              onCheckedChange={(checked) => update("features", { ...draft.features, [item.key]: checked })}
              aria-label={`${item.label} on or off`}
            />
          </li>
        );
      })}
    </ul>
  );
}

function BasicsStep({ draft, update }: { draft: Draft; update: Update }) {
  return (
    <>
      <OptionGroup label="Do you have kids?" options={YES_NO_OPTIONS} value={draft.hasChildren} onChange={(value) => update("hasChildren", value)} />
      <OptionGroup label="Are you married?" options={YES_NO_OPTIONS} value={draft.isMarried} onChange={(value) => update("isMarried", value)} />
      <label className="block space-y-1.5 text-sm font-medium">
        Anniversary date <span className="font-normal text-ink-soft">(optional)</span>
        <Input
          type="date"
          value={draft.anniversary}
          onChange={(event) => update("anniversary", event.target.value)}
          className="h-10 rounded-full"
        />
        <span className="block text-xs font-normal text-ink-soft">Used for time capsules that open on your anniversary.</span>
      </label>
    </>
  );
}
