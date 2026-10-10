import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV4Api } from "./lemmy-v4";
import { LemmyV3Api } from "./lemmy-v3";
import { PieFedApi } from "./piefed";
import { Errors } from "./api-blueprint";
import { getCommunityTagColors } from "../lib/community-tag-colors";

manageFetchMockGlobally();

const INSTANCE = "https://lemmy.example";

const COMMUNITY = {
  id: 7,
  name: "cats",
  title: "Cats",
  ap_id: `${INSTANCE}/c/cats`,
  instance_id: 1,
  nsfw: false,
  published_at: "2026-09-29T00:00:00Z",
  users_active_day: 0,
  users_active_week: 0,
  users_active_month: 0,
  users_active_half_year: 0,
  posts: 0,
  comments: 0,
  subscribers: 1,
  subscribers_local: 1,
};

const PERSON = {
  id: 3,
  name: "alice",
  ap_id: `${INSTANCE}/u/alice`,
  instance_id: 1,
  published_at: "2026-09-29T00:00:00Z",
  bot_account: false,
  deleted: false,
  local: true,
  post_count: 0,
  comment_count: 0,
};

const MULTI = {
  id: 9,
  name: "pets",
  ap_id: `${INSTANCE}/m/pets`,
  published_at: "2026-09-29T00:00:00Z",
  subscribers: 0,
  communities: 0,
};

function lastBody() {
  const call = fetchMock.callHistory.lastCall();
  return JSON.parse(String(call?.options.body));
}

function lastRequest() {
  const call = fetchMock.callHistory.lastCall();
  return { url: call?.url, method: call?.options.method };
}

describe("LemmyV4Api community creation", () => {
  let api: LemmyV4Api;

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  test("createCommunity sends exactly lemmy-ui's fields", async () => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.endsWith("/api/v4/community"),
        JSON.stringify({ community_view: { community: COMMUNITY } }),
      );

    const community = await api.createCommunity({
      name: "cats",
      title: "Cats",
      summary: "All about cats",
      sidebar: "# Rules",
      nsfw: false,
      postingRestrictedToMods: true,
      discussionLanguages: [0, 37],
      visibility: "unlisted",
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/community`,
      method: "post",
    });
    expect(lastBody()).toEqual({
      name: "cats",
      title: "Cats",
      summary: "All about cats",
      sidebar: "# Rules",
      nsfw: false,
      posting_restricted_to_mods: true,
      discussion_languages: [0, 37],
      visibility: "unlisted",
    });
    expect(community.apId).toBe(COMMUNITY.ap_id);
  });

  test("createCommunity omits untouched fields", async () => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.endsWith("/api/v4/community"),
        JSON.stringify({ community_view: { community: COMMUNITY } }),
      );

    await api.createCommunity({ name: "cats" });

    expect(lastBody()).toEqual({ name: "cats" });
  });

  test("createMultiCommunityFeed sends name, title and summary", async () => {
    fetchMock.mockGlobal().route(
      ({ url }) => url.endsWith("/api/v4/multi_community"),
      JSON.stringify({
        multi_community_view: { multi: MULTI, owner: PERSON },
      }),
    );

    const feed = await api.createMultiCommunityFeed({
      name: "pets",
      title: "Pets",
      summary: "Cats and dogs",
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/multi_community`,
      method: "post",
    });
    expect(lastBody()).toEqual({
      name: "pets",
      title: "Pets",
      summary: "Cats and dogs",
    });
    expect(feed.apId).toBe(MULTI.ap_id);
  });
});

