import { describe, expect, test } from "vitest";
import { env } from "@/src/env";
import {
  decodeCommentParam,
  decodePostParam,
  decodeUserParam,
  encodeApId,
  encodeCommentParam,
  encodePostParam,
  encodeUserParam,
} from "./utils";

describe("post, comment and user route params", () => {
  const local = env.defaultInstance;
  const remotePost = "https://lemmy.other.example/post/1500";

  test("local posts and comments encode to their bare id", () => {
    expect(encodePostParam(`${local}/post/1500`)).toBe("1500");
    expect(encodeCommentParam(`${local}/comment/42`)).toBe("42");
  });

  test("bare ids decode back to the local ap_id", () => {
    expect(decodePostParam("1500")).toBe(`${local}/post/1500`);
    expect(decodeCommentParam("42")).toBe(`${local}/comment/42`);
  });

  test("remote and non-numeric ap_ids keep the full encoded form", () => {
    expect(encodePostParam(remotePost)).toBe(encodeApId(remotePost));
    expect(encodePostParam(`${local}/post/abc`)).toBe(
      encodeApId(`${local}/post/abc`),
    );
    expect(encodePostParam(`${local}/comment/1`)).toBe(
      encodeApId(`${local}/comment/1`),
    );
    expect(decodePostParam(encodeApId(remotePost))).toBe(remotePost);
  });

  test("old long links still decode", () => {
    const apId = `${local}/post/1500`;
    expect(decodePostParam(encodeApId(apId))).toBe(apId);
  });

  test("legacy dotted comment paths pass through", () => {
    expect(decodeCommentParam("0.12.34")).toBe("0.12.34");
  });

  test("local users encode to their username and round-trip", () => {
    const apId = `${local}/u/Some_User1`;
    expect(encodeUserParam(apId)).toBe("Some_User1");
    expect(decodeUserParam("Some_User1")).toBe(apId);
  });

  test("remote users and handles keep their old form", () => {
    const remote = "https://lemmy.other.example/u/alice";
    expect(encodeUserParam(remote)).toBe(encodeApId(remote));
    expect(decodeUserParam(encodeApId(remote))).toBe(remote);
    expect(decodeUserParam("alice@lemmy.other.example")).toBe(
      "alice@lemmy.other.example",
    );
    expect(decodeUserParam(encodeApId(`${local}/u/Eason`))).toBe(
      `${local}/u/Eason`,
    );
  });
});
