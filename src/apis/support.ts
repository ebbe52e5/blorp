import { compare } from "compare-versions";

type Software = {
  software: "lemmy" | "piefed" | undefined;
  softwareVersion: string | undefined;
};

function compareVersions(a: string, b: string) {
  try {
    const [aBase] = a.split("-");
    return aBase && compare(aBase, b, ">=");
  } catch {
    return undefined;
  }
}

export function supportsFeeds({ software, softwareVersion }: Software) {
  return (
    software === "piefed" ||
    (software === "lemmy" && softwareVersion?.startsWith("nightly")) ||
    (software === "lemmy" &&
      softwareVersion &&
      compareVersions(softwareVersion, "1.0.0"))
  );
}

// Community and multi-community creation mirror lemmy-ui, which only
// targets the Lemmy v4 API
export function supportsCreateCommunity({
  software,
  softwareVersion,
}: Software) {
  return Boolean(
    software === "lemmy" &&
      softwareVersion &&
      (softwareVersion.startsWith("nightly") ||
        compareVersions(softwareVersion, "1.0.0")),
  );
}

// Blorp only implements registration applications for the Lemmy v4 API,
// like the other admin and community management features
export function supportsRegistrationApplications(software: Software) {
  return supportsCreateCommunity(software);
}

export function supportsMarkCommentAsAnswer({ software }: Software) {
  return software === "piefed";
}

export function supportsPollCreation({
  software,
  communitySoftware,
}: {
  communitySoftware?: Software["software"];
} & Software) {
  return software === "piefed" && communitySoftware === "piefed";
}
