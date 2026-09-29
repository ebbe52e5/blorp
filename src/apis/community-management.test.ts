import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV4Api } from "./lemmy-v4";
import { LemmyV3Api } from "./lemmy-v3";
import { PieFedApi } from "./piefed";
import { Errors } from "./api-blueprint";

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
  });
});
