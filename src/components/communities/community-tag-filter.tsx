import { useMemo } from "react";
import { LuTag } from "react-icons/lu";
import { Handle } from "@/src/lib/handle";
import { cn } from "@/src/lib/utils";
import { useCommunityFromStore } from "@/src/stores/communities";
import { useFlairs } from "@/src/stores/flairs";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import { Flair } from "../flair";
import { Button } from "../ui/button";

const ALL = "all";

/**
 * Filters a community's posts by one of its tags, like the Tags dropdown
 * on lemmy-ui's community page. Lemmy community tags come through as
 * flairs; renders nothing when the community has none.
 */
export function CommunityTagFilter({
  communityHandle,
  tagId,
  onChange,
  variant = "button",
  align = "start",
  className,
}: {
  communityHandle: Handle | undefined;
  tagId: number | undefined;
  onChange: (tagId: number | undefined) => void;
  variant?: "button" | "icon";
  align?: "start" | "end";
  className?: string;
}) {
  const community = useCommunityFromStore(communityHandle);
  const flairs = useFlairs(community?.flairs?.map((f) => f.id));
  // Only Lemmy supports filtering posts by tag
  const isLemmyTags = !!community?.communityView.tags;

  const actions: ActionMenuProps<string>["actions"] = useMemo(
    () => [
      { text: "All", value: ALL, onClick: () => onChange(undefined) },
      ...(flairs ?? []).map((flair) => ({
        text: flair.title,
        value: String(flair.id),
        onClick: () => onChange(flair.id),
      })),
    ],
    [flairs, onChange],
  );

  if (!isLemmyTags || !flairs || flairs.length === 0) {
    return null;
  }

  const selected = flairs.find((f) => f.id === tagId);
  const ariaLabel = selected
    ? `Filtering by tag ${selected.title}`
    : "Filter by tag";

  return (
    <ActionMenu
      header="Tags"
      align={align}
      actions={actions}
      selectedValue={selected ? String(selected.id) : ALL}
      triggerAsChild
      trigger={
        variant === "button" ? (
          <Button
            size="sm"
            variant="outline"
            className={className}
            aria-label={ariaLabel}
          >
            {selected ? <Flair flair={selected} size="sm" /> : "Tags"}
            <LuTag />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-2xl text-muted-foreground",
              selected && "text-brand",
              className,
            )}
            aria-label={ariaLabel}
          >
            <LuTag />
          </Button>
        )
      }
    />
  );
}
