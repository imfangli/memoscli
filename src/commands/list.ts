import { Command } from "commander";
import { listMemos } from "../core/storage.js";
import { commandConfig, formatMemoLine } from "./helpers.js";

export function registerList(program: Command): void {
  program
    .command("list")
    .alias("ls")
    .description("List recent memos")
    .option("--limit <number>", "max results", "20")
    .option("--tag <tag>", "filter by tag")
    .option("--date <yyyy-mm-dd>", "filter by date")
    .action(async (options: { limit: string; tag?: string; date?: string }, command: Command) => {
      const config = await commandConfig(command);
      const limit = Number(options.limit);
      const memos = (await listMemos(config.data_dir))
        .filter((memo) => !options.tag || memo.meta.tags.includes(options.tag))
        .filter((memo) => !options.date || memo.meta.created_at.startsWith(options.date))
        .slice(0, Number.isFinite(limit) ? limit : 20);
      memos.forEach((memo) => console.log(formatMemoLine(memo)));
    });
}
