import { FollowerRow } from "@/src/components/person/follower-row";
import { LoadingButton } from "@/src/components/ui/button";
import { useCommunityFollowersQuery } from "@/src/queries";

// Mirrors the Followers tab of the zhifou.io lemmy-ui fork (upstream #4306):
// GET /person/list with community_id, which only mods and admins can call
export function FollowersTab({
  communityId,
  active,
}: {
  communityId: number;
  /** Only fetch once the tab is opened */
  active: boolean;
}) {
  const followersQuery = useCommunityFollowersQuery({
    communityId: active ? communityId : undefined,
  });
  const followers =
    followersQuery.data?.pages.flatMap((p) => p.followers) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-bold">Followers</h2>
      {followers.map((follower) => (
        <FollowerRow key={follower.personApId} follower={follower} />
      ))}
      {followersQuery.isSuccess && followers.length === 0 && (
        <p className="text-sm text-muted-foreground">No followers yet.</p>
      )}
      {followersQuery.hasNextPage && (
        <LoadingButton
          variant="outline"
          className="self-start"
          loading={followersQuery.isFetchingNextPage}
          onClick={() => followersQuery.fetchNextPage()}
        >
          Load more
        </LoadingButton>
      )}
    </div>
  );
}
