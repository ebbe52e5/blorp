import dayjs from "dayjs";
import { Schemas } from "@/src/apis/api-blueprint";
import { DateTime } from "@/src/components/datetime";
import { PersonCard } from "@/src/components/person/person-card";
import { Badge } from "@/src/components/ui/badge";
import { LoadingButton } from "@/src/components/ui/button";
import { useCommunityFollowersQuery } from "@/src/queries";
import { useProfileFromStore } from "@/src/stores/profiles";

function FollowerRow({ follower }: { follower: Schemas.CommunityFollower }) {
  const person = useProfileFromStore(follower.personApId);
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <PersonCard actorId={follower.personApId} size="sm" />
        {follower.isBanned && <Badge variant="destructive">Banned</Badge>}
        {follower.isBannedFromCommunity && (
          <Badge variant="destructive">Banned from community</Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Registered{" "}
          {person ? <DateTime date={dayjs(person.createdAt)} /> : "-"}
        </span>
        <span>
          Followed{" "}
          {follower.followedAt ? (
            <DateTime date={dayjs(follower.followedAt)} />
          ) : (
            "-"
          )}
        </span>
      </div>
    </div>
  );
}

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
