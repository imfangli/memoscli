import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { editFile, editText } from "../core/editor.js";
import { gitAdd, gitCommit } from "../core/git.js";
import { extractTags, parseMemo, readMemoFile, serializeMemo, validateRawMemo, writeMemoFile } from "../core/memo.js";
import { findMemoById, listMemos } from "../core/storage.js";
import { selectItem } from "../core/selector.js";
import { flushQueue, generateEventsForLastCommit } from "../core/webhook.js";
import { localIso } from "../utils/time.js";
import { autoSyncMessage, commandConfig, formatMemoLine } from "./helpers.js";

export async function editMemoById(id: string, command: Command, raw = false): Promise<void> {
  const config = await commandConfig(command);
  const memo = await findMemoById(config.data_dir, id);
  if (raw || config.editor.raw_by_default) {
    const original = memo.meta;
    await editFile(memo.filePath);
    const parsed = parseMemo(await readFile(memo.filePath, "utf8"), memo.filePath, memo.relativePath);
    const meta = validateRawMemo(parsed, original);
    await writeMemoFile(config.data_dir, memo.relativePath, meta, parsed.content);
  } else {
    const edited = (await editText(memo.content + "\n")).trimEnd();
    const tags = config.editor.extract_tags_from_body ? extractTags(edited) : memo.meta.tags;
    const changed = edited !== memo.content || tags.join("\0") !== memo.meta.tags.join("\0");
    if (!changed) {
      console.log("No changes.");
      return;
    }
    await writeMemoFile(
      config.data_dir,
      memo.relativePath,
      { ...memo.meta, updated_at: localIso(), tags },
      edited,
    );
  }
  await gitAdd(config.data_dir, memo.relativePath);
  const message = `memo: update ${memo.meta.id}`;
  await gitCommit(config.data_dir, message);
  await generateEventsForLastCommit(config.data_dir);
  if (config.webhook.auto_send) await flushQueue(config.data_dir, config);
  const sync = await autoSyncMessage(config);
  console.log(`Updated memo: ${memo.meta.id}`);
  console.log(`Committed: ${message}${sync}`);
}

export function registerEdit(program: Command): void {
  program
    .command("edit")
    .alias("e")
    .argument("[id]", "memo id")
    .description("Edit a memo")
    .option("--select", "choose a memo interactively")
    .option("--raw", "edit the raw Markdown file")
    .action(async (id: string | undefined, options: { select?: boolean; raw?: boolean }, command: Command) => {
      const config = await commandConfig(command);
      let target = id;
      if (options.select || !target) {
        const memos = (await listMemos(config.data_dir)).slice(0, 100);
        const selected = await selectItem(memos.map((memo) => ({ id: memo.meta.id, label: formatMemoLine(memo) })));
        target = selected?.id;
      }
      if (!target) throw new Error("No memo selected.");
      await editMemoById(target, command, Boolean(options.raw));
    });
}
