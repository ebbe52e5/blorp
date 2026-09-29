// Lemmy community tags carry a color slot (color01–color10) rather than a
// color. lemmy-ui maps the first six to Bootstrap's light, primary, info,
// success, warning and danger, and only offers those six; the rest render
// like color01. These are the equivalent colors, with color01 falling back to
// the default badge style.
export const COMMUNITY_TAG_COLORS: Record<
  string,
  { backgroundColor: string | null; color: string | null }
> = {
  color01: { backgroundColor: null, color: null },
  color02: { backgroundColor: "#2563eb", color: "#ffffff" },
  color03: { backgroundColor: "#06b6d4", color: "#000000" },
  color04: { backgroundColor: "#16a34a", color: "#ffffff" },
  color05: { backgroundColor: "#facc15", color: "#000000" },
  color06: { backgroundColor: "#dc2626", color: "#ffffff" },
};

export const DEFAULT_COMMUNITY_TAG_COLOR = "color01";

export function getCommunityTagColors(color: string | undefined | null) {
  return (
    COMMUNITY_TAG_COLORS[color ?? DEFAULT_COMMUNITY_TAG_COLOR] ??
    COMMUNITY_TAG_COLORS[DEFAULT_COMMUNITY_TAG_COLOR]!
  );
}
