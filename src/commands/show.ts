import { Command } from "commander";
import { findMemoById } from "../core/storage.js";
import { commandConfig, printMemo } from "./helpers.js";

export function registerShow(program: Command): void {
  program
    .command("show")
    .alias("sh")
    .argument("<id>", "memo id")
    .description("Show a memo")
    .action(async (id: string, command: Command) => {
      const config = await commandConfig(command);
      printMemo(await findMemoById(config.data_dir, id));
    });
}
