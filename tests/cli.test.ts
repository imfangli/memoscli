import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
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

function runError(args: string[], cwd = root): string {
  const env = { ...process.env };
  delete env.NO_COLOR;
  try {
    execFileSync(tsx, [cli, ...args], { cwd, encoding: "utf8", env, stdio: "pipe" });
    throw new Error("Expected command to fail.");
  } catch (error) {
    if (error instanceof Error && "stderr" in error) {
      return String((error as { stderr: Buffer | string }).stderr);
    }
    throw error;
  }
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function tryGit(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function setAutoPush(dir: string, enabled: boolean): void {
  const configPath = path.join(dir, "config.toml");
  const config = readFileSync(configPath, "utf8").replace(
    /auto_push = (true|false)/,
    `auto_push = ${enabled ? "true" : "false"}`,
  );
  writeFileSync(configPath, config);
}

function createBareRemote(): string {
  const parent = mkdtempSync(path.join(os.tmpdir(), "memo-remote-"));
  const remote = path.join(parent, "remote.git");
  execFileSync("git", ["init", "--bare", remote], { encoding: "utf8" });
  return remote;
}

function createRemoteWithMemo(): { remote: string; branch: string } {
  const source = mkdtempSync(path.join(os.tmpdir(), "memo-source-"));
  const remote = createBareRemote();
  run(["init", source]);
  run(["--data-dir", source, "add", "cloned from remote #sync"]);
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: source });
  const branch = git(["branch", "--show-current"], source);
  run(["--data-dir", source, "sync"]);
  execFileSync("git", ["symbolic-ref", "HEAD", `refs/heads/${branch}`], { cwd: remote });
  return { remote, branch };
}

