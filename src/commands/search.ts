import { Command } from "commander";
import { formatSearchResult, searchMemos } from "../core/search.js";
import { selectItem } from "../core/selector.js";
import { commandConfig, printMemo } from "./helpers.js";

export function registerSearch(program: Command): void {
  program
    .command("search")
    .argument("<query>", "search query")
    .description("Search memo files")
    .option("--limit <number>", "max results", "20")
    .option("--select", "select a result")
    .option("--matches", "show all matches within each memo")
    .option("--path", "show memo relative paths")
    .action(async (query: string, options: { limit: string; select?: boolean; matches?: boolean; path?: boolean }, command: Command) => {
      const config = await commandConfig(command);
      const results = await searchMemos(config.data_dir, query, Number(options.limit) || 20);
      if (results.length === 0) {
        console.log("No memos found.");
        return;
      }
      if (options.select) {
        const selected = await selectItem(
          results.map((result, index) => ({
            id: String(index),
            label: formatSearchResult(result, { showMatches: false, showPath: Boolean(options.path) }).replace(/\n/g, "  "),
          })),
        );
        const result = selected ? results[Number(selected.id)] : undefined;
        if (result) printMemo(result.memo);
        return;
      }
      results.forEach((result, index) => {
        if (index > 0) console.log("");
        console.log(formatSearchResult(result, { showMatches: Boolean(options.matches), showPath: Boolean(options.path) }));
      });
    });
}
