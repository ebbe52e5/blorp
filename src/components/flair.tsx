import { Schemas } from "../apis/api-blueprint";
import { useLinkContext } from "../hooks/navigation-hooks";
import { Link } from "../routing/index";
import { Badge } from "./ui/badge";

export function Flair({
  flair,
  size,
  communityHandle,
}: {
  flair: Schemas.Flair;
  size?: "default" | "sm";
  /**
   * When set, a Lemmy community tag links to that community's posts
   * filtered by the tag (?tagId=). Only Lemmy tags carry an apId, and only
   * Lemmy supports the tag filter, so PieFed flairs stay plain.
   */
  communityHandle?: string;
}) {
  const linkCtx = useLinkContext();

  const badge = (
    <Badge
      className="rounded-full"
      style={{
        backgroundColor: flair.backgroundColor ?? undefined,
        color: flair.color ?? undefined,
      }}
      size={size}
    >
      {flair.title}
    </Badge>
  );

  if (!communityHandle || !flair.apId) {
    return badge;
  }

  return (
    <Link
      to={`${linkCtx.root}c/:communityHandle`}
      params={{ communityHandle }}
      searchParams={`?tagId=${flair.id}`}
      className="inline-flex no-underline hover:no-underline hover:opacity-80"
      aria-label={`Posts tagged ${flair.title}`}
    >
      {badge}
    </Link>
  );
}