async function waitFor(condition: () => boolean, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return;
    await delay(100);
  }
  throw new Error("Timed out waiting for condition.");
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

  it("initializes from an existing git repository", () => {
    const { remote, branch } = createRemoteWithMemo();
    const parent = mkdtempSync(path.join(os.tmpdir(), "memo-clone-parent-"));
    const dir = path.join(parent, "memo-data");

    const output = run(["init", dir, "--from", remote]);

    expect(output).toContain(`Initialized memo data directory from ${remote}: ${dir}`);
    expect(run(["--data-dir", dir, "list"])).toContain("cloned from remote");
    expect(readFileSync(path.join(dir, "config.toml"), "utf8")).toContain(`data_dir = ${JSON.stringify(dir)}`);
    expect(readFileSync(path.join(dir, ".gitignore"), "utf8")).toContain("config.toml");
    expect(git(["remote", "get-url", "origin"], dir)).toBe(remote);
    expect(git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], dir)).toBe(`origin/${branch}`);
    expect(run(["--data-dir", dir, "sync"])).toContain("Git: synced.");
    expect(existsSync(path.join(dir, "assets"))).toBe(true);
    expect(existsSync(path.join(dir, "events", "pending"))).toBe(true);
    expect(existsSync(path.join(dir, "events", "sent"))).toBe(true);
    expect(existsSync(path.join(dir, "events", "failed"))).toBe(true);
  });

  it("refuses to clone into a non-empty directory", () => {
    const { remote } = createRemoteWithMemo();
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-non-empty-"));
    const keep = path.join(dir, "keep.txt");
    writeFileSync(keep, "do not overwrite");

    const error = runError(["init", dir, "--from", remote]);

    expect(error).toContain(`Cannot clone into non-empty directory: ${dir}`);
    expect(readFileSync(keep, "utf8")).toBe("do not overwrite");
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

  it("supports short command aliases", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-alias-"));
    run(["i", dir]);
    const addOutput = run(["--data-dir", dir, "a", "quickalias content #alias"]);
    const id = addOutput.match(/Added memo: (\S+)/)?.[1];
    expect(id).toBeTruthy();
    expect(run(["--data-dir", dir, "ls"])).toContain("quickalias content");
    expect(stripAnsi(run(["--data-dir", dir, "s", "quickalias"]))).toContain("quickalias content");
    expect(run(["--data-dir", dir, "sh", id!])).toContain("quickalias content");
    expect(run(["--data-dir", dir, "st"])).toContain(`Data dir: ${dir}`);
    expect(run(["--data-dir", dir, "td"])).toContain("quickalias content");
    expect(run(["--data-dir", dir, "wh", "st"])).toContain("Pending:");
    run(["--data-dir", dir, "rm", id!, "--yes"]);
    expect(run(["--data-dir", dir, "ls"])).not.toContain("quickalias content");
  }, 15000);

  it("shows aliases in help output", () => {
    const help = run(["--help"]);
    expect(help).toContain("add|a");
    expect(help).toContain("list|ls");
    expect(help).toContain("search|s");
    expect(help).toContain("delete|rm");
    expect(run(["wh", "--help"])).toContain("status|st");
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

  it("does not push after add when auto_push is disabled", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-no-autopush-"));
    const remote = createBareRemote();
    run(["init", dir]);
    execFileSync("git", ["remote", "add", "origin", remote], { cwd: dir });
    const output = run(["--data-dir", dir, "add", "local only #git"]);
    expect(output).not.toContain("Git:");
    expect(execFileSync("git", ["ls-remote", "--heads", "origin"], { cwd: dir, encoding: "utf8" })).toBe("");
  });

  it("skips auto sync when auto_push is enabled without an origin remote", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-autopush-no-origin-"));
    run(["init", dir]);
    setAutoPush(dir, true);
    const output = run(["--data-dir", dir, "add", "no remote #git"]);
    expect(output).toContain("Git: auto sync skipped, no origin remote configured.");
    expect(git(["log", "-1", "--pretty=%s"], dir)).toMatch(/^memo: create /);
  });

  it("starts background sync after add when auto_push is enabled", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-autopush-"));
    const remote = createBareRemote();
    run(["init", dir]);
    execFileSync("git", ["remote", "add", "origin", remote], { cwd: dir });
    setAutoPush(dir, true);
    const output = run(["--data-dir", dir, "add", "auto push #git"]);
    const branch = git(["branch", "--show-current"], dir);
    expect(output).toContain("Git: sync started in background. Log: .git/memo-sync.log");
    await waitFor(() => {
      const remoteHead = execFileSync("git", ["ls-remote", "--heads", "origin", branch], {
        cwd: dir,
        encoding: "utf8",
      });
      const upstream = tryGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], dir);
      return remoteHead.includes(branch) && upstream === `origin/${branch}`;
    });
    expect(git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], dir)).toBe(`origin/${branch}`);
  });

  it("sync sets upstream on first push", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-sync-upstream-"));
    const remote = createBareRemote();
    run(["init", dir]);
    run(["--data-dir", dir, "add", "manual sync #git"]);
    execFileSync("git", ["remote", "add", "origin", remote], { cwd: dir });
    const branch = git(["branch", "--show-current"], dir);
    expect(run(["--data-dir", dir, "sync"])).toContain(`Git: pushed and set upstream origin/${branch}.`);
    expect(git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], dir)).toBe(`origin/${branch}`);
  });

  it("keeps local commits when background auto sync later fails", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "memo-sync-fail-"));
    run(["init", dir]);
    execFileSync("git", ["remote", "add", "origin", path.join(dir, "missing.git")], { cwd: dir });
    setAutoPush(dir, true);
    const output = run(["--data-dir", dir, "add", "sync failure stays local #git"]);
    expect(output).toContain("Git: sync started in background. Log: .git/memo-sync.log");
    expect(git(["log", "-1", "--pretty=%s"], dir)).toMatch(/^memo: create /);
    expect(run(["--data-dir", dir, "list"])).toContain("sync failure stays local");
    await waitFor(() => readFileSync(path.join(dir, ".git", "memo-sync.log"), "utf8").includes("exited with"));
    expect(readFileSync(path.join(dir, ".git", "memo-sync.log"), "utf8")).toContain("exited with");
  });
});
