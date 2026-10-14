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
