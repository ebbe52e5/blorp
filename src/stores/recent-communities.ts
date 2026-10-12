import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import z from "zod";
import { communitySchema, Handle, Schemas } from "../apis/api-blueprint";
import { isTest } from "../lib/device";
import { mergeCacheArray } from "./utils";

const persistedSchema = z.object({
  recentlyVisited: z.array(communitySchema),
  /**
   * Handles of deleted or purged communities, newest first. Tabs merge their
   * lists on focus, so a tab that still has one of these would otherwise add
   * it back. Kept separately so the removal survives that merge.
   */
  removedHandles: z.array(z.string()).default([]),
});

type RecentCommunityStore = z.infer<typeof persistedSchema> & {
  update: (c: Schemas.Community) => void;
  remove: (handle: Handle) => void;
  reset: () => void;
};

export const MAX_VISITED = 100;
export const MAX_REMOVED = 100;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  recentlyVisited: [],
  removedHandles: [],
};

/**
 * Dedupe before dropping deleted and removed communities, so a visit that
 * finds a community deleted also drops the older copy saved before that.
 */
function pruneCommunitites(
  communities: Schemas.Community[],
  removedHandles: string[],
) {
  return _.slice(
    _.uniqBy(communities, (c) => c.apId).filter(
      (c) => !c.deleted && !c.removed && !removedHandles.includes(c.handle),
    ),
    0,
    MAX_VISITED,
  );
}

function pruneRemovedHandles(handles: string[]) {
  return _.slice(_.uniq(handles), 0, MAX_REMOVED);
}

export function migrateRecentCommunities(
  state: Record<string, unknown>,
): Pick<z.infer<typeof persistedSchema>, "recentlyVisited"> {
  const communities = (state["recentlyVisited"] ?? []) as unknown[];
  const recentlyVisited = communities.map((c) => {
    if (c && typeof c === "object") {
      const community = c as Record<string, unknown>;
      const handle = community["handle"] ?? community["slug"];
      return {
        ...community,
        // Write both so an old tab (v1) still sees slug.
        // TODO: remove slug once no old tabs are expected.
        ...(handle ? { handle, slug: handle } : {}),
      };
    }
    return c;
  });
  // Use passthrough so deprecated fields (e.g. slug) survive validation
  const lenientSchema = z.object({
    recentlyVisited: z.array(communitySchema.passthrough()),
  });
  return lenientSchema.parse({ ...state, recentlyVisited });
}

export const useRecentCommunitiesStore = create<RecentCommunityStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      update: (community) => {
        const { recentlyVisited, removedHandles } = get();
        if (community.deleted || community.removed) {
          get().remove(community.handle);
          return;
        }
        // Visiting it again (say, after a restore) lists it again
        const nextRemoved = removedHandles.filter(
          (h) => h !== community.handle,
        );
        set({
          recentlyVisited: pruneCommunitites(
            [community, ...recentlyVisited],
            nextRemoved,
          ),
          removedHandles: nextRemoved,
        });
      },
      remove: (handle) => {
        const removedHandles = pruneRemovedHandles([
          handle,
          ...get().removedHandles,
        ]);
        set({
          recentlyVisited: pruneCommunitites(
            get().recentlyVisited,
            removedHandles,
          ),
          removedHandles,
        });
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "recent-communities",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 1,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (p: any, current) => {
        const migrated = migrateRecentCommunities(p ?? {});
        const persistedRemoved = z
          .array(z.string())
          .safeParse(p?.["removedHandles"]);
        const removedHandles = pruneRemovedHandles([
          ...current.removedHandles,
          ...(persistedRemoved.success ? persistedRemoved.data : []),
        ]);
        return {
          ...current,
          recentlyVisited: pruneCommunitites(
            mergeCacheArray(
              current.recentlyVisited,
              migrated.recentlyVisited as unknown[] | undefined,
              communitySchema,
            ),
            removedHandles,
          ),
          removedHandles,
        } satisfies RecentCommunityStore;
      },
    },
  ),
);

sync(useRecentCommunitiesStore);
