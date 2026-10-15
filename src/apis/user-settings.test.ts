import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV4Api } from "./lemmy-v4";

manageFetchMockGlobally();

const INSTANCE = "https://lemmy.example";

const IMAGE = () => new File(["x"], "me.png", { type: "image/png" });

function requests() {
  return fetchMock.callHistory
    .calls()
    .map((call) => `${call.options.method} ${new URL(call.url).pathname}`);
}

describe("LemmyV4Api saveUserSettings", () => {
  let api: LemmyV4Api;

  const mockRoute = (path: string, body: unknown, status = 200) =>
    fetchMock
      .mockGlobal()
      .route(({ url }) => url.split("?")[0]!.endsWith(path), {
        status,
        body: JSON.stringify(body),
      });

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  test("uploads an avatar to /account/avatar without saving other settings", async () => {
    mockRoute("/api/v4/account/avatar", {
      image_url: `${INSTANCE}/pictrs/image/me.png`,
      filename: "me.png",
    });

    await api.saveUserSettings({ avatar: IMAGE() });

    expect(requests()).toEqual(["post /api/v4/account/avatar"]);
    const body = fetchMock.callHistory.lastCall()?.options.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("images[]")).toBeInstanceOf(File);
  });

  test("uploads the banner and saves the other settings", async () => {
    mockRoute("/api/v4/account/banner", {
      image_url: `${INSTANCE}/pictrs/image/banner.png`,
      filename: "banner.png",
    });
    mockRoute("/api/v4/account/settings/save", { success: true });

    await api.saveUserSettings({ banner: IMAGE(), bio: "hello" });

    expect(requests()).toEqual([
      "post /api/v4/account/banner",
      "put /api/v4/account/settings/save",
    ]);
    expect(
      JSON.parse(String(fetchMock.callHistory.lastCall()?.options.body)),
    ).toEqual({ bio: "hello" });
  });

  test("throws when the upload fails", async () => {
    mockRoute("/api/v4/account/avatar", { error: "unknown" }, 500);

    await expect(api.saveUserSettings({ avatar: IMAGE() })).rejects.toThrow();
  });

  test.each([
    [true, "show"],
    [false, "hide"],
  ] as const)(
    "saves the vote display with showDownvotes = %s",
    async (showDownvotes, wire) => {
      mockRoute("/api/v4/account/settings/save", { success: true });

      await api.saveUserSettings({
        showScores: false,
        showUpvotes: true,
        showDownvotes,
      });

      expect(
        JSON.parse(String(fetchMock.callHistory.lastCall()?.options.body)),
      ).toEqual({
        show_score: false,
        show_upvotes: true,
        show_downvotes: wire,
      });
    },
  );
});

describe("LemmyV4Api saveUserSettings account filters", () => {
  test("saves the filter, scroll and language settings", async () => {
    fetchMock.removeRoutes().clearHistory();
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) =>
          url.split("?")[0]!.endsWith("/api/v4/account/settings/save"),
        JSON.stringify({ success: true }),
      );
    const api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });

    await api.saveUserSettings({
      showReadPosts: false,
      showBotAccounts: true,
      blockingKeywords: ["spoiler", "leak"],
      infiniteScrollEnabled: false,
      interfaceLanguage: "en",
    });

    expect(
      JSON.parse(String(fetchMock.callHistory.lastCall()?.options.body)),
    ).toEqual({
      show_read_posts: false,
      show_bot_accounts: true,
      blocking_keywords: ["spoiler", "leak"],
      infinite_scroll_enabled: false,
      interface_language: "en",
    });
  });
});

describe("LemmyV4Api getSite user settings", () => {
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

  const SITE = {
    admins: [],
    all_languages: [],
    discussion_languages: [],
    version: "1.0.0",
    captcha_enabled: false,
    site_view: {
      site: { name: "Example" },
      local_site: { registration_mode: "open" },
    },
  };

  const myUser = (localUser: object) => ({
    local_user_view: {
      person: PERSON,
      local_user: {
        show_nsfw: true,
        blur_nsfw: false,
        show_score: false,
        show_upvotes: true,
        show_downvotes: "hide",
        show_read_posts: false,
        show_bot_accounts: false,
        infinite_scroll_enabled: true,
        interface_language: "browser",
        ...localUser,
      },
    },
    keyword_blocks: ["spoiler"],
    moderates: [],
    follows: [],
    person_blocks: [],
    community_blocks: [],
    instance_communities_blocks: [],
    instance_persons_blocks: [],
  });

  const getSite = async (localUser: object = {}) => {
    fetchMock.removeRoutes().clearHistory();
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.split("?")[0]!.endsWith("/api/v4/site"),
        JSON.stringify(SITE),
      )
      .route(
        ({ url }) => url.split("?")[0]!.endsWith("/api/v4/account"),
        JSON.stringify(myUser(localUser)),
      );
    const api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
    return (await api.getSite({})).site;
  };

  test("maps the account's email, NSFW and vote settings", async () => {
    const site = await getSite({ email: "alice@example.com" });

    expect(site).toMatchObject({
      myEmail: "alice@example.com",
      showNsfw: true,
      blurNsfw: false,
      showScores: false,
      showUpvotes: true,
      showDownvotes: false,
      showReadPosts: false,
      showBotAccounts: false,
      blockingKeywords: ["spoiler"],
      infiniteScrollEnabled: true,
      interfaceLanguage: "browser",
    });
  });

  test.each([
    ["show", true],
    ["show_for_others", true],
    ["hide", false],
  ])("maps show_downvotes = %s", async (showDownvotes, expected) => {
    const site = await getSite({ show_downvotes: showDownvotes });
    expect(site.showDownvotes).toBe(expected);
  });
});

describe("LemmyV4Api changePassword", () => {
  let api: LemmyV4Api;

  const mockRoute = (path: string, body: unknown, status = 200) =>
    fetchMock
      .mockGlobal()
      .route(({ url }) => url.split("?")[0]!.endsWith(path), {
        status,
        body: JSON.stringify(body),
      });

  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
    api = new LemmyV4Api({
      instance: INSTANCE,
      jwt: "jwt",
      softwareVersion: "1.0.0",
    });
  });

  test("sends the passwords and returns the new jwt", async () => {
    mockRoute("/api/v4/account/auth/change_password", {
      jwt: "new-jwt",
      registration_created: false,
      verify_email_sent: false,
    });

    const res = await api.changePassword({
      newPassword: "new-pass",
      newPasswordVerify: "new-pass",
      oldPassword: "old-pass",
    });

    expect(res).toEqual({ jwt: "new-jwt" });
    expect(requests()).toEqual(["put /api/v4/account/auth/change_password"]);
    expect(
      JSON.parse(String(fetchMock.callHistory.lastCall()?.options.body)),
    ).toEqual({
      new_password: "new-pass",
      new_password_verify: "new-pass",
      old_password: "old-pass",
    });
  });

  test("throws on a wrong old password", async () => {
    mockRoute(
      "/api/v4/account/auth/change_password",
      { error: "incorrect_login" },
      400,
    );

    await expect(
      api.changePassword({
        newPassword: "new-pass",
        newPasswordVerify: "new-pass",
        oldPassword: "wrong",
      }),
    ).rejects.toThrow();
  });
});
