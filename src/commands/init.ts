import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { Command } from "commander";
import { createDefaultConfig, ensureDataGitignore } from "../core/config.js";
import { gitClone, gitInit } from "../core/git.js";
import { ensureDir, pathExists, resolvePath } from "../utils/fs.js";

async function ensureRuntimeDirs(dataDir: string): Promise<void> {
  await Promise.all([
    ensureDir(path.join(dataDir, "memos")),
    ensureDir(path.join(dataDir, "assets")),
    ensureDir(path.join(dataDir, "events", "pending")),
    ensureDir(path.join(dataDir, "events", "sent")),
    ensureDir(path.join(dataDir, "events", "failed")),
  ]);
}

async function isEmptyDir(dir: string): Promise<boolean> {
  if (!(await pathExists(dir))) return true;
  if (!(await stat(dir)).isDirectory()) return false;
  return (await readdir(dir)).length === 0;
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .alias("i")
    .argument("[dir]", "data directory", "~/.memo")
    .option("--from <repo>", "clone an existing memo data repository")
    .description("Initialize a memo data directory")
    .action(async (dir: string, options: { from?: string }) => {
      const dataDir = resolvePath(dir);
      if (options.from) {
        if (!(await isEmptyDir(dataDir))) {
          throw new Error(`Cannot clone into non-empty directory: ${dataDir}`);
        }
        await ensureDir(path.dirname(dataDir));
        await gitClone(options.from, dataDir);
      }

      await ensureRuntimeDirs(dataDir);
      const configExists = await pathExists(path.join(dataDir, "config.toml"));
      await createDefaultConfig(dataDir);
      await ensureDataGitignore(dataDir);
      if (!options.from) await gitInit(dataDir);
      const source = options.from ? ` from ${options.from}` : "";
      console.log(`Initialized memo data directory${source}: ${dataDir}`);
      if (options.from && configExists) {
        console.warn("Warning: config.toml already exists in the cloned repository. It may contain local paths or secrets.");
      }
    });
}
