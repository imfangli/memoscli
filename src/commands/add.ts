import { Command } from "commander";
import { autoSyncMessage, commandConfig } from "./helpers.js";
import { editText } from "../core/editor.js";
import { gitAdd, gitCommit } from "../core/git.js";
import { newMemo, writeMemoFile } from "../core/memo.js";
import { flushQueue, generateEventsForLastCommit } from "../core/webhook.js";

export function registerAdd(program: Command): void {
  program
    .command("add")
    .alias("a")
    .argument("[content...]", "memo content")
    .description("Add a memo")
    .action(async (contentParts: string[], command: Command) => {
      const config = await commandConfig(command);
      const content = contentParts.length ? contentParts.join(" ") : (await editText("")).trim();
      if (!content.trim()) throw new Error("Memo content is empty.");
      const memo = newMemo(content);
      await writeMemoFile(config.data_dir, memo.relativePath, memo.meta, content);
      await gitAdd(config.data_dir, memo.relativePath);
      const message = `memo: create ${memo.meta.id}`;
      await gitCommit(config.data_dir, message);
      await generateEventsForLastCommit(config.data_dir);
      let webhook = "";
      if (config.webhook.auto_send) {
        const result = await flushQueue(config.data_dir, config);
        webhook = result.failed ? `\nWebhook: ${result.sent} sent, ${result.failed} failed` : `\nWebhook: ${result.sent} sent`;
      }
      const sync = await autoSyncMessage(config);
      console.log(`Added memo: ${memo.meta.id}`);
      console.log(`Committed: ${message}${webhook}${sync}`);
    });
}
