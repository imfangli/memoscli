import path from "node:path";
import { Command } from "commander";
import { gitBranch, gitRemoteNames, gitStatusShort } from "../core/git.js";
import { listMemos } from "../core/storage.js";
import { countEvents } from "../core/webhook.js";
import { commandConfig } from "./helpers.js";
import { localDateString } from "../utils/time.js";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Show memo status")
    .action(async (command: Command) => {
      const config = await commandConfig(command);
      const today = localDateString();
      const memos = await listMemos(config.data_dir);
      console.log(`Data dir: ${config.data_dir}`);
      console.log(`Memos dir: ${path.join(config.data_dir, "memos")}`);
      console.log(`Branch: ${await gitBranch(config.data_dir)}`);
      console.log(`Git status: ${(await gitStatusShort(config.data_dir)) || "clean"}`);
      console.log(`Remotes: ${(await gitRemoteNames(config.data_dir)).join(", ") || "none"}`);
      console.log(`Pending webhooks: ${await countEvents(config.data_dir, "pending")}`);
      console.log(`Failed webhooks: ${await countEvents(config.data_dir, "failed")}`);
      console.log(`Today's memos: ${memos.filter((memo) => memo.meta.created_at.startsWith(today)).length}`);
    });
}
