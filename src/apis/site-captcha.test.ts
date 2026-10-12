import { beforeEach, describe, expect, test } from "vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { LemmyV3Api } from "./lemmy-v3";
import { SITE_WITH_USER } from "@/test-utils/lemmy-api-fixtures";

manageFetchMockGlobally();

const INSTANCE = "https://lemmy.example";

describe("LemmyV3Api getSite captchaEnabled", () => {
  beforeEach(() => {
    fetchMock.removeRoutes().clearHistory();
  });

  const siteWithCaptcha = (captchaEnabled: boolean) => ({
    ...SITE_WITH_USER,
    my_user: undefined,
    site_view: {
      ...SITE_WITH_USER.site_view,
      local_site: {
        ...SITE_WITH_USER.site_view.local_site,
        captcha_enabled: captchaEnabled,
      },
    },
  });

  test.each([true, false])("maps captcha_enabled = %s", async (enabled) => {
    fetchMock
      .mockGlobal()
      .route(
        ({ url }) => url.split("?")[0]!.endsWith("/api/v3/site"),
        JSON.stringify(siteWithCaptcha(enabled)),
      );
    const api = new LemmyV3Api({ instance: INSTANCE, softwareVersion: "0.19" });
    const { site } = await api.getSite({});
    expect(site.captchaEnabled).toBe(enabled);
  });
});
