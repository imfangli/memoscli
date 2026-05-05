import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

describe("package metadata", () => {
  it("limits published package contents", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      files?: string[];
      license?: string;
      scripts?: Record<string, string>;
    };
    expect(pkg.license).toBe("MIT");
    expect(pkg.files).toEqual(["dist", "README.md", "LICENSE"]);
    expect(pkg.scripts?.prepack).toBe("pnpm build");
  });
});
