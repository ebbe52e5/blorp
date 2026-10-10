import { useMemo } from "react";
import {
  useMultiCommunityFeedFollowersQuery,
  useMultiCommunityFeedQuery,
} from "../queries";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { useParams } from "@/src/routing/index";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { UserDropdown } from "../components/nav";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { Page } from "../components/page";
import { PageTitle } from "../components/page-title";
import { VirtualList } from "../components/virtual-list";
import { usePagination } from "../components/pagination/use-pagination";
import { FollowerRow } from "../components/person/follower-row";
import { FeedSidebar } from "../components/multi-community-feeds/multi-community-feed-sidebar";
import { Schemas } from "../apis/api-blueprint";
import { ContentGutters } from "../components/gutters";
import { decodeApId } from "../apis/utils";
import { useMultiCommunityFeedFromStore } from "../stores/multi-community-feeds";

// The list behind the Subscribers count in the feed sidebar. Only the
// zhifou.io Lemmy fork lists feed followers, and only to the feed's creator
// and admins.
export default function MultiCommunityFeedFollowers() {
  const linkCtx = useLinkContext();
  const { apId: encodedApId } = useParams(`${linkCtx.root}f/:apId/followers`);
  const apId = useMemo(() => decodeApId(encodedApId), [encodedApId]);

  const feedQuery = useMultiCommunityFeedQuery({ apId });
  const feed = useMultiCommunityFeedFromStore(apId)?.feedView;

  const followersQuery = useMultiCommunityFeedFollowersQuery({
    feedId: feed?.id,
  });

  const { flatData, onEndReached, paginationControls } = usePagination({
    pages: followersQuery.data?.pages,
    getItems: (p) => p.followers,
    fetchNextPage: followersQuery.fetchNextPage,
    hasNextPage: followersQuery.hasNextPage,
    isFetchingNextPage: followersQuery.isFetchingNextPage,
    mode: "infinite",
  });

  const title = `Subscribers — ${feed?.title || feed?.name || apId}`;

  return (
    <Page notFound={feedQuery.isError} notFoundApId={apId}>
      <PageTitle>{title}</PageTitle>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1} size="sm">
              {title}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <VirtualList<Schemas.CommunityFollower>
          data={flatData}
          estimatedItemSize={56}
          scrollHost
          fullscreen
          onEndReached={onEndReached}
          paginationControls={paginationControls}
          noItems={flatData.length === 0 && !followersQuery.isFetching}
          noItemsComponent={
            <ContentGutters>
              <p className="text-muted-foreground text-center py-8">
                {followersQuery.isError
                  ? "Only the feed's creator and admins can see the subscribers."
                  : "No subscribers yet."}
              </p>
              <></>
            </ContentGutters>
          }
          renderItem={({ item }) => (
            <ContentGutters>
              <div className="py-2">
                <FollowerRow follower={item} />
              </div>
              <></>
            </ContentGutters>
          )}
        />

        <ContentGutters className="max-md:hidden absolute top-0 right-0 left-0 z-10">
          <div className="flex-1" />
          <FeedSidebar apId={apId} />
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
