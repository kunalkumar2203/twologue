import type { Story } from "./stories-api";
import { formatDay } from "@/lib/format";

export function kindLabel(kind: Story["kind"]) {
  return kind === "our_future" ? "Our future" : "Fiction";
}

export function isTurnExpired(dueISO: string | null, now = Date.now()) {
  if (!dueISO) return false;
  return new Date(dueISO).getTime() <= now;
}

// Soft, never punishing: there is no auto-skip when a turn runs late
export function timeLeft(dueISO: string | null, now = Date.now()) {
  if (!dueISO) return null;
  const ms = new Date(dueISO).getTime() - now;
  if (ms <= 0) return "Turn time has passed";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return "Less than an hour left";
  if (hours < 24) return `About ${hours} ${hours === 1 ? "hour" : "hours"} left`;
  const days = Math.round(ms / 86_400_000);
  return `About ${days} ${days === 1 ? "day" : "days"} left`;
}

export function storyToText(story: Story) {
  const lines = [
    story.title,
    `${kindLabel(story.kind)}${story.finished_at ? `, finished ${new Date(story.finished_at).toLocaleDateString(undefined, { dateStyle: "long" })}` : ""}`,
    "",
  ];
  for (const paragraph of story.paragraphs) lines.push(paragraph.body, "");
  return lines.join("\n");
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "story";
}

export { formatDay };