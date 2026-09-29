import { useId, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaRegImage } from "react-icons/fa6";
import { Forms } from "@/src/apis/api-blueprint";
import { MarkdownEditor } from "@/src/components/markdown/editor";
import { Button, LoadingButton } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { MultiSelect } from "@/src/components/ui/multi-select";
import { SimpleSelect } from "@/src/components/ui/simple-select";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import {
  useCreateCommunityMutation,
  useDeleteImageMutation,
  useUploadImageMutation,
} from "@/src/queries";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import {
  ACTOR_NAME_PATTERN,
  ACTOR_NAME_REQUIREMENTS,
  NO_FOCUS_RING,
} from "./shared";

const VISIBILITY_OPTIONS: {
  value: Forms.CommunityVisibility;
  label: string;
}[] = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "local_only_public", label: "Local only (public)" },
  { value: "local_only_private", label: "Local only (private)" },
  { value: "private", label: "Private" },
];

function ImageUploadField({
  id,
  label,
  url,
  onChange,
  imgClassName,
}: {
  id: string;
  label: string;
  url: string | undefined;
  onChange: (url: string | undefined) => void;
  imgClassName?: string;
}) {
  const uploadImage = useUploadImageMutation();
  const deleteImage = useDeleteImageMutation();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
      "video/*": [],
    },
    onDrop: (files) => {
      if (files[0]) {
        uploadImage
          .mutateAsync({ image: files[0] })
          .then((res) => onChange(res.url))
          .catch((err) => console.log(err));
      }
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        {...getRootProps()}
        className="border-2 border-dashed flex flex-col items-center justify-center gap-2 p-2 cursor-pointer rounded-md min-h-32"
      >
        <input id={id} {...getInputProps()} />
        {url && !uploadImage.isPending && (
          <img src={url} className={cn("object-cover", imgClassName)} />
        )}
        {uploadImage.isPending && (
          <Skeleton
            className={cn("flex items-center justify-center", imgClassName)}
          >
            <FaRegImage className="text-muted-foreground text-4xl" />
          </Skeleton>
        )}
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p className="text-muted-foreground">
            Drop or upload image here
            {url && " to replace"}
          </p>
        )}
      </div>
      {url && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => {
            deleteImage.mutate({ url });
            onChange(undefined);
          }}
        >
          Remove {label.toLowerCase()}
        </Button>
      )}
    </div>
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

  // lemmy-ui lets you upload an icon and banner here but never sends them in
  // the create request, so they only live in local state.
  const [icon, setIcon] = useState<string>();
  const [banner, setBanner] = useState<string>();

  const allLanguages = site?.allLanguages ?? [];
  const siteLanguages = site?.discussionLanguages ?? [];
  const languageOptions = allLanguages
    .filter((l) => siteLanguages.length === 0 || siteLanguages.includes(l.id))
    .map((l) => ({ value: l.id, label: l.name }));

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
          minLength={2}
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
          minLength={3}
          maxLength={100}
        />
      </div>

      <ImageUploadField
        id={`${id}-icon`}
        label="Icon"
        url={icon}
        onChange={setIcon}
        imgClassName="w-24 h-24 rounded-full"
      />

      <ImageUploadField
        id={`${id}-banner`}
        label="Banner"
        url={banner}
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
