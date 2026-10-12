import { ContentGutters } from "@/src/components/gutters";
import { parseInt } from "lodash";
import { IonContent, IonHeader, IonToggle, IonToolbar } from "@ionic/react";
import { useState } from "react";
import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "@/src/routing";
import { accountIsAdmin, getAccountSite, useAuth } from "@/src/stores/auth";
import { Page } from "../../components/page";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import {
  useCreateInvitationMutation,
  useInvitationsQuery,
  useRevokeInvitationMutation,
  useSetRegistrationModeMutation,
} from "@/src/queries";
import { Button } from "@/src/components/ui/button";
import { RelativeTime } from "@/src/components/relative-time";
import { useConfirmationAlert } from "@/src/hooks";
import { copyToClipboard } from "@/src/hooks/share";
import { Section, SectionItem } from "./shared-components";
import { LuCopy } from "react-icons/lu";
import { X } from "@/src/components/icons";

/**
 * Admin page for sign-up invite codes. Turning the switch on sets the
 * server's registration mode to RequireInvitation, so sign-ups need a valid
 * single-use code and skip the application. Off goes back to requiring an
 * application, which is how zhifou.io runs otherwise.
 */
export default function InvitesPage() {
  const { index: indexStr } = useParams("/settings/invites/:index");
  const account = useAuth((s) => s.accounts[parseInt(indexStr)]);
  const isAdmin = !!account && accountIsAdmin(account);
  const registrationMode = account
    ? getAccountSite(account)?.registrationMode
    : undefined;

  const getConfirmation = useConfirmationAlert();
  const invitations = useInvitationsQuery({ account });
  const createInvitation = useCreateInvitationMutation({ account });
  const revokeInvitation = useRevokeInvitationMutation({ account });
  const setRegistrationMode = useSetRegistrationModeMutation({ account });
  const [newToken, setNewToken] = useState<string>();

  const codes = invitations.data?.pages.flatMap((p) => p.invitations) ?? [];
  const requireInvitation = registrationMode === "RequireInvitation";

  return (
    <Page notFound={!isAdmin}>
      <PageTitle>Invite codes</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              Invite codes
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="pt-4 pb-12 max-md:px-3.5">
          <div className="flex flex-1 flex-col gap-9">
            <Section title="SIGN UPS">
              <SectionItem>
                <IonToggle
                  className="flex-1"
                  checked={requireInvitation}
                  disabled={setRegistrationMode.isPending || !registrationMode}
                  onIonChange={(e) => {
                    const on = e.detail.checked;
                    getConfirmation({
                      message: on
                        ? "New users will need an invite code to sign up, and won't need to fill out an application."
                        : "New users will need to fill out an application and wait to be accepted.",
                      confirmText: on ? "Require invite codes" : "Turn off",
                    })
                      .then(() =>
                        setRegistrationMode.mutate({
                          mode: on ? "RequireInvitation" : "RequireApplication",
                        }),
                      )
                      .catch(() => {
                        // Cancelled: put the toggle back
                        e.target.checked = !on;
                      });
                  }}
                >
                  Require an invite code to sign up
                </IonToggle>
              </SectionItem>
            </Section>

            <Section title="INVITE CODES">
              <SectionItem unstyled>
                <div className="flex flex-col gap-2 py-1">
                  <p className="text-muted-foreground">
                    Each code works for one sign-up, and is case sensitive.
                  </p>
                  <Button
                    className="self-start"
                    disabled={createInvitation.isPending}
                    onClick={() =>
                      createInvitation
                        .mutateAsync()
                        .then((invitation) => setNewToken(invitation.token))
                    }
                  >
                    Generate invite code
                  </Button>
                </div>
              </SectionItem>

              {codes.length === 0 && !invitations.isFetching && (
                <SectionItem>
                  <span className="text-muted-foreground italic">
                    No unused invite codes
                  </span>
                </SectionItem>
              )}

              {codes.map((invitation) => (
                <SectionItem key={invitation.token}>
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <code
                      className={
                        invitation.token === newToken
                          ? "font-mono text-base font-semibold text-brand"
                          : "font-mono text-base"
                      }
                    >
                      {invitation.token}
                    </code>
                    <span className="text-muted-foreground truncate">
                      <RelativeTime time={invitation.createdAt} />
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Copy ${invitation.token}`}
                    onClick={() => copyToClipboard(invitation.token)}
                  >
                    <LuCopy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Revoke ${invitation.token}`}
                    disabled={revokeInvitation.isPending}
                    onClick={() =>
                      getConfirmation({
                        message: `Revoke invite code ${invitation.token}? It won't work for signing up anymore.`,
                        confirmText: "Revoke",
                        danger: true,
                      }).then(() =>
                        revokeInvitation.mutate({ token: invitation.token }),
                      )
                    }
                  >
                    <X />
                  </Button>
                </SectionItem>
              ))}
            </Section>
          </div>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
