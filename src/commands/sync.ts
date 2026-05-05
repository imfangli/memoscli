import { Command } from "commander";
import { gitSync } from "../core/git.js";
import { commandConfig } from "./helpers.js";

export function registerSync(program: Command): void {
  program
    .command("sync")
    .description("Run git pull --rebase and git push")
    .action(async (command: Command) => {
      const config = await commandConfig(command);
      console.log((await gitSync(config.data_dir)).message);
    });
}
