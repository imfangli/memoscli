import { Command } from "commander";
import { MemoRecord } from "../types.js";
import { loadConfig } from "../core/config.js";
import { displayDateTime } from "../utils/time.js";
import { summarize } from "../core/storage.js";

export async function commandConfig(_command?: Command) {
  const index = process.argv.indexOf("--data-dir");
  const dataDir = index >= 0 ? process.argv[index + 1] : undefined;
  return loadConfig(dataDir);
}

export function formatMemoLine(memo: MemoRecord): string {
  const tags = memo.meta.tags.length ? ` #${memo.meta.tags.join(" #")}` : "";
  return `${displayDateTime(memo.meta.created_at)}  ${memo.meta.id}  ${summarize(memo.content)}${tags}`;
}

export function printMemo(memo: MemoRecord): void {
  console.log(`id: ${memo.meta.id}`);
  console.log(`created: ${displayDateTime(memo.meta.created_at)}`);
  console.log(`updated: ${displayDateTime(memo.meta.updated_at)}`);
  if (memo.meta.tags.length) console.log(`tags: ${memo.meta.tags.join(", ")}`);
  console.log("");
  console.log(memo.content);
}
