import { IconType } from "react-icons";
import {
  LuEyeOff,
  LuGlobe,
  LuHouse,
  LuLock,
  LuLockKeyhole,
} from "react-icons/lu";
import { Schemas } from "@/src/apis/api-blueprint";
import { cn } from "@/src/lib/utils";

type Visibility = NonNullable<Schemas.Community["visibility"]>;

// Descriptions match lemmy-ui's community sidebar
const VISIBILITY_INFO: Record<
  Visibility,
  { label: string; description: string; Icon: IconType }
> = {
  public: {
    label: "Public community",
    description: "This community is visible to everyone.",
    Icon: LuGlobe,
  },
  unlisted: {
    label: "Unlisted community",
    description:
      "This community is visible to everyone, but not shown in global/all feeds.",
    Icon: LuEyeOff,
  },
  local_only_public: {
    label: "Local-only community",
    description:
      "This community does not federate and is only available to local users (including those who are not logged in).",
    Icon: LuHouse,
  },
  local_only_private: {
    label: "Local-only private community",
    description:
      "This community does not federate and is only available to local users who are logged in.",
    Icon: LuLockKeyhole,
  },
  private: {
    label: "Private community",
    description:
      "This community is private and can only be viewed by users who were manually approved by the moderators.",
    Icon: LuLock,
  },
};

/**
 * Who can see a community. Only Lemmy v4 reports visibility, so this renders
 * nothing on older Lemmy and PieFed.
 */
export function CommunityVisibility({
  visibility,
  className,
}: {
  visibility: Schemas.Community["visibility"];
  className?: string;
}) {
  if (!visibility) {
    return null;
  }
  const { label, description, Icon } = VISIBILITY_INFO[visibility];
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
      title={description}
      data-testid="community-visibility"
    >
      <Icon aria-hidden />
      <span>{label}</span>
    </div>
  );
}
