import { describe, expect, test } from "vitest";
import { removeMd } from "./remove-md";

describe("removeMd", () => {
  test("keeps the text of an aligned paragraph without its tags", () => {
    expect(removeMd('<p align="center">中<strong>文</strong></p>')).toBe(
      "中文",
    );
  });

  test("keeps aligned and plain paragraphs in order", () => {
    expect(removeMd('<p align="right">a<br>b</p>\n\nnext')).toBe("a b next");
  });

  test("drops inline HTML tags in a paragraph", () => {
    expect(removeMd("hello <sub>x</sub>")).toBe("hello x");
  });

  test("decodes entities in an HTML block", () => {
    expect(removeMd('<p align="center">a &amp; b</p>')).toBe("a & b");
  });

  test("skips an HTML block with no text", () => {
    expect(removeMd("<hr>\n\nafter")).toBe("after");
  });

  test("strips markdown and stops at a list", () => {
    expect(removeMd("**bold** text\n\n- item")).toBe("bold text…");
  });
});
