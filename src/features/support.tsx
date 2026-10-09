import { ContentGutters } from "@/src/components/gutters";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { MenuButton, UserDropdown } from "@/src/components/nav";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { PageTitle } from "../components/page-title";
import { Page } from "../components/page";

export default function Support() {
  return (
    <Page>
      <PageTitle>Support</PageTitle>
      <IonHeader>
        {/* Same header as the other pages (e.g. settings), not IonTitle */}
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <MenuButton />
            <ToolbarTitle numRightIcons={1}>Support</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          <div className="flex flex-col flex-1 py-8 markdown-content markdown-document">
            <h2>Need Help? We're Here for You!</h2>

            <p>
              If you have any questions, need assistance, or encounter issues
              with the app, please don't hesitate to contact us. Our support
              team is ready to help you—no account or login required.
            </p>

            <section>
              <h2>Email Support (Recommended)</h2>

              <p>
                For the fastest response, please email us directly using the
                link below:
              </p>

              <a
                className="text-brand"
                href="mailto:support@blorpblorp.xyz"
                rel="noopener noreferrer"
              >
                Email support!
              </a>
            </section>

            <section>
              <h2>GitHub (optional)</h2>

              <p>
                For those who use GitHub, you can also track the status of known
                issues or report bugs here:
              </p>

              <div className="flex gap-3">
                <a
                  className="text-brand"
                  href="https://github.com/Blorp-Labs/blorp/issues"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Known issues
                </a>
                <span className="text-border">|</span>
                <a
                  className="text-brand"
                  href="https://github.com/Blorp-Labs/blorp/issues/new"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Report issue [1]
                </a>
              </div>

              <span>[1] Report issue requires GitHub account</span>
            </section>
          </div>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
