import { describe, expect, it } from "vitest";
import { configToToml, defaultConfig } from "../src/core/config.js";
import toml from "toml";

describe("config", () => {
  it("serializes default config as parseable TOML", () => {
    const config = defaultConfig("/tmp/memo");
    const parsed = toml.parse(configToToml(config)) as any;
    expect(parsed.data_dir).toBe("/tmp/memo");
    expect(parsed.git.auto_commit).toBe(true);
    expect(parsed.webhook.auto_send).toBe(true);
  });
});
