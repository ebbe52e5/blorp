import { useId, useState } from "react";
import { Forms } from "@/src/apis/api-blueprint";
import { LoadingButton } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useCreateMultiCommunityFeedMutation } from "@/src/queries";
import { ACTOR_NAME_PATTERN, ACTOR_NAME_REQUIREMENTS } from "./shared";

export function MultiCommunityForm() {
  const id = useId();
  const createFeed = useCreateMultiCommunityFeedMutation();

  // Like lemmy-ui, every field starts undefined and is only sent once touched
  const [form, setForm] = useState<Partial<Forms.CreateMultiCommunityFeed>>({});
  const patchForm = (patch: Partial<Forms.CreateMultiCommunityFeed>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    if (!form.name) {
      return;
    }
    createFeed.mutate({
      name: form.name,
      title: form.title,
      summary: form.summary,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-5"
      data-testid="create-multi-community-form"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          placeholder="Name used in the multi-community's URL, can't be changed"
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
          id={`${id}-title`}
          placeholder="Shown in place of the name"
          value={form.title ?? ""}
          onChange={(e) => patchForm({ title: e.target.value })}
          minLength={3}
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-summary`}>Summary</Label>
        <Input
          id={`${id}-summary`}
          value={form.summary ?? ""}
          onChange={(e) => patchForm({ summary: e.target.value })}
          maxLength={150}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        You can add communities from the multi-community's page after it's
        created.
      </p>

      <LoadingButton
        type="submit"
        className="self-start"
        loading={createFeed.isPending || createFeed.isSuccess}
      >
        Create
      </LoadingButton>
    </form>
  );
}
