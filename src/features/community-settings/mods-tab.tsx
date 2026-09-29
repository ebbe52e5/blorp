import { useId, useState } from "react";
import dayjs from "dayjs";
import { IoClose, IoSwapHorizontal } from "react-icons/io5";
import { Schemas } from "@/src/apis/api-blueprint";
import { DateTime } from "@/src/components/datetime";
import { PersonCard } from "@/src/components/person/person-card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  DELETE_BUTTON_CLASS,
  NO_FOCUS_RING,
} from "@/src/features/create-community/shared";
import { useConfirmationAlert, useDebouncedState } from "@/src/hooks";
import {
  useAddCommunityModMutation,
  useSearchPersonsForModQuery,
  useTransferCommunityMutation,
} from "@/src/queries";
import { getAccountActorId, useAmIAdmin, useAuth } from "@/src/stores/auth";
import { useProfileFromStore } from "@/src/stores/profiles";

function AppointMod({
  community,
  mods,
}: {
  community: Schemas.Community;
  mods: Schemas.Person[];
}) {
  const id = useId();
  const [text, setText] = useState("");
  // lemmy-ui debounces its person search by 1s
  const search = useDebouncedState("", 1000);
  const q = search.value.trim();
  const results = useSearchPersonsForModQuery({ q });
  const addMod = useAddCommunityModMutation(community.handle);

  const modApIds = mods.map((m) => m.apId);
  const apIds = (results.data ?? []).filter((a) => !modApIds.includes(a));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-appoint`}>Appoint moderator</Label>
      <Input
        wrapperClassName={NO_FOCUS_RING}
        id={`${id}-appoint`}
        placeholder="Search users"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          search.setValue(e.target.value);
        }}
      />
      {q.length > 0 && !results.isFetching && apIds.length === 0 && (
        <p className="text-sm text-muted-foreground">No results.</p>
      )}
      <div className="flex flex-col">
        {apIds.map((apId) => (
          <PersonResultRow
            key={apId}
            apId={apId}
            disabled={addMod.isPending}
            onSelect={(personId) =>
              addMod.mutate({
                communityId: community.id,
                personId,
                added: true,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function PersonResultRow({
  apId,
  disabled,
  onSelect,
}: {
  apId: string;
  disabled: boolean;
  onSelect: (personId: number) => void;
}) {
  const personId = useProfileFromStore(apId)?.id;
  return (
    <button
      type="button"
      className="flex items-center text-left py-1 disabled:opacity-50"
      disabled={disabled || personId === undefined}
      onClick={() => personId !== undefined && onSelect(personId)}
    >
      <PersonCard actorId={apId} size="sm" disableLink disableHover />
    </button>
  );
}

// Mirrors the Mods tab of lemmy-ui's community settings
export function ModsTab({
  community,
  mods,
}: {
  community: Schemas.Community;
  mods: Schemas.Person[];
}) {
  const getConfirmation = useConfirmationAlert();
  const myApId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const amAdmin = !!useAmIAdmin();
  const addMod = useAddCommunityModMutation(community.handle);
  const transfer = useTransferCommunityMutation(community.handle);

  const myIndex = mods.findIndex((m) => m.apId === myApId);
  const me = myIndex >= 0 ? mods[myIndex] : undefined;
  const amTopMod = myIndex === 0;
  const communityName = community.handle;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="font-bold">Mods</h2>
        {mods.map((mod, index) => (
          <div
            key={mod.apId}
            className="flex items-center justify-between gap-2 flex-wrap"
          >
            <PersonCard actorId={mod.apId} size="sm" />
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                Registered <DateTime date={dayjs(mod.createdAt)} />
              </span>
              <span>{mod.postCount ?? 0} posts</span>
              <span>{mod.commentCount ?? 0} comments</span>
              {/* lemmy-ui's amTopModExcludeMe */}
              {amTopMod && index !== 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Transfer community"
                  title="Transfer community"
                  disabled={transfer.isPending}
                  onClick={() =>
                    getConfirmation({
                      header: "Confirmation required",
                      message: `Are you sure you want to transfer ${communityName} to ${mod.handle}?`,
                      confirmText: "Yes",
                      cancelText: "No",
                    })
                      .then(() =>
                        transfer.mutate({
                          communityId: community.id,
                          personId: mod.id,
                        }),
                      )
                      .catch(() => {})
                  }
                >
                  <IoSwapHorizontal />
                </Button>
              )}
              {/* lemmy-ui's amHigherModerator */}
              {(myIndex < index || amAdmin) && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove as mod"
                  title="Remove as mod"
                  disabled={addMod.isPending}
                  onClick={() =>
                    getConfirmation({
                      header: "Confirmation required",
                      message: `Are you sure you want to remove ${mod.handle} as a moderator for ${communityName}?`,
                      confirmText: "Yes",
                      cancelText: "No",
                    })
                      .then(() =>
                        addMod.mutate({
                          communityId: community.id,
                          personId: mod.id,
                          added: false,
                        }),
                      )
                      .catch(() => {})
                  }
                >
                  <IoClose />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AppointMod community={community} mods={mods} />

      {/* lemmy-ui shows this to anyone but the top mod; only mods can
          actually leave, so it's limited to them here */}
      {me && !amTopMod && (
        <Button
          type="button"
          className={`self-start ${DELETE_BUTTON_CLASS}`}
          disabled={addMod.isPending}
          onClick={() =>
            getConfirmation({
              header: "Confirmation required",
              message: "Are you sure you want to leave the mod team?",
              confirmText: "Yes",
              cancelText: "No",
            })
              .then(() =>
                addMod.mutate({
                  communityId: community.id,
                  personId: me.id,
                  added: false,
                  leaving: true,
                }),
              )
              .catch(() => {})
          }
        >
          Leave mod team
        </Button>
      )}
    </div>
  );
}
