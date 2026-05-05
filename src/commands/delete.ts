import { Command } from "commander";
import { gitCommit, gitRm } from "../core/git.js";
import { confirm, selectItem } from "../core/selector.js";
import { findMemoById, listMemos } from "../core/storage.js";
import { flushQueue, generateEventsForLastCommit } from "../core/webhook.js";
import { autoSyncMessage, commandConfig, formatMemoLine } from "./helpers.js";

export function registerDelete(program: Command): void {
  program
    .command("delete")
    .alias("rm")
    .argument("[id]", "memo id")
    .description("Delete a memo")
    .option("--select", "choose a memo interactively")
    .option("-y, --yes", "skip confirmation")
    .action(async (id: string | undefined, options: { select?: boolean; yes?: boolean }, command: Command) => {
      const config = await commandConfig(command);
      let target = id;
      if (options.select || !target) {
        const memos = (await listMemos(config.data_dir)).slice(0, 100);
        const selected = await selectItem(memos.map((memo) => ({ id: memo.meta.id, label: formatMemoLine(memo) })));
        target = selected?.id;
      }
      if (!target) throw new Error("No memo selected.");
      const memo = await findMemoById(config.data_dir, target);
      if (!options.yes && !(await confirm(`Delete ${memo.meta.id}?`))) {
        console.log("Cancelled.");
        return;
      }
      await gitRm(config.data_dir, memo.relativePath);
      const message = `memo: delete ${memo.meta.id}`;
      await gitCommit(config.data_dir, message);
      await generateEventsForLastCommit(config.data_dir);
      if (config.webhook.auto_send) await flushQueue(config.data_dir, config);
      const sync = await autoSyncMessage(config);
      console.log(`Deleted memo: ${memo.meta.id}`);
      console.log(`Committed: ${message}${sync}`);
    });
}
