import path from "node:path";
import { Command } from "commander";
import { createDefaultConfig } from "../core/config.js";
import { gitInit } from "../core/git.js";
import { ensureDir, resolvePath } from "../utils/fs.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .argument("[dir]", "data directory", "~/.momo")
    .description("Initialize a memo data directory")
    .action(async (dir: string) => {
      const dataDir = resolvePath(dir);
      await Promise.all([
        ensureDir(path.join(dataDir, "memos")),
        ensureDir(path.join(dataDir, "assets")),
        ensureDir(path.join(dataDir, "events", "pending")),
        ensureDir(path.join(dataDir, "events", "sent")),
        ensureDir(path.join(dataDir, "events", "failed")),
      ]);
      await createDefaultConfig(dataDir);
      await gitInit(dataDir);
      console.log(`Initialized memo data directory: ${dataDir}`);
    });
}
