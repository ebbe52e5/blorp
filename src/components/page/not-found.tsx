import { IonContent, IonHeader, IonToolbar, useIonRouter } from "@ionic/react";
import { LuSearchX } from "react-icons/lu";
import { ContentGutters } from "../gutters";
import { UserDropdown } from "../nav";
import { ToolbarBackButton } from "../toolbar/toolbar-back-button";
import { ToolbarTitle } from "../toolbar/toolbar-title";
import { ToolbarButtons } from "../toolbar/toolbar-buttons";
import { Button } from "../ui/button";
import { useLinkContext } from "@/src/hooks/navigation-hooks";

/**
 * One fallback page for anything that doesn't exist: a bad route, or a
 * post, community, user or feed that's gone.
 */
export function NotFoundPageContent() {
  const router = useIonRouter();
  const root = useLinkContext().root;

  const goHome = () => router.push(root, "root", "replace");
  const goBack = () => (router.canGoBack() ? router.goBack() : goHome());

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1}>Not found</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <ContentGutters className="py-6">
          <div className="flex flex-col items-center text-center max-w-md w-full mx-auto pt-16 md:pt-28">
            <div className="size-18 rounded-full bg-brand-secondary/10 text-brand-secondary flex items-center justify-center">
              <LuSearchX className="size-8" aria-hidden />
            </div>
            <span className="mt-6 font-mono text-sm tracking-[0.12em] text-muted-foreground">
              404
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Page not found
            </h1>
            <p className="mt-3 text-muted-foreground">
              It may have been deleted, or the link is wrong.
            </p>
            <div className="mt-8 flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <Button size="lg" onClick={goHome}>
                Go home
              </Button>
              <Button size="lg" variant="outline" onClick={goBack}>
                Go back
              </Button>
            </div>
          </div>
        </ContentGutters>
      </IonContent>
    </>
  );
}
