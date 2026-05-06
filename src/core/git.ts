import { spawn } from "node:child_process";
import { run } from "../utils/shell.js";

export type GitSyncResult =
  | { status: "synced"; message: "Git: synced." }
  | { status: "upstream-set"; message: string }
  | { status: "skipped"; message: "Git: auto sync skipped, no origin remote configured." };

export type GitBackgroundSyncResult =
  | { status: "started"; message: "Git: sync started in background. Log: .git/memo-sync.log" }
  | { status: "skipped"; message: "Git: auto sync skipped, no origin remote configured." };

export async function gitInit(dataDir: string): Promise<void> {
  await run("git", ["init"], { cwd: dataDir });
}

export async function gitClone(repoUrl: string, dataDir: string): Promise<void> {
  await run("git", ["clone", repoUrl, dataDir]);
}

export async function gitAdd(dataDir: string, relativePath: string): Promise<void> {
  await run("git", ["add", "--", relativePath], { cwd: dataDir });
}

export async function gitRm(dataDir: string, relativePath: string): Promise<void> {
  await run("git", ["rm", "--quiet", "--", relativePath], { cwd: dataDir });
}

export async function gitCommit(dataDir: string, message: string): Promise<void> {
  await run(
    "git",
    ["-c", "user.name=momo", "-c", "user.email=momo@example.invalid", "commit", "-m", message],
    { cwd: dataDir },
  );
}

export async function gitHead(dataDir: string): Promise<string> {
  return (await run("git", ["rev-parse", "--short", "HEAD"], { cwd: dataDir })).stdout.trim();
}

export async function gitBranch(dataDir: string): Promise<string> {
  return (await run("git", ["branch", "--show-current"], { cwd: dataDir, allowFailure: true })).stdout.trim() || "HEAD";
}

export async function gitCommitMessage(dataDir: string, ref = "HEAD"): Promise<string> {
  return (await run("git", ["log", "-1", "--pretty=%B", ref], { cwd: dataDir })).stdout.trim();
}

export async function gitHasParent(dataDir: string, ref = "HEAD"): Promise<boolean> {
  const result = await run("git", ["rev-parse", "--verify", `${ref}~1`], { cwd: dataDir, allowFailure: true });
  return !result.stderr && Boolean(result.stdout.trim());
}

export async function gitDiffNameStatus(dataDir: string, from: string, to: string): Promise<string[]> {
  const result = await run("git", ["diff", "--name-status", from, to, "--", "memos/"], { cwd: dataDir });
  return result.stdout.split("\n").filter(Boolean);
}

export async function gitLastCommitNameStatus(dataDir: string): Promise<string[]> {
  if (await gitHasParent(dataDir)) return gitDiffNameStatus(dataDir, "HEAD~1", "HEAD");
  const result = await run("git", ["diff-tree", "--root", "--name-status", "--no-commit-id", "-r", "HEAD", "--", "memos/"], {
    cwd: dataDir,
  });
  return result.stdout.split("\n").filter(Boolean);
}

export async function gitShow(dataDir: string, refPath: string): Promise<string> {
  return (await run("git", ["show", refPath], { cwd: dataDir })).stdout;
}

export async function gitStatusShort(dataDir: string): Promise<string> {
  return (await run("git", ["status", "--short"], { cwd: dataDir, allowFailure: true })).stdout.trim();
}

export async function gitRemoteNames(dataDir: string): Promise<string[]> {
  const result = await run("git", ["remote"], { cwd: dataDir, allowFailure: true });
  return result.stdout.split("\n").filter(Boolean);
}

export async function gitUpstream(dataDir: string): Promise<string | undefined> {
  const result = await run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    cwd: dataDir,
    allowFailure: true,
  });
  return result.stdout.trim() || undefined;
}

export async function gitSync(dataDir: string): Promise<GitSyncResult> {
  const remotes = await gitRemoteNames(dataDir);
  if (!remotes.includes("origin")) {
    return { status: "skipped", message: "Git: auto sync skipped, no origin remote configured." };
  }
  const upstream = await gitUpstream(dataDir);
  if (upstream) {
    await run("git", ["pull", "--rebase"], { cwd: dataDir });
    await run("git", ["push"], { cwd: dataDir });
    return { status: "synced", message: "Git: synced." };
  }
  const branch = await gitBranch(dataDir);
  await run("git", ["push", "-u", "origin", branch], { cwd: dataDir });
  return { status: "upstream-set", message: `Git: pushed and set upstream origin/${branch}.` };
}

export async function gitSyncInBackground(dataDir: string): Promise<GitBackgroundSyncResult> {
  const remotes = await gitRemoteNames(dataDir);
  if (!remotes.includes("origin")) {
    return { status: "skipped", message: "Git: auto sync skipped, no origin remote configured." };
  }

  // Background sync intentionally uses POSIX shell primitives; Windows native shells
  // are not part of the v0.1 support target.
  const command = `
log=".git/memo-sync.log"
lock=".git/memo-sync.lock"
{
  echo ""
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] memo background git sync started"
} >> "$log"
if ! mkdir "$lock" 2>/dev/null; then
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] another git sync is already running" >> "$log"
  exit 0
fi
trap 'rmdir "$lock"' EXIT
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git pull --rebase >> "$log" 2>&1 && git push >> "$log" 2>&1
else
  branch="$(git branch --show-current)"
  git push -u origin "$branch" >> "$log" 2>&1
fi
status=$?
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] memo background git sync exited with $status" >> "$log"
exit "$status"
`;

  const child = spawn("sh", ["-c", command], {
    cwd: dataDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return { status: "started", message: "Git: sync started in background. Log: .git/memo-sync.log" };
}
