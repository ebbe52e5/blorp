import { useMemo } from "react";
import { useCommunityFollowersQuery, useCommunityQuery } from "../queries";
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
import { Schemas } from "../apis/api-blueprint";
import { ContentGutters } from "../components/gutters";
import { decodeCommunityHandle, parseHandle } from "../lib/handle";
import { parseAccountInfo, useAuth } from "../stores/auth";
import { useCommunityFromStore } from "../stores/communities";

// The list behind the Subscribers count in the community sidebar. Uses the
// same request as the community settings Followers tab, so only mods and
// admins can open it.
export default function CommunityFollowers() {
  const linkCtx = useLinkContext();
  const { communityHandle: communityHandleEncoded } = useParams(
    `${linkCtx.root}c/:communityHandle/followers`,
  );
  const communityHandle = useMemo(
    () => decodeCommunityHandle(communityHandleEncoded),
    [communityHandleEncoded],
  );

  const communityQuery = useCommunityQuery({ name: communityHandle });
  const communityId = useCommunityFromStore(communityHandle)?.communityView.id;

  const followersQuery = useCommunityFollowersQuery({ communityId });

  const { flatData, onEndReached, paginationControls } = usePagination({
    pages: followersQuery.data?.pages,
    getItems: (p) => p.followers,
    fetchNextPage: followersQuery.fetchNextPage,
    hasNextPage: followersQuery.hasNextPage,
    isFetchingNextPage: followersQuery.isFetchingNextPage,
    mode: "infinite",
  });

  // A remote community's subscriber count comes from its own instance, but
  // this instance only knows about its own users' follows.
  const myInstance = useAuth(
    (s) => parseAccountInfo(s.getSelectedAccount()).instance,
  );
  const isRemote =
    !!communityHandle && parseHandle(communityHandle).host !== myInstance;

  const title = `Subscribers — ${communityHandle ?? ""}`;

  return (
    <Page
      notFound={communityQuery.isError}
      notFoundCommunityHandle={communityHandle}
    >
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
          header={
            isRemote
              ? [
                  <ContentGutters key="remote-note">
                    <p className="text-sm text-muted-foreground pt-3">
                      Only subscribers on {myInstance} are shown.
                    </p>
                    <></>
                  </ContentGutters>,
                ]
              : undefined
          }
          noItems={flatData.length === 0 && !followersQuery.isFetching}
          noItemsComponent={
            <ContentGutters>
              <p className="text-muted-foreground text-center py-8">
                {followersQuery.isError
                  ? "Only mods and admins can see the subscribers."
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
      </IonContent>
    </Page>
  );
}
