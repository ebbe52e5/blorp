import { useId, useState } from "react";
import { Forms, Schemas } from "@/src/apis/api-blueprint";
import { MarkdownEditor } from "@/src/components/markdown/editor";
import { Button, LoadingButton } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { MultiSelect } from "@/src/components/ui/multi-select";
import { SimpleSelect } from "@/src/components/ui/simple-select";
import { ImageDropzone } from "@/src/features/create-community/image-dropzone";
import {
  DELETE_BUTTON_CLASS,
  LANGUAGE_SELECT_SUMMARY,
  NO_FOCUS_RING,
  VISIBILITY_OPTIONS,
  useSiteLanguageOptions,
} from "@/src/features/create-community/shared";
import { useConfirmationAlert } from "@/src/hooks";
import {
  useDeleteCommunityImageMutation,
  useDeleteCommunityMutation,
  useEditCommunityMutation,
  useUploadCommunityImageMutation,
} from "@/src/queries";
import { getAccountSite, useAuth } from "@/src/stores/auth";

// In edit mode lemmy-ui saves the icon and banner right away through
// /community/icon|banner after a confirmation, separately from Save
function CommunityImageField({
  id,
  community,
  kind,
  imgClassName,
}: {
  id: string;
  community: Schemas.Community;
  kind: Forms.CommunityImageKind;
  imgClassName: string;
}) {
  const getConfirmation = useConfirmationAlert();
  const upload = useUploadCommunityImageMutation(community.handle);
  const remove = useDeleteCommunityImageMutation(community.handle);
  // Preview what was just uploaded until the refetched community arrives
  const [preview, setPreview] = useState<string | null>();
  const url = preview !== undefined ? preview : community[kind];

  return (
    <ImageDropzone
      id={id}
      label={kind === "icon" ? "Icon" : "Banner"}
      url={url}
      pending={upload.isPending}
      onDrop={(image) =>
        getConfirmation({
          header: "Upload this image?",
          message:
            "The uploaded image will be distributed to federated instances without any further user interactions.",
          confirmText: "Yes",
          cancelText: "No",
        })
          .then(() =>
            upload.mutateAsync({ communityId: community.id, kind, image }),
          )
          .then((res) => setPreview(res.url ?? undefined))
          .catch(() => {})
      }
      onRemove={() =>
        remove
          .mutateAsync({ communityId: community.id, kind })
          .then(() => setPreview(null))
          .catch(() => {})
      }
      imgClassName={imgClassName}
    />
  );
}

// Mirrors lemmy-ui's CommunityForm in edit mode
export function CommunityTab({ community }: { community: Schemas.Community }) {
  const id = useId();
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const languageOptions = useSiteLanguageOptions();
  const getConfirmation = useConfirmationAlert();
  const editCommunity = useEditCommunityMutation(community.handle);
  const deleteCommunity = useDeleteCommunityMutation(community.handle);

  // Like lemmy-ui, the form starts from the community's current values and
  // Save sends all of them
  const [form, setForm] = useState<Omit<Forms.EditCommunity, "communityId">>(
    () => ({
      title: community.title,
      summary: community.description ?? undefined,
      sidebar: community.sidebar ?? undefined,
      nsfw: community.nsfw,
      postingRestrictedToMods: community.postingRestrictedToMods,
      discussionLanguages: community.discussionLanguages,
      visibility: community.visibility,
    }),
  );
  const patchForm = (patch: Partial<Forms.EditCommunity>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          editCommunity.mutate({ communityId: community.id, ...form });
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-title`}>Display name</Label>
          <Input
            wrapperClassName={NO_FOCUS_RING}
            id={`${id}-title`}
            value={form.title ?? ""}
            onChange={(e) => patchForm({ title: e.target.value })}
            minLength={3}
            maxLength={100}
          />
        </div>

        <CommunityImageField
          id={`${id}-icon`}
          community={community}
          kind="icon"
          imgClassName="w-24 h-24 rounded-full"
        />

        <CommunityImageField
          id={`${id}-banner`}
          community={community}
          kind="banner"
          imgClassName="w-full h-32 rounded-md"
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-summary`}>Summary</Label>
          <Input
            wrapperClassName={NO_FOCUS_RING}
            id={`${id}-summary`}
            value={form.summary ?? ""}
            onChange={(e) => patchForm({ summary: e.target.value })}
            maxLength={150}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-sidebar`}>Sidebar</Label>
          {form.visibility === "private" && (
            <p className="text-sm text-muted-foreground">
              The sidebar of private communities is publicly visible. Do not put
              any sensitive information here, instead use a featured post.
            </p>
          )}
          <MarkdownEditor
            id={`${id}-sidebar`}
            className="border rounded-md min-h-32"
            placeholder="Sidebar"
            content={form.sidebar ?? ""}
            onChange={(sidebar) => patchForm({ sidebar })}
          />
        </div>

        {!site?.nsfwContentDisallowed && (
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`${id}-nsfw`}
              checked={form.nsfw ?? false}
              onCheckedChange={(nsfw) => patchForm({ nsfw: nsfw === true })}
            />
            <Label htmlFor={`${id}-nsfw`}>NSFW</Label>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-visibility`}>Visibility</Label>
          <SimpleSelect
            options={VISIBILITY_OPTIONS}
            value={form.visibility ?? "public"}
            onChange={(opt) => patchForm({ visibility: opt.value })}
            valueGetter={(o) => o.value}
            labelGetter={(o) => o.label}
            className="w-[200px]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`${id}-mods-only`}
            checked={form.postingRestrictedToMods ?? false}
            onCheckedChange={(v) =>
              patchForm({ postingRestrictedToMods: v === true })
            }
          />
          <Label htmlFor={`${id}-mods-only`}>
            Only moderators can post to this community
          </Label>
        </div>

        {languageOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-languages`}>Languages</Label>
            <MultiSelect
              id={`${id}-languages`}
              options={languageOptions}
              value={form.discussionLanguages ?? []}
              onChange={(discussionLanguages) =>
                patchForm({ discussionLanguages })
              }
              placeholder="Select languages"
              keyExtractor={(v) => v}
              renderOption={(opt) => <span>{opt.label}</span>}
              buttonClassName="h-auto min-h-9 flex-wrap justify-start gap-x-2"
              {...LANGUAGE_SELECT_SUMMARY}
            />
          </div>
        )}

        <div className="flex gap-2">
          <LoadingButton type="submit" loading={editCommunity.isPending}>
            Save
          </LoadingButton>
          <Button
            type="button"
            variant={community.deleted ? "outline" : "default"}
            className={community.deleted ? undefined : DELETE_BUTTON_CLASS}
            disabled={deleteCommunity.isPending}
            onClick={() => {
              const deleted = !community.deleted;
              const confirm = deleted
                ? getConfirmation({
                    message: "Delete this community?",
                    confirmText: "Delete",
                    danger: true,
                  })
                : Promise.resolve();
              confirm
                .then(() =>
                  deleteCommunity.mutate({
                    communityId: community.id,
                    deleted,
                  }),
                )
                .catch(() => {});
            }}
          >
            {community.deleted ? "Restore" : "Delete"}
          </Button>
        </div>
      </form>
    </div>
  );
}
