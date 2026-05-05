import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const tsx = path.join(root, "node_modules", ".bin", "tsx");
const cli = path.join(root, "src", "cli.ts");

function run(args: string[], cwd = root): string {
  return execFileSync(tsx, [cli, ...args], { cwd, encoding: "utf8" });
}

describe("cli", () => {
  it("prints help", () => {
    expect(run(["--help"])).toContain("Local-first Markdown memo CLI");
  });

  it("initializes, adds, lists, shows, and deletes a memo", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "momo-test-"));
    run(["init", dir]);
    const addOutput = run(["--data-dir", dir, "add", "hello from test #idea"]);
    const id = addOutput.match(/Added memo: (\S+)/)?.[1];
    expect(id).toBeTruthy();
    expect(run(["--data-dir", dir, "list"])).toContain("hello from test");
    expect(run(["--data-dir", dir, "show", id!])).toContain("#idea");
    run(["--data-dir", dir, "delete", id!, "--yes"]);
    const log = execFileSync("git", ["log", "--oneline"], { cwd: dir, encoding: "utf8" });
    expect(log).toContain(`memo: create ${id}`);
    expect(log).toContain(`memo: delete ${id}`);
  });

  it("creates pending events when auto_send is disabled", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "momo-events-"));
    run(["init", dir]);
    const configPath = path.join(dir, "config.toml");
    const config = readFileSync(configPath, "utf8").replace("auto_send = true", "auto_send = false");
    writeFileSync(configPath, config);
    run(["--data-dir", dir, "add", "event test #webhook"]);
    const status = run(["--data-dir", dir, "webhook", "status"]);
    expect(status).toContain("Pending: 1");
  });
});
