import { useId, useState } from "react";
import { Schemas } from "@/src/apis/api-blueprint";
import { Badge } from "@/src/components/ui/badge";
import { Button, LoadingButton } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SimpleSelect } from "@/src/components/ui/simple-select";
import {
  ACTOR_NAME_PATTERN,
  ACTOR_NAME_REQUIREMENTS,
  DELETE_BUTTON_CLASS,
  NO_FOCUS_RING,
} from "@/src/features/create-community/shared";
import { cn } from "@/src/lib/utils";
import {
  COMMUNITY_TAG_COLORS,
  DEFAULT_COMMUNITY_TAG_COLOR,
  getCommunityTagColors,
} from "@/src/lib/community-tag-colors";
import {
  useCreateCommunityTagMutation,
  useDeleteCommunityTagMutation,
  useEditCommunityTagMutation,
} from "@/src/queries";

const TAG_COLOR_OPTIONS = Object.keys(COMMUNITY_TAG_COLORS).map((value, i) => ({
  value,
  label: String(i + 1),
}));

// Same colors as the tag badges on posts (see Flair)
export function CommunityTagBadge({
  tag,
  useName,
}: {
  tag: Pick<Schemas.CommunityTag, "name" | "displayName" | "summary"> & {
    color?: string;
  };
  /** lemmy-ui shows the name instead of the display name in edit rows */
  useName?: boolean;
}) {
  const label = useName ? tag.name : (tag.displayName ?? tag.name);
  const { backgroundColor, color } = getCommunityTagColors(tag.color);
  return (
    <Badge
      className="rounded-full"
      style={{
        backgroundColor: backgroundColor ?? undefined,
        color: color ?? undefined,
      }}
      title={tag.summary ? `${tag.name} - ${tag.summary}` : tag.name}
    >
      {label}
    </Badge>
  );
}

function TagColorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <SimpleSelect
      options={TAG_COLOR_OPTIONS}
      value={COMMUNITY_TAG_COLORS[value] ? value : DEFAULT_COMMUNITY_TAG_COLOR}
      onChange={(opt) => onChange(opt.value)}
      valueGetter={(o) => o.value}
      labelGetter={(o) => `Color: ${o.label}`}
      className="w-[120px]"
    />
  );
}

type TagFormState = {
  name?: string;
  displayName?: string;
  summary?: string;
  color?: string;
};

// Mirrors lemmy-ui's CommunityTagForm. Without a tag it creates one.
function TagForm({
  community,
  tag,
}: {
  community: Schemas.Community;
  tag?: Schemas.CommunityTag;
}) {
  const id = useId();
  const createTag = useCreateCommunityTagMutation(community.handle);
  const editTag = useEditCommunityTagMutation(community.handle);
  const deleteTag = useDeleteCommunityTagMutation(community.handle);

  const [form, setForm] = useState<TagFormState>(() =>
    tag
      ? {
          name: tag.name,
          displayName: tag.displayName ?? undefined,
          summary: tag.summary ?? undefined,
          color: tag.color,
        }
      : {},
  );
  const patchForm = (patch: TagFormState) =>
    setForm((prev) => ({ ...prev, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (tag) {
          editTag.mutate({
            tagId: tag.id,
            displayName: form.displayName,
            summary: form.summary,
            color: form.color,
          });
        } else if (form.name) {
          createTag
            .mutateAsync({
              communityId: community.id,
              name: form.name,
              displayName: form.displayName,
              summary: form.summary,
              // Only sent if picked; the server defaults to color01
              color: form.color,
            })
            .then(() => setForm({}))
            .catch(() => {});
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      {tag ? (
        <div className="min-w-32">
          <CommunityTagBadge tag={{ ...tag, color: form.color }} useName />
        </div>
      ) : (
        <Input
          wrapperClassName={cn(NO_FOCUS_RING, "w-40")}
          id={`${id}-name`}
          placeholder="Name"
          value={form.name ?? ""}
          onChange={(e) => patchForm({ name: e.target.value })}
          required
          minLength={3}
          pattern={ACTOR_NAME_PATTERN}
          title={ACTOR_NAME_REQUIREMENTS}
        />
      )}
      <Input
        wrapperClassName={cn(NO_FOCUS_RING, "w-40")}
        id={`${id}-display-name`}
        placeholder="Display name"
        value={form.displayName ?? ""}
        onChange={(e) => patchForm({ displayName: e.target.value })}
        pattern="^(?!@)(.+)$"
        minLength={3}
        maxLength={50}
      />
      <Input
        wrapperClassName={cn(NO_FOCUS_RING, "w-56")}
        id={`${id}-summary`}
        placeholder="Summary"
        value={form.summary ?? ""}
        onChange={(e) => patchForm({ summary: e.target.value })}
        maxLength={150}
      />
      <TagColorSelect
        value={form.color ?? DEFAULT_COMMUNITY_TAG_COLOR}
        onChange={(color) => patchForm({ color })}
      />
      <LoadingButton
        type="submit"
        variant="outline"
        disabled={!form.name}
        loading={tag ? editTag.isPending : createTag.isPending}
      >
        {tag ? "Save" : "Create"}
      </LoadingButton>
      {tag && (
        <Button
          type="button"
          variant={tag.deleted ? "outline" : "default"}
          className={tag.deleted ? undefined : DELETE_BUTTON_CLASS}
          disabled={deleteTag.isPending}
          onClick={() =>
            deleteTag.mutate({ tagId: tag.id, deleted: !tag.deleted })
          }
        >
          {tag.deleted ? "Restore" : "Delete"}
        </Button>
      )}
    </form>
  );
}

// Mirrors the Tags tab of lemmy-ui's community settings
export function TagsTab({ community }: { community: Schemas.Community }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold">Tags</h2>
      {community.tags?.map((tag) => (
        <TagForm
          // Remount when the server's copy changes so the form resets
          key={`${tag.id}-${tag.displayName}-${tag.summary}-${tag.color}-${tag.deleted}`}
          community={community}
          tag={tag}
        />
      ))}
      <TagForm community={community} />
    </div>
  );
}
