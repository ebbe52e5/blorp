import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV4Api } from "./lemmy-v4";
import { LemmyV3Api } from "./lemmy-v3";
import { PieFedApi } from "./piefed";
import { Errors } from "./api-blueprint";

manageFetchMockGlobally();

const INSTANCE = "https://lemmy.example";

const INVITE = {
  token: "aB3dE5gH",
  max_uses: 1,
  uses_count: 0,
  published_at: "2026-10-12T13:00:00Z",
};

function lastRequest() {
  const call = fetchMock.callHistory.lastCall();
  return { url: String(call?.url), method: call?.options.method };
}

function lastBody() {
  const call = fetchMock.callHistory.lastCall();
  return JSON.parse(String(call?.options.body));
}

describe("LemmyV4Api invitations", () => {
  let api: LemmyV4Api;

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

  test("creates a single-use invite", async () => {
    mockRoute("/api/v4/account/invite", { invite: INVITE }, "post");

    const invitation = await api.createInvitation();

    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/account/invite`,
      method: "post",
    });
    expect(lastBody()).toEqual({ max_uses: 1 });
    expect(invitation).toEqual({
      token: "aB3dE5gH",
      createdAt: "2026-10-12T13:00:00Z",
      usesCount: 0,
      maxUses: 1,
    });
  });

  test("lists invites", async () => {
    mockRoute("/api/v4/account/invite/list", {
      items: [INVITE],
      next_page: "next",
    });

    const res = await api.getInvitations({});

    expect(new URL(lastRequest().url).pathname).toBe(
      "/api/v4/account/invite/list",
    );
    expect(res.invitations.map((i) => i.token)).toEqual(["aB3dE5gH"]);
    expect(res.nextCursor).toBe("next");
  });

  test("revokes an invite by token", async () => {
    mockRoute("/api/v4/account/invite", { success: true }, "delete");

    await api.revokeInvitation({ token: "aB3dE5gH" });

    expect(lastRequest().method).toBe("delete");
    expect(lastBody()).toEqual({ token: "aB3dE5gH" });
  });

  test("sends the invite code when registering", async () => {
    mockRoute("/api/v4/account/auth/register", {
      jwt: "new-jwt",
      registration_created: false,
      verify_email_sent: false,
    });

    await api.register({
      username: "newuser",
      password: "hunter22",
      repeatPassword: "hunter22",
      inviteCode: "aB3dE5gH",
    });

    expect(lastBody()).toMatchObject({
      username: "newuser",
      token: "aB3dE5gH",
    });
  });

  test("switches the registration mode to require invitations", async () => {
    mockRoute("/api/v4/site", { site_view: {} }, "put");

    await api.setRegistrationMode({ mode: "RequireInvitation" });

    expect(lastRequest().method).toBe("put");
    expect(lastBody()).toEqual({ registration_mode: "require_invitation" });

    await api.setRegistrationMode({ mode: "RequireApplication" });
    expect(lastBody()).toEqual({ registration_mode: "require_application" });
  });
});

describe("invitations on other backends", () => {
  test("Lemmy v3 and PieFed aren't supported", async () => {
    for (const api of [
      new LemmyV3Api({ instance: INSTANCE, softwareVersion: "0.19" }),
      new PieFedApi({ instance: INSTANCE, softwareVersion: "1.0" }),
    ]) {
      await expect(api.getInvitations()).rejects.toBe(Errors.NOT_IMPLEMENTED);
      await expect(api.createInvitation()).rejects.toBe(Errors.NOT_IMPLEMENTED);
      await expect(api.revokeInvitation()).rejects.toBe(Errors.NOT_IMPLEMENTED);
      await expect(api.setRegistrationMode()).rejects.toBe(
        Errors.NOT_IMPLEMENTED,
      );
    }
  });
});
