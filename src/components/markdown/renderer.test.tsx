import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MarkdownRenderer } from "./renderer";

afterEach(cleanup);

function renderMarkdown(markdown: string, disableLinks?: boolean) {
  return render(
    <MarkdownRenderer markdown={markdown} disableLinks={disableLinks} />,
  ).container;
}

describe("MarkdownRenderer audio links", () => {
  test("renders a link to an mp3 as an audio player", () => {
    const container = renderMarkdown(
      "[钢琴小回旋曲](https://zhifou.io/music/2.%E9%92%A2%E7%90%B4.mp3)",
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio!.hasAttribute("controls")).toBe(true);
    expect(audio!.getAttribute("src")).toBe(
      "https://zhifou.io/music/2.%E9%92%A2%E7%90%B4.mp3",
    );
    expect(audio!.getAttribute("aria-label")).toBe("钢琴小回旋曲");
    expect(container.querySelector("a")).toBeNull();
  });

  test("recognizes audio links with a query string", () => {
    const container = renderMarkdown(
      "[song](https://example.com/a/song.OGG?download=1)",
    );
    expect(container.querySelector("audio")).not.toBeNull();
  });

  test("keeps other links as links", () => {
    const container = renderMarkdown(
      "[page](https://example.com/mp3-player.html)",
    );
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/mp3-player.html",
    );
  });

  test("shows only the label when links are disabled", () => {
    const container = renderMarkdown(
      "[钢琴小回旋曲](https://zhifou.io/music/2.mp3)",
      true,
    );
    expect(container.querySelector("audio")).toBeNull();
    expect(container.textContent).toContain("钢琴小回旋曲");
  });
});
