import { Gamepad2, HeartHandshake, House, NotebookPen, Sprout } from "lucide-react";

// The five main areas of the app, shown in the bottom bar
export const TABS = [
  { path: "/", label: "Today", icon: House, blurb: "Your daily question and quick actions will live here." },
  { path: "/journal", label: "Journal", icon: NotebookPen, blurb: "Write together and keep your shared memories here." },
  { path: "/play", label: "Play", icon: Gamepad2, blurb: "Games, date ideas and fun things to do together." },
  { path: "/us", label: "Us", icon: HeartHandshake, blurb: "Check-ins, shared lists and your story as a couple." },
  { path: "/grow", label: "Grow", icon: Sprout, blurb: "Guided programs to grow closer over time." },
] as const;
