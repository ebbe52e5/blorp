import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV4Api } from "./lemmy-v4";

manageFetchMockGlobally();

const INSTANCE = "https://lemmy.example";

const PERSON = {
  id: 2,
  name: "alice",
  ap_id: `${INSTANCE}/u/alice`,
  instance_id: 1,
  published_at: "2026-10-12T00:00:00Z",
  bot_account: false,
  deleted: false,
  local: true,
  post_count: 0,
  comment_count: 0,
};

const COMMUNITY = {
  id: 3,
  name: "news",
  ap_id: `${INSTANCE}/c/news`,
  instance_id: 1,
  nsfw: false,
};

const POST = {
  id: 4,
  name: "Hello",
  ap_id: `${INSTANCE}/post/4`,
  published_at: "2026-10-12T00:00:00Z",
  locked: false,
  deleted: false,
  removed: false,
  nsfw: false,
  featured_community: false,
  featured_local: false,
  upvotes: 5,
  downvotes: 1,
  comments: 0,
};

const COMMENT = {
  id: 6,
  ap_id: `${INSTANCE}/comment/6`,
  content: "Hi",
  path: "0.6",
  published_at: "2026-10-12T00:00:00Z",
  locked: false,
  deleted: false,
  removed: false,
  upvotes: 2,
  downvotes: 0,
  child_count: 0,
};

describe("LemmyV4Api my vote", () => {
  let api: LemmyV4Api;

  const mockRoute = (path: string, body: unknown) =>
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.split("?")[0]!.endsWith(path),
        JSON.stringify(body),
      );

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  // Lemmy keeps the actions row for read and saved state after a vote is
  // removed, with vote_is_upvote unset
  test.each([
    [undefined, { read_at: "2026-10-12T00:00:00Z" }, 0],
    [undefined, undefined, 0],
    [true, { read_at: "2026-10-12T00:00:00Z" }, 1],
    [false, { read_at: "2026-10-12T00:00:00Z" }, -1],
  ])(
    "a post with vote_is_upvote = %s and actions %o has myVote %s",
    async (isUpvote, actions, myVote) => {
      mockRoute("/api/v4/post/like", {
        post_view: {
          post: POST,
          community: COMMUNITY,
          creator: PERSON,
          creator_banned_from_community: false,
          post_actions: actions && { ...actions, vote_is_upvote: isUpvote },
          tags: [],
        },
      });

      const post = await api.likePost({
        postId: POST.id,
        score: 0,
      });

      expect(post.myVote).toBe(myVote);
    },
  );

  test.each([
    [undefined, { saved_at: "2026-10-12T00:00:00Z" }, 0],
    [true, { saved_at: "2026-10-12T00:00:00Z" }, 1],
    [false, {}, -1],
  ])(
    "a comment with vote_is_upvote = %s and actions %o has myVote %s",
    async (isUpvote, actions, myVote) => {
      mockRoute("/api/v4/comment/like", {
        comment_view: {
          comment: COMMENT,
          post: POST,
          community: COMMUNITY,
          creator: PERSON,
          creator_banned_from_community: false,
          comment_actions: { ...actions, vote_is_upvote: isUpvote },
        },
      });

      const comment = await api.likeComment({
        id: COMMENT.id,
        postId: POST.id,
        score: 0,
      });

      expect(comment.myVote).toBe(myVote);
    },
  );
});

describe("LemmyV4Api editPost", () => {
  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
  });

  test.each([true, false])("sends nsfw = %s", async (nsfw) => {
    fetchMock.mockGlobal().route(
      ({ url }) => url.split("?")[0]!.endsWith("/api/v4/post"),
      JSON.stringify({
        post_view: {
          post: { ...POST, nsfw },
          community: COMMUNITY,
          creator: PERSON,
          creator_banned_from_community: false,
          tags: [],
        },
      }),
    );
    const api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });

    const post = await api.editPost({
      apId: POST.ap_id,
      title: POST.name,
      url: null,
      body: null,
      altText: null,
      thumbnailUrl: null,
      nsfw,
    });

    expect(
      JSON.parse(String(fetchMock.callHistory.lastCall()?.options.body)),
    ).toMatchObject({ post_id: POST.id, nsfw });
    expect(post.nsfw).toBe(nsfw);
  });
});
