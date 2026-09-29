// Same pattern lemmy-ui uses for community and multi-community names
// (lemmy-ui/src/shared/utils/config.ts validActorRegexPattern)
export const ACTOR_NAME_PATTERN =
  "^\\w+|[\\p{Script=Arabic}\\d_]+|[\\p{Script=Cyrillic}\\d_]+$";

// lemmy-ui's "community_reqs" string
export const ACTOR_NAME_REQUIREMENTS = "lowercase, underscores, and no spaces.";
