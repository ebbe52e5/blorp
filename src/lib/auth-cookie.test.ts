import { describe, expect, test } from "vitest";
import { authCookieFor } from "./auth-cookie";

describe("authCookieFor", () => {
  test("mirrors the selected account's token on its instance's origin", () => {
    expect(
      authCookieFor({
        pageOrigin: "https://zhifou.io",
        instance: "https://zhifou.io",
        jwt: "a.b.c",
      }),
    ).toBe("jwt=a.b.c; Path=/; SameSite=Lax; Secure; Max-Age=31536000");
  });

  test("deletes the cookie for a guest", () => {
    expect(
      authCookieFor({
        pageOrigin: "https://zhifou.io",
        instance: "https://zhifou.io",
      }),
    ).toBe("jwt=; Path=/; SameSite=Lax; Secure; Max-Age=0");
  });

  test("deletes the cookie when the account is on another instance", () => {
    expect(
      authCookieFor({
        pageOrigin: "https://zhifou.io",
        instance: "https://lemmy.world",
        jwt: "a.b.c",
      }),
    ).toBe("jwt=; Path=/; SameSite=Lax; Secure; Max-Age=0");
  });

  test("leaves out Secure over plain http", () => {
    expect(
      authCookieFor({
        pageOrigin: "http://127.0.0.1:8536",
        instance: "http://127.0.0.1:8536",
        jwt: "a.b.c",
      }),
    ).toBe("jwt=a.b.c; Path=/; SameSite=Lax; Max-Age=31536000");
  });
});