describe("LemmyV4Api multi-community settings", () => {
  let api: LemmyV4Api;

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  test("addMultiCommunityFeedEntry posts the entry", async () => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.endsWith("/api/v4/multi_community/entry"),
        JSON.stringify({ community_view: { community: COMMUNITY } }),
      );

    const community = await api.addMultiCommunityFeedEntry({
      feedId: MULTI.id,
      communityId: COMMUNITY.id,
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/multi_community/entry`,
      method: "post",
    });
    expect(lastBody()).toEqual({ id: MULTI.id, community_id: COMMUNITY.id });
    expect(community.apId).toBe(COMMUNITY.ap_id);
  });

  test("removeMultiCommunityFeedEntry deletes the entry", async () => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.endsWith("/api/v4/multi_community/entry"),
        JSON.stringify({ success: true }),
      );

    await api.removeMultiCommunityFeedEntry({
      feedId: MULTI.id,
      communityId: COMMUNITY.id,
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/multi_community/entry`,
      method: "delete",
    });
    expect(lastBody()).toEqual({ id: MULTI.id, community_id: COMMUNITY.id });
  });

  test("editMultiCommunityFeed sends only the edited fields", async () => {
    fetchMock.mockGlobal().route(
      ({ url }) => url.endsWith("/api/v4/multi_community"),
      JSON.stringify({
        multi_community_view: {
          multi: { ...MULTI, title: "Pets", deleted: true },
          owner: PERSON,
        },
      }),
    );

    const feed = await api.editMultiCommunityFeed({
      feedId: MULTI.id,
      deleted: true,
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/multi_community`,
      method: "put",
    });
    expect(lastBody()).toEqual({ id: MULTI.id, deleted: true });
    expect(feed.deleted).toBe(true);
    expect(feed.title).toBe("Pets");
    // Edit responses don't carry communities, so the cached list is kept
    expect("communityHandles" in feed).toBe(false);
  });

  test("searchCommunitiesForFeed matches lemmy-ui's query and filtering", async () => {
    const community = (
      id: number,
      extra: Record<string, unknown> = {},
      view: Record<string, unknown> = {},
    ) => ({
      community: {
        ...COMMUNITY,
        id,
        name: `c${id}`,
        ap_id: `${INSTANCE}/c/c${id}`,
        ...extra,
      },
      can_mod: false,
      ...view,
    });

    fetchMock.mockGlobal().route(
      ({ url }) => url.includes("/api/v4/community/list"),
      JSON.stringify({
        items: [
          community(1),
          community(2, { posting_restricted_to_mods: true }),
          community(3, { posting_restricted_to_mods: true }, { can_mod: true }),
          community(4, { visibility: "private" }),
          community(
            5,
            { visibility: "private" },
            { community_actions: { follow_state: "accepted" } },
          ),
        ],
      }),
    );

    const communities = await api.searchCommunitiesForFeed({ q: "ca" }, {});

    const url = new URL(String(lastRequest().url));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search_term: "ca",
      sort: "active_monthly",
      type_: "all",
      search_title_only: "true",
    });
    expect(communities.map((c) => c.id)).toEqual([1, 3, 5]);
  });

  test("list endpoint leaves communityHandles undefined", async () => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.includes("/api/v4/multi_community/list"),
        JSON.stringify({ items: [{ multi: MULTI, owner: PERSON }] }),
      );

    const { multiCommunityFeeds } = await api.getMultiCommunityFeeds({});

    expect(multiCommunityFeeds[0]?.communityHandles).toBeUndefined();
  });
});

describe("LemmyV4Api community settings", () => {
  let api: LemmyV4Api;

  const TAG = {
    id: 4,
    ap_id: `${INSTANCE}/c/cats/tag/help`,
    name: "help",
    display_name: "Help",
    community_id: COMMUNITY.id,
    published_at: "2026-09-29T00:00:00Z",
    deleted: false,
    color: "color03",
  };

  const communityResponse = {
    community_view: {
      community: { ...COMMUNITY, visibility: "public" },
      can_mod: true,
      tags: [TAG],
    },
    discussion_languages: [0, 37],
  };

  const mockRoute = (path: string, body: unknown, method?: string) =>
    fetchMock
      .mockGlobal()
      .route(
        ({ url, options }) =>
          url.split("?")[0]!.endsWith(path) &&
          (!method || options.method === method),
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

  test("getCommunity maps settings fields and keeps mod order", async () => {
    mockRoute("/api/v4/community", {
      ...communityResponse,
      moderators: [
        { community: COMMUNITY, moderator: PERSON },
        { community: COMMUNITY, moderator: { ...PERSON, id: 5, name: "bob" } },
      ],
    });

    const { community, mods } = await api.getCommunity(
      { handle: "cats@lemmy.example" },
      {},
    );

    expect(community).toMatchObject({
      title: "Cats",
      visibility: "public",
      canMod: true,
      discussionLanguages: [0, 37],
      tags: [
        {
          id: 4,
          name: "help",
          displayName: "Help",
          summary: null,
          color: "color03",
          deleted: false,
        },
      ],
    });
    expect(mods.map((m) => m.id)).toEqual([3, 5]);
  });

  test("editCommunity sends lemmy-ui's edit fields", async () => {
    mockRoute("/api/v4/community", communityResponse, "put");

    await api.editCommunity({
      communityId: COMMUNITY.id,
      title: "Cats",
      summary: "All about cats",
      sidebar: "# Rules",
      nsfw: false,
      postingRestrictedToMods: false,
      discussionLanguages: [37],
      visibility: "private",
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/community`,
      method: "put",
    });
    expect(lastBody()).toEqual({
      community_id: COMMUNITY.id,
      title: "Cats",
      summary: "All about cats",
      sidebar: "# Rules",
      nsfw: false,
      posting_restricted_to_mods: false,
      discussion_languages: [37],
      visibility: "private",
    });
  });

  test("deleteCommunity", async () => {
    mockRoute("/api/v4/community", communityResponse, "delete");

    await api.deleteCommunity({ communityId: COMMUNITY.id, deleted: true });

    expect(lastRequest().method).toBe("delete");
    expect(lastBody()).toEqual({ community_id: COMMUNITY.id, deleted: true });
  });

  test("uploadCommunityImage posts to /community/icon with the id", async () => {
    mockRoute("/api/v4/community/icon", {
      image_url: `${INSTANCE}/pictrs/image/a.png`,
      filename: "a.png",
    });

    const res = await api.uploadCommunityImage({
      communityId: COMMUNITY.id,
      kind: "icon",
      image: new File(["x"], "a.png", { type: "image/png" }),
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/community/icon?id=${COMMUNITY.id}`,
      method: "post",
    });
    expect(res.url).toBe(`${INSTANCE}/pictrs/image/a.png`);
  });

  test("deleteCommunityImage deletes the banner", async () => {
    mockRoute("/api/v4/community/banner", { success: true });

    await api.deleteCommunityImage({
      communityId: COMMUNITY.id,
      kind: "banner",
    });

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/community/banner`,
      method: "delete",
    });
    expect(lastBody()).toEqual({ id: COMMUNITY.id });
  });

  test("addCommunityMod returns the new mod list", async () => {
    mockRoute("/api/v4/community/mod", {
      moderators: [{ community: COMMUNITY, moderator: PERSON }],
    });

    const mods = await api.addCommunityMod({
      communityId: COMMUNITY.id,
      personId: PERSON.id,
      added: true,
    });

    expect(lastRequest().method).toBe("post");
    expect(lastBody()).toEqual({
      community_id: COMMUNITY.id,
      person_id: PERSON.id,
      added: true,
    });
    expect(mods.map((m) => m.id)).toEqual([PERSON.id]);
  });

  test("transferCommunity", async () => {
    mockRoute("/api/v4/community/transfer", {
      ...communityResponse,
      moderators: [{ community: COMMUNITY, moderator: PERSON }],
    });

    await api.transferCommunity({
      communityId: COMMUNITY.id,
      personId: PERSON.id,
    });

    expect(lastRequest().method).toBe("post");
    expect(lastBody()).toEqual({
      community_id: COMMUNITY.id,
      person_id: PERSON.id,
    });
  });

  test("searchPersonsForMod matches lemmy-ui's user search", async () => {
    mockRoute("/api/v4/person/list", {
      items: [{ person: PERSON, is_admin: false, banned: false }],
    });

    const persons = await api.searchPersonsForMod({ q: "al" }, {});

    const url = new URL(String(lastRequest().url));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search_term: "al",
      sort: "comment_score",
      type_: "all",
    });
    expect(persons.map((p) => p.id)).toEqual([PERSON.id]);
  });

  test("getCommunityFollowers lists persons by community_id", async () => {
    mockRoute("/api/v4/person/list", {
      items: [
        {
          person: PERSON,
          is_admin: false,
          banned: false,
          community_actions: {
            followed_at: "2026-09-28T00:00:00Z",
            received_ban_at: "2026-09-29T00:00:00Z",
          },
        },
      ],
      next_page: "cursor2",
    });

    const res = await api.getCommunityFollowers(
      { communityId: COMMUNITY.id, pageCursor: "cursor1" },
      {},
    );

    const url = new URL(String(lastRequest().url));
    expect(url.searchParams.get("community_id")).toBe(String(COMMUNITY.id));
    expect(url.searchParams.get("page_cursor")).toBe("cursor1");
    expect(res.followers).toEqual([
      {
        personApId: PERSON.ap_id,
        followedAt: "2026-09-28T00:00:00Z",
        isBanned: false,
        isBannedFromCommunity: true,
      },
    ]);
    expect(res.nextCursor).toBe("cursor2");
  });

  test("getMultiCommunityFeedFollowers lists persons by multi_community_id", async () => {
    mockRoute("/api/v4/person/list", {
      items: [
        {
          person: PERSON,
          is_admin: false,
          banned: false,
          multi_community_follow: { followed_at: "2026-10-10T00:00:00Z" },
        },
      ],
      next_page: "cursor2",
    });

    const res = await api.getMultiCommunityFeedFollowers(
      { feedId: 7, pageCursor: "cursor1" },
      {},
    );

    const url = new URL(String(lastRequest().url));
    expect(url.searchParams.get("multi_community_id")).toBe("7");
    expect(url.searchParams.get("community_id")).toBeNull();
    expect(url.searchParams.get("page_cursor")).toBe("cursor1");
    expect(res.followers).toEqual([
      {
        personApId: PERSON.ap_id,
        followedAt: "2026-10-10T00:00:00Z",
        isBanned: false,
        isBannedFromCommunity: false,
      },
    ]);
    expect(res.persons.map((p) => p.apId)).toEqual([PERSON.ap_id]);
    expect(res.nextCursor).toBe("cursor2");
  });

  test("community tag create, edit and delete", async () => {
    mockRoute("/api/v4/community/tag", TAG);

    await api.createCommunityTag({ communityId: COMMUNITY.id, name: "help" });
    expect(lastRequest().method).toBe("post");
    expect(lastBody()).toEqual({ community_id: COMMUNITY.id, name: "help" });

    await api.editCommunityTag({
      tagId: TAG.id,
      displayName: "Help",
      summary: "Questions",
      color: "color03",
    });
    expect(lastRequest().method).toBe("put");
    expect(lastBody()).toEqual({
      tag_id: TAG.id,
      display_name: "Help",
      summary: "Questions",
      color: "color03",
    });

    const tag = await api.deleteCommunityTag({ tagId: TAG.id, deleted: true });
    expect(lastRequest().method).toBe("delete");
    expect(lastBody()).toEqual({ tag_id: TAG.id, delete: true });
    expect(tag.id).toBe(TAG.id);
  });
});

