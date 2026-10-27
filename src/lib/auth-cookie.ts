// Lemmy reads the login token from a "jwt" cookie when a request has no
// Authorization header (lemmy/crates/api/api_utils/src/utils.rs,
// AUTH_COOKIE_NAME). <img> tags can't send that header, so a private instance
// with federation disabled serves its /pictrs images only with this cookie.
// Lemmy's login doesn't set it (lemmy-ui writes it itself), so Blorp mirrors
// the selected account's token into it when Blorp is served from the
// instance's own origin, as on zhifou.io.
export const AUTH_COOKIE_NAME = "jwt";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * The cookie to write for the selected account, or a cookie that deletes it.
 * Only the selected account's token is mirrored: same-origin API requests
 * without an Authorization header (a guest) would otherwise be authenticated
 * through the cookie as someone else.
 */
export function authCookieFor({
  pageOrigin,
  instance,
  jwt,
}: {
  pageOrigin: string;
  instance?: string;
  jwt?: string;
}): string {
  const secure = pageOrigin.startsWith("https:") ? "; Secure" : "";
  const attrs = `; Path=/; SameSite=Lax${secure}`;
  if (jwt && instance === pageOrigin) {
    return `${AUTH_COOKIE_NAME}=${encodeURIComponent(jwt)}${attrs}; Max-Age=${ONE_YEAR_SECONDS}`;
  }
  return `${AUTH_COOKIE_NAME}=${attrs}; Max-Age=0`;
}
