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

const ADMIN = person(1, "admin");

const application = ({
  id,
  name,
  adminId,
  accepted,
  email,
  denyReason,
}: {
  id: number;
  name: string;
  adminId?: number;
  accepted: boolean;
  email?: string;
  denyReason?: string;
}) => ({
  registration_application: {
    id,
    local_user_id: id + 100,
    answer: `I'm ${name}`,
    admin_id: adminId,
    deny_reason: denyReason,
    published_at: "2026-10-12T12:37:22Z",
  },
  creator_local_user: {
    id: id + 100,
    person_id: id + 10,
    email,
    accepted_application: accepted,
  },
  creator: person(id + 10, name),
  admin: adminId ? ADMIN : undefined,
});

function lastRequest() {
  const call = fetchMock.callHistory.lastCall();
  return { url: String(call?.url), method: call?.options.method };
}

function lastBody() {
  const call = fetchMock.callHistory.lastCall();
  return JSON.parse(String(call?.options.body));
}

describe("LemmyV4Api registration applications", () => {
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

  test("lists applications with their status", async () => {
    mockRoute("/api/v4/admin/registration_application/list", {
      items: [
        application({ id: 5, name: "ethan", accepted: false, email: "e@x.io" }),
        application({ id: 4, name: "yihen", adminId: 1, accepted: true }),
        application({
          id: 3,
          name: "eve",
          adminId: 1,
          accepted: false,
          denyReason: "spam",
        }),
      ],
      next_page: "next",
    });

    const res = await api.getRegistrationApplications({ unreadOnly: true });

    const url = new URL(lastRequest().url);
    expect(url.searchParams.get("unread_only")).toBe("true");
    expect(res.nextCursor).toBe("next");
    expect(res.users.map((u) => u.apId)).toEqual([
      `${INSTANCE}/u/ethan`,
      `${INSTANCE}/u/yihen`,
      `${INSTANCE}/u/eve`,
    ]);
    expect(res.applications).toEqual([
      {
        id: 5,
        createdAt: "2026-10-12T12:37:22Z",
        personApId: `${INSTANCE}/u/ethan`,
        personHandle: "ethan@lemmy.example",
        answer: "I'm ethan",
        email: "e@x.io",
        status: "pending",
        adminApId: null,
        denyReason: null,
      },
      expect.objectContaining({
        id: 4,
        status: "approved",
        adminApId: `${INSTANCE}/u/admin`,
        email: null,
      }),
      expect.objectContaining({ id: 3, status: "denied", denyReason: "spam" }),
    ]);
  });

  test("approves and denies with a reason", async () => {
    mockRoute("/api/v4/admin/registration_application/approve", {
      registration_application: application({
        id: 5,
        name: "ethan",
        adminId: 1,
        accepted: true,
      }),
    });

    await api.approveRegistrationApplication({ id: 5, approve: true });
    expect(lastRequest()).toEqual({
      url: `${INSTANCE}/api/v4/admin/registration_application/approve`,
      method: "put",
    });
    expect(lastBody()).toEqual({ id: 5, approve: true });

    await api.approveRegistrationApplication({
      id: 5,
      approve: false,
      denyReason: "spam",
    });
    expect(lastBody()).toEqual({ id: 5, approve: false, deny_reason: "spam" });
  });
});

describe("registration applications on other backends", () => {
  test("Lemmy v3 and PieFed aren't supported", async () => {
    for (const api of [
      new LemmyV3Api({ instance: INSTANCE, softwareVersion: "0.19" }),
      new PieFedApi({ instance: INSTANCE, softwareVersion: "1.0" }),
    ]) {
      await expect(api.getRegistrationApplications()).rejects.toBe(
        Errors.NOT_IMPLEMENTED,
      );
      await expect(api.approveRegistrationApplication()).rejects.toBe(
        Errors.NOT_IMPLEMENTED,
      );
    }
  });
});
