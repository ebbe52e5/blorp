import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { MarkdownRenderer } from "../markdown/renderer";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { LuCakeSlice } from "react-icons/lu";
import { Link, resolveRoute, useHistory } from "@/src/routing/index";
import { ActionMenuProps, EllipsisActionMenu } from "../adaptable/action-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { useShareActions } from "@/src/components/adaptable/action-menu/hooks";
import { Sidebar, SidebarContent } from "../sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { Separator } from "../ui/separator";
import { useSidebarStore } from "@/src/stores/sidebars";
import { cn } from "@/src/lib/utils";
import { AggregateBadges } from "../aggregates";
import { Skeleton } from "../ui/skeleton";
import { EasterEggBox } from "@/src/components/easter-eggs/EasterEggBox";
import { DateTime } from "../datetime";
import { useMultiCommunityFeedFromStore } from "@/src/stores/multi-community-feeds";
import {
  CommunityCard,
  CommunityCardSkeleton,
} from "../communities/community-card";
import { encodeApId } from "@/src/apis/utils";
import { supportsCreateCommunity } from "@/src/apis/support";
import { useSoftware } from "@/src/queries";
import {
  getAccountActorId,
  parseAccountInfo,
  useAmIAdmin,
  useAuth,
} from "@/src/stores/auth";
import { parseHandle } from "@/src/lib/handle";
import { FeedJoinButton } from "./feed-join-button";
import { PersonCard } from "../person/person-card";

dayjs.extend(localizedFormat);

/**
 * The Subscribers badge links to the follower list. Only the zhifou.io Lemmy
 * fork lists feed followers (it sends personApIds, so that's how we detect
 * it), and only to the feed's creator, or admins for a local feed. The same
 * users can edit the feed.
 */
function useSubscribersLink(apId: string) {
  const linkCtx = useLinkContext();
  const feed = useMultiCommunityFeedFromStore(apId)?.feedView;
  const software = useSoftware();
  const myApId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const myInstance = useAuth(
    (s) => parseAccountInfo(s.getSelectedAccount()).instance,
  );
  const isAdmin = useAmIAdmin();
  if (
    !feed ||
    !supportsCreateCommunity(software) ||
    feed.personApIds === undefined
  ) {
    return undefined;
  }
  const isOwner = !!myApId && feed.ownerApId === myApId;
  const isLocalAdmin =
    !!isAdmin && parseHandle(feed.handle).host === myInstance;
  if (!isOwner && !isLocalAdmin) {
    return undefined;
  }
  return {
    Subscribers: (badge: React.ReactNode) => (
      <Link
        to={`${linkCtx.root}f/:apId/followers`}
        params={{ apId: encodeApId(apId) }}
      >
        {badge}
      </Link>
    ),
  };
}

