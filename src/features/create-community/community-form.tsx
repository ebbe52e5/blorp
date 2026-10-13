import { useEffect, useId, useState } from "react";
import { Forms } from "@/src/apis/api-blueprint";
import { MarkdownEditor } from "@/src/components/markdown/editor";
import { LoadingButton } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { MultiSelect } from "@/src/components/ui/multi-select";
import { SimpleSelect } from "@/src/components/ui/simple-select";
import { useCreateCommunityMutation } from "@/src/queries";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { ImageDropzone } from "./image-dropzone";
import {
  ACTOR_NAME_MAX_LENGTH,
  ACTOR_NAME_MIN_LENGTH,
  ACTOR_NAME_PATTERN,
  ACTOR_NAME_REQUIREMENTS,
  LANGUAGE_SELECT_SUMMARY,
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  NO_FOCUS_RING,
  VISIBILITY_OPTIONS,
  useSiteLanguageOptions,
} from "./shared";

function ImageUploadField({
  id,
  label,
  file,
  onChange,
  imgClassName,
}: {
  id: string;
  label: string;
  file: File | undefined;
  onChange: (file: File | undefined) => void;
  imgClassName?: string;
}) {
  // Previewed locally; the image is uploaded once the community exists
  const [previewUrl, setPreviewUrl] = useState<string>();
  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <ImageDropzone
      id={id}
      label={label}
      url={previewUrl}
      pending={false}
      onDrop={onChange}
      onRemove={() => onChange(undefined)}
      imgClassName={imgClassName}
    />
  );
}

export function CommunityForm() {
  const id = useId();
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const createCommunity = useCreateCommunityMutation();

  // Like lemmy-ui, every field starts undefined and is only sent once touched
  const [form, setForm] = useState<Partial<Forms.CreateCommunity>>({});
  const patchForm = (patch: Partial<Forms.CreateCommunity>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  // The backend's create request takes no icon or banner (lemmy-ui uploads
  // them here and then drops them), so the files are kept until submit and
  // uploaded to /community/icon|banner once the community exists.
  const [icon, setIcon] = useState<File>();
  const [banner, setBanner] = useState<File>();

  const languageOptions = useSiteLanguageOptions();

  const handleSubmit = () => {
    if (!form.name) {
      return;
    }
    createCommunity.mutate({
      name: form.name,
      title: form.title,
      summary: form.summary,
      sidebar: form.sidebar,
      nsfw: form.nsfw,
      postingRestrictedToMods: form.postingRestrictedToMods,
      discussionLanguages: form.discussionLanguages,
      visibility: form.visibility,
      images: { icon, banner },
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-5"
      data-testid="create-community-form"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          wrapperClassName={NO_FOCUS_RING}
          id={`${id}-name`}
          placeholder="Name used in the community's URL, can't be changed"
          value={form.name ?? ""}
          onChange={(e) => patchForm({ name: e.target.value })}
          required
          minLength={ACTOR_NAME_MIN_LENGTH}
          maxLength={ACTOR_NAME_MAX_LENGTH}
          pattern={ACTOR_NAME_PATTERN}
          title={ACTOR_NAME_REQUIREMENTS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>Display name</Label>
        <Input
          wrapperClassName={NO_FOCUS_RING}
          id={`${id}-title`}
          placeholder="Shown in place of the name"
          value={form.title ?? ""}
          onChange={(e) => patchForm({ title: e.target.value })}
          minLength={DISPLAY_NAME_MIN_LENGTH}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
        />
      </div>

      <ImageUploadField
        id={`${id}-icon`}
        label="Icon"
        file={icon}
        onChange={setIcon}
        imgClassName="w-24 h-24 rounded-full"
      />

      <ImageUploadField
        id={`${id}-banner`}
        label="Banner"
        file={banner}
        onChange={setBanner}
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
          // Shows Public while unset, but like lemmy-ui only sends a value
          // once the user picks one
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

      <LoadingButton
        type="submit"
        className="self-start"
        loading={createCommunity.isPending || createCommunity.isSuccess}
      >
        Create
      </LoadingButton>
    </form>
  );
}
