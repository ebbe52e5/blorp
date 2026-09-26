import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage } from "./storage";
import { isTest } from "../lib/device";
import z from "zod";

const listingType = z.enum(["All", "Local", "Subscribed", "ModeratorView"]);
type ListingType = z.infer<typeof listingType>;

// Home can also list Following (a zhifou.io Lemmy fork listing type).
// Explore's communities listing can't, so it keeps `listingType`.
const homeListingType = z.enum([...listingType.options, "Following"]);
export type HomeListingType = z.infer<typeof homeListingType>;

const persistedSchema = z.object({
  communitySort: z.string(),
  commentSort: z.string(),
  postSort: z.string(),
  listingType: homeListingType,
  communitiesListingType: listingType,
});

type SortsStore = {
  setCommunitySort: (sort: string) => void;
  setCommentSort: (sort: string) => void;
  setPostSort: (sort: string) => void;
  setListingType: (type: HomeListingType) => void;
  setCommunitiesListingType: (type: ListingType) => void;
  reset: () => void;
} & z.infer<typeof persistedSchema>;

const INIT_STATE: z.infer<typeof persistedSchema> = {
  communitySort: "TopAll",
  commentSort: "Hot",
  postSort: "Active",
  listingType: "All",
  communitiesListingType: "All",
};

export const useFiltersStore = create<SortsStore>()(
  persist(
    (set) => ({
      ...INIT_STATE,
      setCommunitySort: (communitySort) => set({ communitySort }),
      setCommentSort: (commentSort) => set({ commentSort }),
      setPostSort: (postSort) => set({ postSort }),
      setListingType: (listingType) =>
        set({
          listingType,
        }),
      setCommunitiesListingType: (communitiesListingType) =>
        set({
          communitiesListingType,
        }),
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "filters",
      storage: createStorage<z.infer<typeof persistedSchema>>(),
      version: 0,
      migrate: (state) => {
        return persistedSchema.passthrough().parse(state);
      },
      merge: (persisted, current) => {
        const data = persistedSchema.partial().safeParse(persisted).data;
        return {
          ...current,
          ...data,
          // zhifou.io hides "Local" from the listing filters since the app is
          // locked to one instance. Move anyone who had it selected to "All"
          // so they aren't stuck on an option they can't see.
          ...(data?.listingType === "Local" ? { listingType: "All" } : null),
          ...(data?.communitiesListingType === "Local"
            ? { communitiesListingType: "All" }
            : null),
        } satisfies SortsStore;
      },
    },
  ),
);
