import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const tsx = path.join(root, "node_modules", ".bin", "tsx");
const cli = path.join(root, "src", "cli.ts");

function run(args: string[], cwd = root): string {
  const env = { ...process.env };
  delete env.NO_COLOR;
  return execFileSync(tsx, [cli, ...args], { cwd, encoding: "utf8", env });
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

describe("cli", () => {
  it("prints help", () => {
    expect(run(["--help"])).toContain("Local-first Markdown memo CLI");
  });

  it("initializes data gitignore rules", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-init-"));
    run(["init", dir]);
    const gitignore = readFileSync(path.join(dir, ".gitignore"), "utf8");
    expect(gitignore).toContain("config.toml");
    expect(gitignore).toContain("events/**/*.json");
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

  it("prints memo-friendly search results", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-search-"));
    run(["init", dir]);
    run(["--data-dir", dir, "add", "第一行翻译 #work\n第二行翻译"]);

    const output = run(["--data-dir", dir, "search", "翻译"]);
    expect(output).toContain("\u001b[1;33m翻译\u001b[0m");
    expect(stripAnsi(output)).toContain("#work");
    expect(stripAnsi(output)).toContain("第一行翻译");
    expect(stripAnsi(output)).not.toContain(dir);

    const withPath = run(["--data-dir", dir, "search", "翻译", "--path"]);
    expect(stripAnsi(withPath)).toContain("memos/");
    expect(stripAnsi(withPath)).not.toContain(dir);

    const withMatches = run(["--data-dir", dir, "search", "翻译", "--matches"]);
    expect(stripAnsi(withMatches)).toContain("第一行翻译");
    expect(stripAnsi(withMatches)).toContain("第二行翻译");

    expect(run(["--data-dir", dir, "search", "不存在的词"])).toContain("No memos found.");
  });
});
