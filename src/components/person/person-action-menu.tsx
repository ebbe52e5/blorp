import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { EllipsisActionMenu, SubAction } from "../adaptable/action-menu";
import { encodeApId } from "@/src/apis/utils";
import { Deferred } from "@/src/lib/deferred";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { useBlockPersonMutation, useTagUser, useUserTag } from "@/src/queries";
import {
  getAccountActorId,
  useAuth,
  useIsPersonBlocked,
} from "@/src/stores/auth";
import { useShareActions } from "@/src/components/adaptable/action-menu/hooks";
import { resolveRoute } from "../../routing/index";
import { Schemas } from "@/src/apis/api-blueprint";
import { useRequireAuth } from "@/src/hooks";
import { useLinkContext } from "@/src/hooks/navigation-hooks";

dayjs.extend(localizedFormat);

export function usePersonActions({
  person,
  personLabel = "user",
}: {
  person?: Schemas.Person;
  personLabel?: string;
}): SubAction[] {
  const tag = useUserTag(person);

  const [alrt] = useIonAlert();

  const router = useIonRouter();
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));

  const requireAuth = useRequireAuth();

  const handle = person ? person.handle : undefined;

  const blockPerson = useBlockPersonMutation({
    apId: person?.apId,
  });

  const tagUser = useTagUser();

  const linkCtx = useLinkContext();
  const shareActions = useShareActions(
    personLabel,
    person
      ? {
          type: "person",
          apId: person.apId,
          handle: person.handle,
          route: resolveRoute(`${linkCtx.root}u/:userId`, {
            userId: encodeApId(person.apId),
          }),
        }
      : null,
  );

  const isBlocked = useIsPersonBlocked(person?.apId);
  const isMe = !!person && person.apId === myUserId;

  return [
    ...(person && !isBlocked
      ? [
          // Messaging or tagging yourself makes no sense
          ...(!isMe
            ? [
                {
                  text: `Message ${personLabel}`,
                  onClick: () =>
                    router.push(
                      resolveRoute("/messages/chat/:userId", {
                        userId: encodeApId(person.apId),
                      }),
                    ),
                },
                {
                  text: `Tag ${personLabel}`,
                  onClick: async () => {
                    tagUser(person, tag);
                  },
                },
              ]
            : []),
          ...shareActions,
        ]
      : []),
    ...(person && !isMe
      ? [
          {
            text: `${isBlocked ? "Unblock" : "Block"} ${personLabel}`,
            onClick: async () => {
              try {
                await requireAuth();
                const deferred = new Deferred();
                alrt({
                  message: `${isBlocked ? "Unblock" : "Block"} ${handle ?? "person"}`,
                  buttons: [
                    {
                      text: "Cancel",
                      role: "cancel",
                      handler: () => deferred.reject(),
                    },
                    {
                      text: "OK",
                      role: "confirm",
                      handler: () => deferred.resolve(),
                    },
                  ],
                });
                await deferred.promise;
                blockPerson.mutate({
                  personId: person?.id,
                  block: !isBlocked,
                });
              } catch {}
            },
            danger: true,
          },
        ]
      : []),
  ];
}

export function PersonActionMenu({ person }: { person?: Schemas.Person }) {
  const actions = usePersonActions({ person });
  const router = useIonRouter();
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const accountIndex = useAuth((s) =>
    s.accounts.findIndex((a) => a.uuid === s.getSelectedAccount().uuid),
  );
  const isMe = !!person && person.apId === myUserId;

  return (
    <EllipsisActionMenu
      header="User actions"
      align="end"
      actions={[
        ...(isMe && accountIndex >= 0
          ? [
              {
                text: "Edit profile",
                onClick: () =>
                  router.push(
                    resolveRoute("/settings/update-profile/:index", {
                      index: String(accountIndex),
                    }),
                  ),
              },
            ]
          : []),
        ...actions,
      ]}
      aria-label="User actions"
    />
  );
}
