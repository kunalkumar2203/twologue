import { useSearchParams } from "react-router";
import { BookHeart, Feather, Lock, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import UnconnectedSectionCard from "@/components/UnconnectedSectionCard";
import { useCoupleStatus } from "@/features/couples/hooks";
import JournalPages from "./JournalPages";
import StoriesPanel from "./StoriesPanel";
import WriteTogether from "./WriteTogether";

const SECTIONS = [
  { id: "write", label: "Write together" },
  { id: "stories", label: "Stories" },
  { id: "pages", label: "Our pages" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function JournalPage() {
  const { isPaired, isLoading, hasPendingInvite } = useCoupleStatus();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active: SectionId = SECTIONS.some((section) => section.id === requested)
    ? (requested as SectionId)
    : "write";

  if (!isLoading && !isPaired) {
    return (
      <UnconnectedSectionCard
        badge="Shared Journal"
        icon={NotebookPen}
        hasPendingInvite={hasPendingInvite}
        title="A private diary, written for two."
        description="A quiet space with a shared daily prompt. Entries stay private until you both save, then reveal together."
        highlights={[
          {
            icon: Lock,
            title: "Blind-reveal daily entries",
            description: "Write your thoughts freely. Neither sees anything until both have saved.",
          },
          {
            icon: Feather,
            title: "Collaborative stories",
            description: "Take turns writing stories one paragraph at a time.",
          },
          {
            icon: BookHeart,
            title: "Your shared pages archive",
            description: "Every revealed answer gathers into your private archive.",
          },
        ]}
      />
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-6 pb-12">
      <div>
        <p className="text-sm font-medium text-ink-soft">Shared journal</p>
        <h1 className="mt-1 text-3xl font-semibold">Journal</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
          Write privately, read together. Nobody sees a page until you're both ready.
        </p>
      </div>

      <div role="tablist" aria-label="Journal sections" className="inline-flex flex-wrap gap-1 rounded-full border border-ink-soft/20 bg-surface p-1 text-sm">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={active === section.id}
            onClick={() => setParams(section.id === "write" ? {} : { tab: section.id }, { replace: true })}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              active === section.id ? "bg-accent text-on-accent" : "text-ink-soft hover:text-ink",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      {active === "write" && <WriteTogether />}
      {active === "stories" && <StoriesPanel />}
      {active === "pages" && (
        <JournalPages kind="journal" emptyText="Your shared pages will gather here." />
      )}
    </section>
  );
}
