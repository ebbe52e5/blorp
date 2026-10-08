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

/**
 * The communities a person moderates and the multi-communities they created,
 * shown in their profile sidebar. Lemmy doesn't record who created a
 * community, so moderated communities are the closest match.
 */
export function PersonCommunitiesSections({
  person,
}: {
  person?: Schemas.Person;
}) {
  const isBlocked = useIsPersonBlocked(person?.apId);
  const { data } = usePersonCommunitiesQuery({
    personId: isBlocked ? undefined : person?.id,
  });

  const moderatesOpen = useSidebarStore((s) => s.personModeratesExpanded);
  const setModeratesOpen = useSidebarStore((s) => s.setPersonModeratesExpanded);
  const feedsOpen = useSidebarStore((s) => s.personFeedsExpanded);
  const setFeedsOpen = useSidebarStore((s) => s.setPersonFeedsExpanded);

  if (isBlocked || !data) {
    return null;
  }

  return (
    <>
      {data.communityHandles.length > 0 && (
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
              {data.communityHandles.map((handle) => (
                <CommunityCard
                  key={handle}
                  communityHandle={handle}
                  size="sm"
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {data.feedApIds.length > 0 && (
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
              {data.feedApIds.map((apId) => (
                <FeedCard key={apId} apId={apId} expand={false} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </>
  );
}
