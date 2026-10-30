import { COMMON_TIME_ZONES, zoneLabel } from "@/config/time-zones";
import { cn } from "@/lib/utils";
import type { RelationshipStage } from "./setup-api";

export const STAGE_OPTIONS: { value: RelationshipStage; label: string }[] = [
  { value: "just_started", label: "Just started" },
  { value: "few_years", label: "A few years" },
  { value: "many_years", label: "Many years" },
];

export const YES_NO_OPTIONS: { value: boolean | null; label: string }[] = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
  { value: null, label: "Prefer not to say" },
];

// A row of pill choices. Used by the setup flow and by the settings form.
export function OptionGroup<T extends string | boolean | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                selected
                  ? "border-accent bg-accent text-on-accent"
                  : "border-ink-soft/20 bg-page text-ink-soft hover:border-accent/50 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function TimeZoneSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (zone: string) => void;
}) {
  const zones: { value: string; label: string }[] = COMMON_TIME_ZONES.some((zone) => zone.value === value)
    ? [...COMMON_TIME_ZONES]
    : [{ value, label: zoneLabel(value) }, ...COMMON_TIME_ZONES];

  return (
    <label className="block space-y-1.5 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-ink-soft/20 bg-surface px-3 text-sm font-normal outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        {zones.map((zone) => (
          <option key={zone.value} value={zone.value}>
            {zone.label}
          </option>
        ))}
      </select>
    </label>
  );
}
