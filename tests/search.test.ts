import { describe, expect, it } from "vitest";
import { formatSearchResult, highlightQuery, SearchResult } from "../src/core/search.js";

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function result(): SearchResult {
  return {
    relativePath: "memos/2026/05/05/151128-2253.md",
    memo: {
      filePath: "/Users/felix/.momo/memos/2026/05/05/151128-2253.md",
      relativePath: "memos/2026/05/05/151128-2253.md",
      content: "翻译一句话\n基础插画",
      meta: {
        id: "20260505151128-2253",
        created_at: "2026-05-05T15:11:28+08:00",
        updated_at: "2026-05-05T15:11:28+08:00",
        tags: ["work"],
        visibility: "public",
      },
    },
    matches: [
      { line: 1, text: "翻译一句话" },
      { line: 2, text: "基础插画" },
    ],
  };
}

describe("search formatting", () => {
  it("formats memo-friendly results without absolute paths by default", () => {
    const output = stripAnsi(formatSearchResult(result()));
    expect(output).toContain("20260505151128-2253");
    expect(output).toContain("#work");
    expect(output).toContain("翻译一句话");
    expect(output).not.toContain("/Users/felix");
    expect(output).not.toContain("memos/2026/05/05/151128-2253.md");
  });

  it("can show paths and all matches when requested", () => {
    const output = stripAnsi(formatSearchResult(result(), { showMatches: true, showPath: true }));
    expect(output).toContain("memos/2026/05/05/151128-2253.md");
    expect(output).toContain("翻译一句话");
    expect(output).toContain("基础插画");
  });

  it("highlights literal query matches", () => {
    expect(highlightQuery("翻译一句话", "翻译", true)).toBe("\u001b[1;33m翻译\u001b[0m一句话");
    expect(highlightQuery("a+b and A+B", "a+b", true)).toBe("\u001b[1;33ma+b\u001b[0m and \u001b[1;33mA+B\u001b[0m");
    expect(highlightQuery("翻译一句话", "翻译", false)).toBe("翻译一句话");
  });
});
