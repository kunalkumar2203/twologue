// Turns a calendar date (YYYY-MM-DD) into words, without a time-zone shift
export function formatDay(
  iso: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, options);
}

export type HistoryDateDetails = {
  relative: string;
  fullDate: string;
};

export function formatHistoryDateDetails(dateStr: string): HistoryDateDetails {
  if (!dateStr) return { relative: "", fullDate: "" };
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  const itemDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

  const fullDate = itemDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (diffDays === 0) return { relative: "Today", fullDate };
  if (diffDays === 1) return { relative: "Yesterday", fullDate };
  if (diffDays > 1 && diffDays < 7) {
    const weekday = itemDate.toLocaleDateString("en-US", { weekday: "short" });
    return { relative: weekday, fullDate };
  }
  return { relative: "", fullDate };
}