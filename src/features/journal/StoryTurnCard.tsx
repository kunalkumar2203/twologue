import { Link } from "react-router";
import { timeLeft } from "./journal-utils";
import { useStoryShelf } from "./hooks";

// Shows on Today only when it is your turn in the story in progress
export function StoryTurnCard() {
  const shelf = useStoryShelf();
  const story = shelf.data?.active;
  if (!story || story.turn !== "me") return null;

  const due = timeLeft(story.turn_due_at);

  return (
    <Link
      to="/app/journal?tab=stories"
      className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 transition-colors hover:border-accent"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">Your turn in “{story.title}”</span>
        {due && <span className="block text-xs text-ink-soft">{due}</span>}
      </span>
      <span className="shrink-0 text-sm font-medium text-accent">Write</span>
    </Link>
  );
}