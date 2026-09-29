import { useMemo } from "react";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { z } from "zod";
import { supportsCreateCommunity } from "@/src/apis/support";
import { ContentGutters } from "@/src/components/gutters";
import { UserDropdown } from "@/src/components/nav";
import { Page } from "@/src/components/page";
import { PageTitle } from "@/src/components/page-title";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { ToggleGroup, ToggleGroupItem } from "@/src/components/ui/toggle-group";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { useUrlSearchState } from "@/src/hooks/use-url-search-state";
import { decodeCommunityHandle } from "@/src/lib/handle";
import { useCommunityQuery, useSoftware } from "@/src/queries";
import { useParams } from "@/src/routing";
import { useCommunityFromStore } from "@/src/stores/communities";
import { CommunityTab } from "./community-tab";
import { FollowersTab } from "./followers-tab";
import { ModsTab } from "./mods-tab";
import { TagsTab } from "./tags-tab";

const tabSchema = z.enum(["community", "mods", "followers", "tags"]);

const TABS: { value: z.infer<typeof tabSchema>; label: string }[] = [
  { value: "community", label: "Community" },
  { value: "mods", label: "Mods" },
  { value: "followers", label: "Followers" },
  { value: "tags", label: "Tags" },
];

// Mirrors lemmy-ui's /c/:name/settings
export default function CommunitySettings() {
  const linkCtx = useLinkContext();
  const { communityHandle: encodedHandle } = useParams(
    `${linkCtx.root}c/:communityHandle/settings`,
  );
  const communityHandle = useMemo(
    () => decodeCommunityHandle(encodedHandle),
    [encodedHandle],
  );

  const software = useSoftware();
  const communityQuery = useCommunityQuery({ name: communityHandle });
  const data = useCommunityFromStore(communityHandle);
  const community = data?.communityView;
  const mods = data?.mods;

  const tabParam = useUrlSearchState("tab", "community", tabSchema);
  const tab = tabParam.value;

  const isUnsupported =
    software.software !== undefined && !supportsCreateCommunity(software);
  // Only mods and admins can use these settings (lemmy-ui's can_mod check)
  const cantMod = community?.canMod === false;

  return (
    <Page
      requireLogin
      notFound={isUnsupported || cantMod || communityQuery.isError}
      notFoundApId={community?.apId}
    >
      <PageTitle>{`${community?.title ?? communityHandle} settings`}</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              {`${community?.title ?? communityHandle} settings`}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="py-6">
          {community?.canMod && (
            <div className="flex flex-col gap-6">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={tab}
                onValueChange={(val) => {
                  const parsed = tabSchema.safeParse(val);
                  if (parsed.success) {
                    tabParam.set(parsed.data);
                  }
                }}
                className="self-start"
              >
                {TABS.map((t) => (
                  <ToggleGroupItem key={t.value} value={t.value}>
                    {t.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {/* Tabs stay mounted so switching keeps unsaved input */}
              <div className={tab === "community" ? undefined : "hidden"}>
                <CommunityTab key={community.id} community={community} />
              </div>
              <div className={tab === "mods" ? undefined : "hidden"}>
                <ModsTab community={community} mods={mods ?? []} />
              </div>
              <div className={tab === "followers" ? undefined : "hidden"}>
                <FollowersTab
                  communityId={community.id}
                  active={tab === "followers"}
                />
              </div>
              <div className={tab === "tags" ? undefined : "hidden"}>
                <TagsTab community={community} />
              </div>
            </div>
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
