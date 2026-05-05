import { Command } from "commander";
import { listMemos } from "../core/storage.js";
import { selectItem } from "../core/selector.js";
import { commandConfig, formatMemoLine, printMemo } from "./helpers.js";

export function registerOpen(program: Command): void {
  program
    .command("open")
    .alias("o")
    .description("Interactively select and show a memo")
    .option("--limit <number>", "candidate count", "100")
    .action(async (options: { limit: string }, command: Command) => {
      const config = await commandConfig(command);
      const memos = (await listMemos(config.data_dir)).slice(0, Number(options.limit) || 100);
      const selected = await selectItem(memos.map((memo) => ({ id: memo.meta.id, label: formatMemoLine(memo) })));
      const memo = memos.find((item) => item.meta.id === selected?.id);
      if (memo) printMemo(memo);
    });
}
