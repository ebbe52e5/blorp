import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV4Api } from "./lemmy-v4";
import { LemmyV3Api } from "./lemmy-v3";
import { PieFedApi } from "./piefed";
import { Errors } from "./api-blueprint";

manageFetchMockGlobally();

const INSTANCE = "https://lemmy.example";

const person = (id: number, name: string) => ({
  id,
  name,
  ap_id: `${INSTANCE}/u/${name}`,
  instance_id: 1,
  published_at: "2026-10-12T00:00:00Z",
  bot_account: false,
  deleted: false,
  local: true,
  post_count: 0,
  comment_count: 0,
});

const commentView = (
  id: number,
  name: string,
  personActions?: { note?: string },
) => ({
  comment: {
    id,
    ap_id: `${INSTANCE}/comment/${id}`,
    content: "Hi",
    path: `0.${id}`,
    published_at: "2026-10-12T00:00:00Z",
    locked: false,
    deleted: false,
    removed: false,
    upvotes: 0,
    downvotes: 0,
    child_count: 0,
  },
  post: { id: 4, name: "Hello", ap_id: `${INSTANCE}/post/4` },
  community: { id: 3, name: "news", ap_id: `${INSTANCE}/c/news` },
  creator: person(id + 10, name),
  creator_banned_from_community: false,
  person_actions: personActions,
});

describe("LemmyV4Api person notes", () => {
  let api: LemmyV4Api;

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  test("comment creators carry the viewer's note, or null", async () => {
    fetchMock.mockGlobal().route(
      ({ url }) => url.split("?")[0]!.endsWith("/api/v4/comment/list"),
      JSON.stringify({
        items: [
          commentView(1, "alice", { note: "Old friend" }),
          commentView(2, "bob", undefined),
        ],
      }),
    );

    const { creators } = await api.getComments(
      { postApId: `${INSTANCE}/post/4` },
      {},
    );

    expect(creators.map((c) => [c.handle, c.note])).toEqual([
      ["alice@lemmy.example", "Old friend"],
      ["bob@lemmy.example", null],
    ]);
  });

  test("notePerson sends the note", async () => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.split("?")[0]!.endsWith("/api/v4/person/note"),
        JSON.stringify({ success: true }),
      );

    await api.notePerson({ personId: 11, note: "Old friend" });

    const call = fetchMock.callHistory.lastCall();
    expect(call?.options.method).toBe("post");
    expect(JSON.parse(String(call?.options.body))).toEqual({
      person_id: 11,
      note: "Old friend",
    });
  });
});

describe("person notes on other backends", () => {
  test("Lemmy v3 and PieFed aren't supported", async () => {
    for (const api of [
      new LemmyV3Api({ instance: INSTANCE, softwareVersion: "0.19" }),
      new PieFedApi({ instance: INSTANCE, softwareVersion: "1.0" }),
    ]) {
      await expect(api.notePerson()).rejects.toBe(Errors.NOT_IMPLEMENTED);
    }
  });
});
