import { Command } from "commander";
import { listMemos } from "../core/storage.js";
import { commandConfig, formatMemoLine } from "./helpers.js";
import { localDateString } from "../utils/time.js";

export function registerToday(program: Command): void {
  program
    .command("today")
    .alias("td")
    .description("Show today's memos")
    .action(async (command: Command) => {
      const config = await commandConfig(command);
      const today = localDateString();
      const memos = (await listMemos(config.data_dir))
        .filter((memo) => memo.meta.created_at.startsWith(today))
        .sort((a, b) => a.meta.created_at.localeCompare(b.meta.created_at));
      memos.forEach((memo) => console.log(formatMemoLine(memo)));
    });
}
