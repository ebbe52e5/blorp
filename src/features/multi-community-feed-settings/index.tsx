import { useId, useMemo, useState } from "react";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { IoClose } from "react-icons/io5";
import { Schemas } from "@/src/apis/api-blueprint";
import { supportsCreateCommunity } from "@/src/apis/support";
import { decodeApId } from "@/src/apis/utils";
import { CommunityCard } from "@/src/components/communities/community-card";
import { ContentGutters } from "@/src/components/gutters";
import { UserDropdown } from "@/src/components/nav";
import { Page } from "@/src/components/page";
import { PageTitle } from "@/src/components/page-title";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { Button, LoadingButton } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useConfirmationAlert, useDebouncedState } from "@/src/hooks";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import {
  useAddMultiCommunityFeedEntryMutation,
  useEditMultiCommunityFeedMutation,
  useMultiCommunityFeedQuery,
  useRemoveMultiCommunityFeedEntryMutation,
  useSearchCommunitiesForFeedQuery,
  useSoftware,
} from "@/src/queries";
import { useParams } from "@/src/routing";
import { getAccountActorId, useAuth } from "@/src/stores/auth";
import { useCommunityFromStore } from "@/src/stores/communities";
import { useMultiCommunityFeedFromStore } from "@/src/stores/multi-community-feeds";
import {
  DELETE_BUTTON_CLASS,
  NO_FOCUS_RING,
} from "@/src/features/create-community/shared";

// Mirrors lemmy-ui's MultiCommunityForm in edit mode: title and summary only
function EditForm({ feed }: { feed: Schemas.MultiCommunityFeed }) {
  const id = useId();
  const editFeed = useEditMultiCommunityFeedMutation();
  const getConfirmation = useConfirmationAlert();

  const [title, setTitle] = useState(feed.title ?? undefined);
  const [summary, setSummary] = useState(feed.description ?? undefined);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        editFeed.mutate({ feedId: feed.id, title, summary });
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>Display name</Label>
        <Input
          wrapperClassName={NO_FOCUS_RING}
          id={`${id}-title`}
          value={title ?? ""}
          onChange={(e) => setTitle(e.target.value)}
          minLength={3}
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-summary`}>Summary</Label>
        <Input
          wrapperClassName={NO_FOCUS_RING}
          id={`${id}-summary`}
          value={summary ?? ""}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={150}
        />
      </div>

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          loading={
            editFeed.isPending && editFeed.variables.deleted === undefined
          }
        >
          Save
        </LoadingButton>
        <Button
          type="button"
          variant={feed.deleted ? "outline" : "default"}
          className={feed.deleted ? undefined : DELETE_BUTTON_CLASS}
          onClick={() => {
            const deleted = !feed.deleted;
            const confirm = deleted
              ? getConfirmation({
                  message: "Delete this multi-community?",
                  confirmText: "Delete",
                  danger: true,
                })
              : Promise.resolve();
            confirm
              .then(() => editFeed.mutate({ feedId: feed.id, deleted }))
              .catch(() => {});
          }}
        >
          {feed.deleted ? "Restore" : "Delete"}
        </Button>
      </div>
    </form>
  );
}

function EntryRow({
  feed,
  communityHandle,
  canRemove,
}: {
  feed: Schemas.MultiCommunityFeed;
  communityHandle: Schemas.Community["handle"];
  canRemove: boolean;
}) {
  const community = useCommunityFromStore(communityHandle)?.communityView;
  const removeEntry = useRemoveMultiCommunityFeedEntryMutation();

  return (
    <div className="flex items-center justify-between gap-2">
      <CommunityCard communityHandle={communityHandle} size="sm" />
      {canRemove && community && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Remove ${communityHandle}`}
          disabled={removeEntry.isPending}
          onClick={() =>
            removeEntry.mutate({ feed, communityId: community.id })
          }
        >
          <IoClose className="text-destructive" />
        </Button>
      )}
    </div>
  );
}

function SearchResultRow({
  feed,
  communityHandle,
}: {
  feed: Schemas.MultiCommunityFeed;
  communityHandle: Schemas.Community["handle"];
}) {
  const community = useCommunityFromStore(communityHandle)?.communityView;
  const addEntry = useAddMultiCommunityFeedEntryMutation();

  return (
    <button
      type="button"
      className="flex items-center text-left py-1 disabled:opacity-50"
      disabled={!community || addEntry.isPending}
      onClick={() =>
        community && addEntry.mutate({ feed, communityId: community.id })
      }
    >
      <CommunityCard communityHandle={communityHandle} size="sm" disableLink />
    </button>
  );
}

function AddCommunity({ feed }: { feed: Schemas.MultiCommunityFeed }) {
  const id = useId();
  const [text, setText] = useState("");
  // lemmy-ui debounces the search by 1s
  const search = useDebouncedState("", 1000);
  const q = search.value.trim();

  const results = useSearchCommunitiesForFeedQuery({ q });
  const existing = feed.communityHandles ?? [];
  const handles = (results.data ?? []).filter((h) => !existing.includes(h));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-add`}>Add a community</Label>
      <Input
        wrapperClassName={NO_FOCUS_RING}
        id={`${id}-add`}
        placeholder="Search communities"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          search.setValue(e.target.value);
        }}
      />
      {q.length > 0 && !results.isFetching && handles.length === 0 && (
        <p className="text-sm text-muted-foreground">No results.</p>
      )}
      <div className="flex flex-col">
        {handles.map((handle) => (
          <SearchResultRow key={handle} feed={feed} communityHandle={handle} />
        ))}
      </div>
    </div>
  );
}

export default function MultiCommunityFeedSettings() {
  const linkCtx = useLinkContext();
  const { apId: encodedApId } = useParams(`${linkCtx.root}f/:apId/settings`);
  const apId = useMemo(() => decodeApId(encodedApId), [encodedApId]);

  const software = useSoftware();
  const feedQuery = useMultiCommunityFeedQuery({ apId });
  const feed = useMultiCommunityFeedFromStore(apId)?.feedView;

  const myApId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  // Same owner check as lemmy-ui. Non-owners can open the page but get no
  // add/remove controls.
  const isOwner = !!feed?.ownerApId && feed.ownerApId === myApId;

  const isUnsupported =
    software.software !== undefined && !supportsCreateCommunity(software);

  return (
    <Page
      requireLogin
      notFound={isUnsupported || feedQuery.isError}
      notFoundApId={apId}
    >
      <PageTitle>Multi-community settings</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              {feed ? `${feed.title || feed.name} settings` : "Settings"}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="py-6">
          {feed && (
            <div className="flex flex-col gap-8">
              <EditForm key={feed.id} feed={feed} />

              <div className="flex flex-col gap-3">
                <h2 className="font-bold">Communities</h2>
                {feed.communityHandles?.length ? (
                  feed.communityHandles.map((handle) => (
                    <EntryRow
                      key={handle}
                      feed={feed}
                      communityHandle={handle}
                      canRemove={isOwner}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No communities yet.
                  </p>
                )}
                {isOwner && <AddCommunity feed={feed} />}
              </div>
            </div>
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
