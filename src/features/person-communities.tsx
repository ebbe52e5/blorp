import { Fragment } from "react";
import { ChevronsUpDown } from "lucide-react";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { Schemas } from "@/src/apis/api-blueprint";
import { CommunityCard } from "@/src/components/communities/community-card";
import { Collapsible } from "@/src/components/ui/collapsible";
import { Separator } from "@/src/components/ui/separator";
import { usePersonCommunitiesQuery } from "@/src/queries";
import { useIsPersonBlocked } from "@/src/stores/auth";
import { useSidebarStore } from "@/src/stores/sidebars";
import { FeedCard } from "./explore/feed-card";

function usePersonCommunities(person?: Schemas.Person) {
  const isBlocked = useIsPersonBlocked(person?.apId);
  const { data } = usePersonCommunitiesQuery({
    personId: isBlocked ? undefined : person?.id,
  });
  if (isBlocked || !data) {
    return undefined;
  }
  // A creator is usually a moderator too. List each community once, under
  // CREATED.
  const createdHandles = new Set(data.createdHandles);
  return {
    ...data,
    communityHandles: data.communityHandles.filter(
      (h) => !createdHandles.has(h),
    ),
  };
}

/** Whether the person has any sections for `PersonCommunitiesSections` */
export function useHasPersonCommunities(person?: Schemas.Person) {
  const data = usePersonCommunities(person);
  return (
    !!data &&
    (data.createdHandles.length > 0 ||
      data.communityHandles.length > 0 ||
      data.feedApIds.length > 0)
  );
}

/**
 * The communities a person created and moderates, and the multi-communities
 * they created, shown on their profile. Community creators are only recorded
 * by the zhifou.io Lemmy fork, and only for communities created since, so
 * CREATED is empty elsewhere and MODERATES still covers older communities.
 *
 * `compact` renders plain sections for the small screen header, matching its
 * bio, instead of the sidebar's collapsibles.
 */
export function PersonCommunitiesSections({
  person,
  compact,
}: {
  person?: Schemas.Person;
  compact?: boolean;
}) {
  const data = usePersonCommunities(person);

  const createdOpen = useSidebarStore((s) => s.personCreatedExpanded);
  const setCreatedOpen = useSidebarStore((s) => s.setPersonCreatedExpanded);
  const moderatesOpen = useSidebarStore((s) => s.personModeratesExpanded);
  const setModeratesOpen = useSidebarStore((s) => s.setPersonModeratesExpanded);
  const feedsOpen = useSidebarStore((s) => s.personFeedsExpanded);
  const setFeedsOpen = useSidebarStore((s) => s.setPersonFeedsExpanded);

  if (!data) {
    return null;
  }

  const communityCards = (handles: Schemas.Community["handle"][]) =>
    handles.map((handle) => (
      <CommunityCard key={handle} communityHandle={handle} size="sm" />
    ));

  const sections = [
    {
      title: "CREATED",
      items: communityCards(data.createdHandles),
      gap: "gap-2",
      open: createdOpen,
      setOpen: setCreatedOpen,
    },
    {
      title: "MODERATES",
      items: communityCards(data.communityHandles),
      gap: "gap-2",
      open: moderatesOpen,
      setOpen: setModeratesOpen,
    },
    {
      title: "MULTI-COMMUNITIES",
      items: data.feedApIds.map((apId) => (
        <FeedCard key={apId} apId={apId} expand={false} />
      )),
      gap: "gap-3",
      open: feedsOpen,
      setOpen: setFeedsOpen,
    },
  ].filter(({ items }) => items.length > 0);

  if (compact) {
    return sections.map(({ title, items, gap }) => (
      <div key={title} className="my-2">
        <span>{title}</span>
        <div className={`flex flex-col ${gap} mt-3`}>{items}</div>
      </div>
    ));
  }

  return sections.map(({ title, items, gap, open, setOpen }) => (
    <Fragment key={title}>
      <Separator />
      <Collapsible className="p-4" open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
          <span>{title}</span>
          <ChevronsUpDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className={`flex flex-col ${gap} pt-3`}>
          {items}
        </CollapsibleContent>
      </Collapsible>
    </Fragment>
  ));
}
