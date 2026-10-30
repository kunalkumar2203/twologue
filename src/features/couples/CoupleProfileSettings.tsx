import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zoneLabel } from "@/config/time-zones";
import { setupMessage, type CoupleSetup, type RelationshipStage } from "./setup-api";
import { OptionGroup, STAGE_OPTIONS, TimeZoneSelect, YES_NO_OPTIONS } from "./setup-fields";
import { useCoupleSetup, useSaveCoupleSettings } from "./setup-hooks";

// The shared basics. Either partner can change them; both see the same values.
export function CoupleProfileSettings() {
  const setup = useCoupleSetup();
  if (setup.isLoading) return <p className="text-sm text-ink-soft">Loading your shared setup…</p>;
  if (!setup.data) return null;
  // Re-mount after every saved change, so the form always starts from what the database holds
  return <CoupleProfileForm key={JSON.stringify(setup.data.settings)} setup={setup.data} />;
}

function CoupleProfileForm({ setup }: { setup: CoupleSetup }) {
  const save = useSaveCoupleSettings();
  const mine = setup.me.time_zone ?? "UTC";
  const theirs = setup.partner?.time_zone ?? mine;
  const [timeZone, setTimeZone] = React.useState(setup.settings.anchor_time_zone);
  const [longDistance, setLongDistance] = React.useState(setup.settings.is_long_distance);
  const [stage, setStage] = React.useState<RelationshipStage | undefined>(setup.settings.relationship_stage ?? undefined);
  const [hasChildren, setHasChildren] = React.useState<boolean | null | undefined>(setup.settings.has_children);
  const [isMarried, setIsMarried] = React.useState<boolean | null | undefined>(setup.settings.is_married);
  const [anniversary, setAnniversary] = React.useState(setup.settings.anniversary_date ?? "");

  const submit = () =>
    save.mutate({
      change: {
        settings: {
          anchor_time_zone: timeZone,
          is_long_distance: longDistance,
          relationship_stage: stage ?? null,
          has_children: hasChildren ?? null,
          is_married: isMarried ?? null,
          anniversary_date: anniversary || null,
        },
      },
    });

  return (
    <div className="mt-8 space-y-6 rounded-2xl border border-ink-soft/20 bg-surface p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Our shared setup</h2>
        <p className="mt-1 text-sm text-ink-soft">
          These apply to both of you. Either of you can change them at any time.
        </p>
      </div>

      <div className="space-y-2">
        <TimeZoneSelect label="Our shared day follows" value={timeZone} onChange={setTimeZone} />
        <p className="text-xs text-ink-soft">
          {mine === theirs
            ? `You're both on ${zoneLabel(mine)}.`
            : `Your time zones differ. ${setup.partner?.name ?? "Your partner"} is on ${zoneLabel(theirs)}.`}
        </p>
      </div>

      <OptionGroup
        label="Where are you right now?"
        options={[
          { value: false, label: "Together" },
          { value: true, label: "Long distance" },
        ]}
        value={longDistance}
        onChange={setLongDistance}
      />

      <OptionGroup label="How long have you been together?" options={STAGE_OPTIONS} value={stage} onChange={setStage} />
      <OptionGroup label="Do you have kids?" options={YES_NO_OPTIONS} value={hasChildren} onChange={setHasChildren} />
      <OptionGroup label="Are you married?" options={YES_NO_OPTIONS} value={isMarried} onChange={setIsMarried} />

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Anniversary date
          <Input type="date" value={anniversary} onChange={(event) => setAnniversary(event.target.value)} className="mt-1.5 h-10 rounded-full" />
        </label>
        {anniversary && (
          <button type="button" onClick={() => setAnniversary("")} className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink">
            Clear the anniversary date
          </button>
        )}
      </div>

      {save.isError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{setupMessage(save.error)}</p>}
      {save.isSuccess && !save.isPending && <p role="status" className="text-sm text-ink-soft">Saved. Both of you see this now.</p>}

      <Button type="button" disabled={save.isPending} onClick={submit} className="rounded-full bg-accent text-on-accent hover:bg-accent/90">
        {save.isPending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
