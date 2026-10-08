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
  return isBlocked ? undefined : data;
}

/** Whether the person has any sections for `PersonCommunitiesSections` */
export function useHasPersonCommunities(person?: Schemas.Person) {
  const data = usePersonCommunities(person);
  return (
    !!data && (data.communityHandles.length > 0 || data.feedApIds.length > 0)
  );
}

/**
 * The communities a person moderates and the multi-communities they created,
 * shown on their profile. Lemmy doesn't record who created a community, so
 * moderated communities are the closest match.
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

  const moderatesOpen = useSidebarStore((s) => s.personModeratesExpanded);
  const setModeratesOpen = useSidebarStore((s) => s.setPersonModeratesExpanded);
  const feedsOpen = useSidebarStore((s) => s.personFeedsExpanded);
  const setFeedsOpen = useSidebarStore((s) => s.setPersonFeedsExpanded);

  if (!data) {
    return null;
  }

  const moderates = data.communityHandles.map((handle) => (
    <CommunityCard key={handle} communityHandle={handle} size="sm" />
  ));
  const feeds = data.feedApIds.map((apId) => (
    <FeedCard key={apId} apId={apId} expand={false} />
  ));

  if (compact) {
    return (
      <>
        {moderates.length > 0 && (
          <div className="my-2">
            <span>MODERATES</span>
            <div className="flex flex-col gap-2 mt-3">{moderates}</div>
          </div>
        )}
        {feeds.length > 0 && (
          <div className="my-2">
            <span>MULTI-COMMUNITIES</span>
            <div className="flex flex-col gap-3 mt-3">{feeds}</div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {moderates.length > 0 && (
        <>
          <Separator />
          <Collapsible
            className="p-4"
            open={moderatesOpen}
            onOpenChange={setModeratesOpen}
          >
            <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
              <span>MODERATES</span>
              <ChevronsUpDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-2 pt-3">
              {moderates}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {feeds.length > 0 && (
        <>
          <Separator />
          <Collapsible
            className="p-4"
            open={feedsOpen}
            onOpenChange={setFeedsOpen}
          >
            <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
              <span>MULTI-COMMUNITIES</span>
              <ChevronsUpDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              {feeds}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </>
  );
}
