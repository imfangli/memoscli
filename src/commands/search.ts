import { Command } from "commander";
import { readMemoFile } from "../core/memo.js";
import { searchMemos } from "../core/search.js";
import { selectItem } from "../core/selector.js";
import { commandConfig, printMemo } from "./helpers.js";

export function registerSearch(program: Command): void {
  program
    .command("search")
    .argument("<query>", "search query")
    .description("Search memo files")
    .option("--limit <number>", "max results", "20")
    .option("--select", "select a result")
    .action(async (query: string, options: { limit: string; select?: boolean }, command: Command) => {
      const config = await commandConfig(command);
      const results = await searchMemos(config.data_dir, query, Number(options.limit) || 20);
      if (options.select) {
        const selected = await selectItem(
          results.map((result, index) => ({
            id: String(index),
            label: `${result.filePath}:${result.line} ${result.text}`,
          })),
        );
        const result = selected ? results[Number(selected.id)] : undefined;
        if (result) printMemo(await readMemoFile(result.filePath, config.data_dir));
        return;
      }
      results.forEach((result) => console.log(`${result.filePath}:${result.line} ${result.text}`));
    });
}
