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

describe("community creation on other backends", () => {
  test("Lemmy v3 isn't supported", async () => {
    const api = new LemmyV3Api({ instance: INSTANCE, softwareVersion: "0.19" });
    await expect(api.createCommunity()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.createMultiCommunityFeed()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
  });

  test("PieFed isn't supported", async () => {
    const api = new PieFedApi({ instance: INSTANCE, softwareVersion: "1.0" });
    await expect(api.createCommunity()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    await expect(api.createMultiCommunityFeed()).rejects.toBe(
      Errors.NOT_IMPLEMENTED,
    );
  });
});
