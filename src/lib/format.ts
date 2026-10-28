// Turns a calendar date (YYYY-MM-DD) into words, without a time-zone shift
export function formatDay(
  iso: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, options);
}