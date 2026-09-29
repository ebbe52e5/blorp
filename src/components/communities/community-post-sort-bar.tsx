import { PostCardStyleButton, PostSortButton } from "../lemmy-sort";
import { Button } from "../ui/button";
import { CommunityJoinButton } from "./community-join-button";
import { CommunityCreatePost } from "./community-create-post";
import { StickyFilterBar } from "../sticky-filter-bar";
import { Handle } from "@/src/lib/handle";
import { CommunityTagFilter } from "./community-tag-filter";

export function CommunityPostSortBar({
  communityHandle,
  tagId,
  onTagIdChange,
}: {
  communityHandle: Handle | undefined;
  tagId: number | undefined;
  onTagIdChange: (tagId: number | undefined) => void;
}) {
  return (
    <StickyFilterBar className="max-md:hidden">
      <PostSortButton align="start" variant="button" />
      <PostCardStyleButton align="start" variant="button" />
      <CommunityTagFilter
        communityHandle={communityHandle}
        tagId={tagId}
        onChange={onTagIdChange}
      />
      <div className="flex-1" />
      <CommunityCreatePost
        communityHandle={communityHandle}
        renderButton={(props) => (
          <Button size="sm" variant="outline" {...props}>
            Create post
          </Button>
        )}
      />
      <CommunityJoinButton communityHandle={communityHandle} />
    </StickyFilterBar>
  );
}
