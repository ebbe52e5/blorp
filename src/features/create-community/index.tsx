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
import { useUrlSearchState } from "@/src/hooks/use-url-search-state";
import { useSoftware } from "@/src/queries";
import { getAccountSite, useAmIAdmin, useAuth } from "@/src/stores/auth";
import { CommunityForm } from "./community-form";
import { MultiCommunityForm } from "./multi-community-form";

const typeSchema = z.enum(["community", "multi"]);

export default function CreateCommunity() {
  const software = useSoftware();
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const isAdmin = useAmIAdmin();

  // Mirrors lemmy-ui's canCreateCommunity. Multi-communities are open to any
  // logged in user.
  const canCreateCommunity = !site?.communityCreationAdminOnly || !!isAdmin;

  const typeParam = useUrlSearchState(
    "type",
    canCreateCommunity ? "community" : "multi",
    typeSchema,
  );
  const type = canCreateCommunity ? typeParam.value : "multi";

  const isUnsupported =
    software.software !== undefined && !supportsCreateCommunity(software);

  return (
    <Page requireLogin>
      <PageTitle>Start community</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              Start community
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="py-6">
          {isUnsupported ? (
            <p className="text-muted-foreground">
              Creating communities isn't supported on this instance.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={type}
                onValueChange={(val) => {
                  const parsed = typeSchema.safeParse(val);
                  if (parsed.success) {
                    typeParam.set(parsed.data);
                  }
                }}
                className="self-start"
              >
                <ToggleGroupItem
                  value="community"
                  disabled={!canCreateCommunity}
                >
                  Community
                </ToggleGroupItem>
                <ToggleGroupItem value="multi">Multi-community</ToggleGroupItem>
              </ToggleGroup>

              {!canCreateCommunity && (
                <p className="text-sm text-muted-foreground">
                  Only admins can create communities on this instance.
                </p>
              )}

              {/* Both stay mounted so switching tabs keeps what was typed */}
              {canCreateCommunity && (
                <div className={type === "community" ? undefined : "hidden"}>
                  <CommunityForm />
                </div>
              )}
              <div className={type === "multi" ? undefined : "hidden"}>
                <MultiCommunityForm />
              </div>
            </div>
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
