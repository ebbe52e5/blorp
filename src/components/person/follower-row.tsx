import dayjs from "dayjs";
import { Schemas } from "@/src/apis/api-blueprint";
import { DateTime } from "@/src/components/datetime";
import { PersonCard } from "@/src/components/person/person-card";
import { Badge } from "@/src/components/ui/badge";
import { useProfileFromStore } from "@/src/stores/profiles";

export function FollowerRow({
  follower,
}: {
  follower: Schemas.CommunityFollower;
}) {
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
