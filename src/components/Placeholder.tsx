import ComingSoon from "./ComingSoon";

// Stand-in screen until the real feature is built, powered by the simple, reusable ComingSoon component
export default function Placeholder({
  title,
  blurb,
  section,
}: {
  title: string;
  blurb: string;
  section?: string;
}) {
  return <ComingSoon section={section || title.toLowerCase()} title={title} blurb={blurb} />;
}