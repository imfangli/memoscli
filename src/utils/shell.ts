import { spawn, spawnSync } from "node:child_process";

export interface RunResult {
  stdout: string;
  stderr: string;
}

export function commandExists(command: string): boolean {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0;
}

export async function run(
  command: string,
  args: string[] = [],
  options: { cwd?: string; input?: string; allowFailure?: boolean } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || options.allowFailure) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

export async function runShell(commandLine: string, cwd?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(commandLine, {
      cwd,
      shell: true,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${commandLine}`));
    });
  });
}
