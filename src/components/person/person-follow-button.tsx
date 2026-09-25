import _ from "lodash";
import { LoadingButton } from "../ui/button";
import { useFollowPersonMutation } from "@/src/queries/index";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { useConfirmationAlert } from "@/src/hooks";
import { Schemas } from "@/src/apis/api-blueprint";
import { parseHandle } from "@/src/lib/handle";

export function PersonFollowButton({
  person,
  className,
}: {
  person: Schemas.Person | undefined;
  className?: string;
}) {
  const getConfirmation = useConfirmationAlert();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const myApId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.apId,
  );
  const follow = useFollowPersonMutation();

  // Person follows need backend support, which is signaled by
  // the backend sending a follower count.
  if (
    !person ||
    !isLoggedIn ||
    person.apId === myApId ||
    !_.isNumber(person.followerCount)
  ) {
    return null;
  }

  const followed = person.followed ?? false;

  return (
    <LoadingButton
      size="sm"
      loading={follow.isPending}
      variant={followed ? "outline" : "default"}
      className={className}
      onClick={() => {
        if (followed) {
          getConfirmation({
            message: `Are you sure you want to unfollow ${parseHandle(person.handle).name}?`,
            confirmText: "Unfollow",
            danger: true,
          }).then(() => follow.mutate({ person, follow: false }));
        } else {
          follow.mutate({ person, follow: true });
        }
      }}
    >
      {followed ? "Following" : "Follow"}
    </LoadingButton>
  );
}
