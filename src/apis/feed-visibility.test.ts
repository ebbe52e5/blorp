import { describe, expect, test } from "vitest";
import * as api from "@/test-utils/api";
import { isFeedVisibleTo } from "./utils";

describe("isFeedVisibleTo", () => {
  const OWNER = "https://lemmy.example/u/alice";
  const OTHER = "https://lemmy.example/u/bob";

  const feed = api.getFeed({ ownerApId: OWNER });
  const deletedFeed = { ...feed, deleted: true };

  test("everyone sees a feed that isn't deleted", () => {
    expect(isFeedVisibleTo(feed, { apId: OTHER, isAdmin: false })).toBe(true);
    expect(isFeedVisibleTo(feed, { isAdmin: false })).toBe(true);
  });

  test("only the creator and admins see a deleted feed", () => {
    expect(isFeedVisibleTo(deletedFeed, { apId: OWNER, isAdmin: false })).toBe(
      true,
    );
    expect(isFeedVisibleTo(deletedFeed, { apId: OTHER, isAdmin: true })).toBe(
      true,
    );
    expect(isFeedVisibleTo(deletedFeed, { apId: OTHER, isAdmin: false })).toBe(
      false,
    );
    expect(isFeedVisibleTo(deletedFeed, { isAdmin: false })).toBe(false);
  });
});
