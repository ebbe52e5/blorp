import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MarkdownRenderer } from "./renderer";

afterEach(cleanup);

function renderMarkdown(markdown: string, disableLinks?: boolean) {
  return render(
    <MarkdownRenderer markdown={markdown} disableLinks={disableLinks} />,
  ).container;
}

describe("MarkdownRenderer first line indent", () => {
  test("keeps ideographic spaces that start a paragraph", () => {
    const paragraphs = renderMarkdown(
      "第一节\n\n\u3000\u3000第一段。\n\n> \u3000\u3000引文",
    ).querySelectorAll("p");
    expect(Array.from(paragraphs, (p) => p.textContent)).toEqual([
      "第一节",
      "\u3000\u3000第一段。",
      "\u3000\u3000引文",
    ]);
  });

  test("only the first line of a paragraph is affected", () => {
    const p = renderMarkdown(
      "\u3000\u3000第一行\\\n\u3000\u3000第二行",
    ).querySelector("p");
    expect(p!.textContent).toBe("\u3000\u3000第一行\n\u3000\u3000第二行");
  });

  test("leaves code blocks alone", () => {
    const code = renderMarkdown("```\n\u3000\u3000code\n```").querySelector(
      "code",
    );
    expect(code!.textContent).toContain("\u3000\u3000code");
  });
});

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
