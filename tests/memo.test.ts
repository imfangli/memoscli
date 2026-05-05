import { describe, expect, it } from "vitest";
import { createMemoIdentity, extractTags, parseMemo, serializeMemo } from "../src/core/memo.js";

describe("memo core", () => {
  it("creates stable ids and paths from local date parts", () => {
    const date = new Date(2026, 4, 5, 14, 30, 12);
    expect(createMemoIdentity(date, "a8f3")).toEqual({
      id: "20260505143012-a8f3",
      relativePath: "memos/2026/05/05/143012-a8f3.md",
    });
  });

  it("extracts unique sorted body tags", () => {
    expect(extractTags("hello #idea #cli and #idea 中文 #标签")).toEqual(["cli", "idea", "标签"]);
  });

  it("round-trips markdown front matter", () => {
    const raw = serializeMemo(
      {
        id: "20260505143012-a8f3",
        created_at: "2026-05-05T14:30:12+08:00",
        updated_at: "2026-05-05T14:30:12+08:00",
        tags: ["idea"],
        visibility: "public",
      },
      "hello #idea",
    );
    const memo = parseMemo(raw, "/tmp/memo.md", "memos/2026/05/05/143012-a8f3.md");
    expect(memo.meta.id).toBe("20260505143012-a8f3");
    expect(memo.meta.tags).toEqual(["idea"]);
    expect(memo.content).toBe("hello #idea");
  });
});