export function SmallScreenSidebar({
  apId,
  expanded,
}: {
  apId: string;
  expanded?: boolean;
}) {
  const linkCtx = useLinkContext();

  const feed = useMultiCommunityFeedFromStore(apId)?.feedView;

  const actions = useMultiCommunityActions({
    apId,
  });
  const subscribersLink = useSubscribersLink(apId);

  const createdAt = (
    <div className="flex items-center gap-1.5 text-sm h-5 text-muted-foreground">
      <LuCakeSlice />
      {feed ? (
        <span>
          Created <DateTime date={dayjs(feed.createdAt)} />
        </span>
      ) : (
        <Skeleton className="h-5 flex-1 max-w-32" />
      )}
    </div>
  );

  return (
    <div>
      <div
        className={cn(
          "flex flex-col gap-3.5 pt-1.5 pb-2 flex-1 px-3.5",
          !expanded && "md:hidden",
        )}
      >
        <AggregateBadges
          links={subscribersLink}
          aggregates={{
            Subscribers: feed?.subscriberCount,
            Communities: feed?.communityCount,
            // zhifou.io Lemmy fork only
            People: feed?.personApIds?.length || undefined,
          }}
        />

        {!expanded && createdAt}

        <div
          className={cn(
            "flex flex-row items-center flex-1 gap-5",
            !expanded && "-mt-1.5",
          )}
        >
          {expanded ? (
            createdAt
          ) : (
            <Link
              to={`${linkCtx.root}f/:apId/sidebar`}
              params={{
                apId: encodeApId(apId),
              }}
              className="text-brand"
            >
              Show more
            </Link>
          )}
          <div className="flex-1" />
          <EllipsisActionMenu
            header="Community"
            align="end"
            actions={actions}
            aria-label="Community actions"
          />

          <FeedJoinButton feedApId={apId} />
        </div>
      </div>

      <Separator
        className={cn(
          "data-[orientation=horizontal]:h-[0.5px]",
          !expanded && "md:hidden",
        )}
      />

      {expanded && (
        <>
          <section className="p-3">
            <h2>ABOUT</h2>
            {feed?.description && (
              <MarkdownRenderer
                markdown={feed.description}
                dim
                className="pt-3"
                hideAltTooltip
              />
            )}
          </section>

          <Separator />

          <section className="p-3 flex flex-col gap-2">
            <h2>Communities</h2>
            {feed?.communityHandles?.length
              ? feed.communityHandles.map((handle) => (
                  <CommunityCard
                    key={handle}
                    communityHandle={handle}
                    size="sm"
                  />
                ))
              : Array.from({ length: feed?.communityCount ?? 0 }).map(
                  (_, i) => <CommunityCardSkeleton key={i} size="sm" />,
                )}
          </section>

          {feed?.ownerApId && (
            <>
              <Separator />
              <section className="p-3 flex flex-col gap-2">
                <h2>Created by</h2>
                <PersonCard actorId={feed.ownerApId} size="sm" />
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function useMultiCommunityActions({
  apId,
}: {
  apId: string;
}): ActionMenuProps["actions"] {
  const linkCtx = useLinkContext();
  const route = resolveRoute(`${linkCtx.root}f/:apId`, {
    apId: encodeApId(apId),
  });
  const shareActions = useShareActions("feed", {
    type: "multi-community-feed",
    route,
    apId,
  });
  const history = useHistory();
  const feed = useMultiCommunityFeedFromStore(apId)?.feedView;
  const myApId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const canEdit =
    supportsCreateCommunity(useSoftware()) &&
    !!feed?.ownerApId &&
    feed.ownerApId === myApId;
  return [
    ...(canEdit
      ? [
          {
            text: "Settings",
            onClick: () =>
              history.push(`${linkCtx.root}f/:apId/settings`, {
                apId: encodeApId(apId),
              }),
          },
        ]
      : []),
    ...shareActions,
  ];
}

export function FeedSidebar({
  apId,
  hideDescription = false,
}: {
  apId: string;
  hideDescription?: boolean;
  asPage?: boolean;
}) {
  const feed = useMultiCommunityFeedFromStore(apId)?.feedView;

  const aboutOpen = useSidebarStore((s) => s.communityAboutExpanded);
  const setAboutOpen = useSidebarStore((s) => s.setCommunityAboutExpanded);

  const modsOpen = useSidebarStore((s) => s.communityModsExpanded);
  const setModsOpen = useSidebarStore((s) => s.setCommunityModsExpanded);

  const actions = useMultiCommunityActions({
    apId,
  });
  const subscribersLink = useSubscribersLink(apId);

  if (!feed) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarContent className="relative">
        <EasterEggBox seed={feed.name}>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-row items-start justify-between flex-1">
              <Avatar className="h-13 w-13">
                <AvatarImage
                  src={feed.icon ?? undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl">
                  {feed.name.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <EllipsisActionMenu
                header="Multi Community Feed"
                align="end"
                actions={actions}
                aria-label="Multi-community feed actions"
              />
            </div>

            <span className="font-bold line-clamp-1">{feed.handle}</span>

            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <LuCakeSlice />
              <span>
                Created <DateTime date={dayjs(feed.createdAt)} />
              </span>
            </div>
          </div>

          <>
            <Separator />
            <Collapsible
              className="p-4"
              open={aboutOpen}
              onOpenChange={setAboutOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                <span>ABOUT</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="py-1">
                {feed.description && !hideDescription && (
                  <MarkdownRenderer
                    markdown={feed.description}
                    dim
                    className="py-3"
                    hideAltTooltip
                  />
                )}

                <AggregateBadges
                  className="mt-2"
                  links={subscribersLink}
                  aggregates={{
                    Subscribers: feed?.subscriberCount,
                    Communities: feed?.communityCount,
                    // zhifou.io Lemmy fork only
                    People: feed.personApIds?.length || undefined,
                  }}
                />
              </CollapsibleContent>
            </Collapsible>

            <Separator />
            <Collapsible
              className="p-4"
              open={modsOpen}
              onOpenChange={setModsOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                <span>Communities</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent className="flex flex-col gap-2 pt-3">
                {feed.communityHandles?.length
                  ? feed.communityHandles.map((handle) => (
                      <CommunityCard
                        key={handle}
                        communityHandle={handle}
                        size="sm"
                      />
                    ))
                  : Array.from({ length: feed.communityCount ?? 0 }).map(
                      (_, i) => <CommunityCardSkeleton key={i} size="sm" />,
                    )}
              </CollapsibleContent>
            </Collapsible>

            {feed.ownerApId && (
              <>
                <Separator />
                <section className="p-4 flex flex-col gap-2">
                  <span className="uppercase text-xs font-medium text-muted-foreground">
                    Created by
                  </span>
                  <PersonCard actorId={feed.ownerApId} size="sm" />
                </section>
              </>
            )}
          </>
        </EasterEggBox>
      </SidebarContent>
    </Sidebar>
  );
}
