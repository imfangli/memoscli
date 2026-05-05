#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { registerAdd } from "./commands/add.js";
import { registerDelete } from "./commands/delete.js";
import { registerEdit } from "./commands/edit.js";
import { registerInit } from "./commands/init.js";
import { registerList } from "./commands/list.js";
import { registerOpen } from "./commands/open.js";
import { registerSearch } from "./commands/search.js";
import { registerShow } from "./commands/show.js";
import { registerStatus } from "./commands/status.js";
import { registerSync } from "./commands/sync.js";
import { registerToday } from "./commands/today.js";
import { registerWebhook } from "./commands/webhook.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
const program = new Command();

program
  .name("memo")
  .description("Local-first Markdown memo CLI")
  .version(pkg.version)
  .option("--data-dir <dir>", "override memo data directory");

registerInit(program);
registerAdd(program);
registerList(program);
registerToday(program);
registerShow(program);
registerOpen(program);
registerEdit(program);
registerDelete(program);
registerSearch(program);
registerSync(program);
registerStatus(program);
registerWebhook(program);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (typeof error === "object" && error && "exitCode" in error && error.exitCode === 0) {
    process.exitCode = 0;
  } else {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("(outputHelp)")) console.error(message);
  process.exitCode = 1;
  }
}
