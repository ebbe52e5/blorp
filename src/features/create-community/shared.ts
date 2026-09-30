import { Forms } from "@/src/apis/api-blueprint";
import { getAccountSite, useAuth } from "@/src/stores/auth";

// Same pattern lemmy-ui uses for community and multi-community names
// (lemmy-ui/src/shared/utils/config.ts validActorRegexPattern)
export const ACTOR_NAME_PATTERN =
  "^\\w+|[\\p{Script=Arabic}\\d_]+|[\\p{Script=Cyrillic}\\d_]+$";

// lemmy-ui's "community_reqs" string
export const ACTOR_NAME_REQUIREMENTS = "lowercase, underscores, and no spaces.";

// These forms drop the Input's focus glow; the border still changes on focus
export const NO_FOCUS_RING = "focus-within:ring-0";

// Delete buttons on the community pages are black rather than red; they
// invert in dark mode so they stay visible
export const DELETE_BUTTON_CLASS =
  "bg-foreground border-foreground text-background hover:bg-foreground/90 hover:border-foreground/90";

export const VISIBILITY_OPTIONS: {
  value: Forms.CommunityVisibility;
  label: string;
}[] = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "local_only_public", label: "Local only (public)" },
  { value: "local_only_private", label: "Local only (private)" },
  { value: "private", label: "Private" },
];

// A new community copies its creator's languages, which is often every
// language, so the picker's button summarizes long selections
export const LANGUAGE_SELECT_SUMMARY = {
  maxSelectedShown: 3,
  allSelectedLabel: "All languages",
};

/**
 * Languages a community can pick from: the site's discussion languages, or
 * all languages when the site doesn't restrict them (lemmy-ui's
 * LanguageSelect with showSite).
 */
export function useSiteLanguageOptions() {
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const allLanguages = site?.allLanguages ?? [];
  const siteLanguages = site?.discussionLanguages ?? [];
  return allLanguages
    .filter((l) => siteLanguages.length === 0 || siteLanguages.includes(l.id))
    .map((l) => ({ value: l.id, label: l.name }));
}