describe("LemmyV4Api post tags", () => {
  let api: LemmyV4Api;

  const TAG = {
    id: 4,
    ap_id: `${INSTANCE}/c/cats/tag/help`,
    name: "help",
    display_name: "Help",
    community_id: COMMUNITY.id,
    published_at: "2026-09-29T00:00:00Z",
    deleted: false,
    color: "color03",
  };
  const DELETED_TAG = {
    ...TAG,
    id: 5,
    ap_id: `${INSTANCE}/c/cats/tag/old`,
    name: "old",
    display_name: undefined,
    deleted: true,
    color: "color09",
  };

  const POST = {
    id: 9,
    name: "Hello",
    ap_id: `${INSTANCE}/post/9`,
    published_at: "2026-09-29T00:00:00Z",
    upvotes: 1,
    downvotes: 0,
    comments: 0,
    deleted: false,
    removed: false,
    locked: false,
    nsfw: false,
    featured_community: false,
    featured_local: false,
  };

  const postView = {
    post: POST,
    community: COMMUNITY,
    creator: PERSON,
    creator_banned_from_community: false,
    tags: [TAG],
  };

  const EMPTY_POST_FORM = {
    communityHandle: "cats@lemmy.example",
    title: "Hello",
    url: null,
    body: null,
    nsfw: null,
    thumbnailUrl: null,
    altText: null,
  } satisfies Parameters<LemmyV4Api["createPost"]>[0];

  const communityResponse = {
    community_view: { community: COMMUNITY, tags: [TAG, DELETED_TAG] },
    moderators: [],
    discussion_languages: [],
  };

  const mockRoute = (path: string, body: unknown, method?: string) =>
    fetchMock
      .mockGlobal()
      .route(
        ({ url, options }) =>
          url.split("?")[0]!.endsWith(path) &&
          (!method || options.method === method),
        JSON.stringify(body),
      );

  const lastCallTo = (path: string) =>
    fetchMock.callHistory
      .calls()
      .filter((c) => c.url.split("?")[0]!.endsWith(path))
      .at(-1);

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  test("getPosts shows post tags as flairs", async () => {
    mockRoute("/api/v4/post/list", { items: [postView] });

    const { posts } = await api.getPosts({ type: "All" }, {});

    expect(posts[0]?.post.flairs).toEqual([{ id: TAG.id }]);
    expect(posts[0]?.flairs).toEqual([
      {
        id: TAG.id,
        apId: TAG.ap_id,
        title: "Help",
        backgroundColor: "#06b6d4",
        color: "#000000",
      },
    ]);
  });

  test("getPosts filters by tag with tag_id, like lemmy-ui", async () => {
    mockRoute("/api/v4/post/list", { items: [postView] });

    await api.getPosts(
      { type: "All", communityHandle: "cats@lemmy.example", tagId: TAG.id },
      {},
    );
    let url = new URL(String(lastRequest().url));
    expect(url.searchParams.get("tag_id")).toBe(String(TAG.id));
    expect(url.searchParams.get("community_name")).toBe("cats@lemmy.example");

    await api.getPosts({ type: "All" }, {});
    url = new URL(String(lastRequest().url));
    expect(url.searchParams.has("tag_id")).toBe(false);
  });

  test("getCommunity offers only non-deleted tags", async () => {
    mockRoute("/api/v4/community", communityResponse);

    const { flairs } = await api.getCommunity(
      { handle: "cats@lemmy.example" },
      {},
    );

    expect(flairs.map((f) => f.id)).toEqual([TAG.id]);
  });

  test("unknown tag colors fall back to the default badge", () => {
    expect(getCommunityTagColors("color09")).toEqual({
      backgroundColor: null,
      color: null,
    });
    expect(getCommunityTagColors(undefined)).toEqual({
      backgroundColor: null,
      color: null,
    });
  });

  test("createPost sends the picked tags' ids", async () => {
    mockRoute("/api/v4/community", communityResponse, "get");
    mockRoute("/api/v4/post", { post_view: postView }, "post");

    await api.createPost({
      ...EMPTY_POST_FORM,
      flairs: [{ title: "Help", apId: TAG.ap_id }],
    });

    const call = lastCallTo("/api/v4/post");
    expect(call?.options.method).toBe("post");
    expect(JSON.parse(String(call?.options.body)).tags).toEqual([TAG.id]);
  });

  test("createPost leaves tags out when none were picked", async () => {
    mockRoute("/api/v4/community", communityResponse, "get");
    mockRoute("/api/v4/post", { post_view: postView }, "post");

    await api.createPost(EMPTY_POST_FORM);

    const call = lastCallTo("/api/v4/post");
    expect(JSON.parse(String(call?.options.body))).not.toHaveProperty("tags");
  });

  test("editPost sends tags only when the form has flairs", async () => {
    mockRoute(
      "/api/v4/post",
      { post_view: postView, community_view: communityResponse.community_view },
      "get",
    );
    mockRoute("/api/v4/post", { post_view: postView }, "put");

    await api.editPost({
      apId: POST.ap_id,
      title: "Hello",
      flairs: [],
    } as unknown as Parameters<LemmyV4Api["editPost"]>[0]);
    let call = lastCallTo("/api/v4/post");
    expect(call?.options.method).toBe("put");
    expect(JSON.parse(String(call?.options.body)).tags).toEqual([]);

    fetchMock.clearHistory();
    await api.editPost({
      apId: POST.ap_id,
      title: "Hello",
    } as unknown as Parameters<LemmyV4Api["editPost"]>[0]);
    call = lastCallTo("/api/v4/post");
    expect(JSON.parse(String(call?.options.body))).not.toHaveProperty("tags");
  });
});

describe("community creation on other backends", () => {
  test("Lemmy v3 isn't supported", async () => {
    const api = new LemmyV3Api({ instance: INSTANCE, softwareVersion: "0.19" });
    await expect(api.createCommunity()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.createMultiCommunityFeed()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
    await expect(api.addMultiCommunityFeedEntry()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
    await expect(api.removeMultiCommunityFeedEntry()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
    await expect(api.editCommunity()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.addCommunityMod()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.createCommunityTag()).rejects.toBe(Errors.NOT_IMPLEMENTED);
  });

  test("PieFed isn't supported", async () => {
    const api = new PieFedApi({ instance: INSTANCE, softwareVersion: "1.0" });
    await expect(api.createCommunity()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.createMultiCommunityFeed()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
    await expect(api.addMultiCommunityFeedEntry()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
    await expect(api.removeMultiCommunityFeedEntry()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
    await expect(api.editCommunity()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.addCommunityMod()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.createCommunityTag()).rejects.toBe(Errors.NOT_IMPLEMENTED);
  });
});
