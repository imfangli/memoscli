import path from "node:path";
import { MemoRecord } from "../types.js";
import { walkFiles } from "../utils/fs.js";
import { readMemoFile } from "./memo.js";

export function memosDir(dataDir: string): string {
  return path.join(dataDir, "memos");
}

export async function listMemos(dataDir: string): Promise<MemoRecord[]> {
  const files = await walkFiles(memosDir(dataDir), ".md");
  const memos = await Promise.all(files.map((file) => readMemoFile(file, dataDir)));
  return memos
    .filter((memo) => memo.meta.id)
    .sort((a, b) => b.meta.created_at.localeCompare(a.meta.created_at));
}

export async function findMemoById(dataDir: string, id: string): Promise<MemoRecord> {
  const memo = (await listMemos(dataDir)).find((item) => item.meta.id === id);
  if (!memo) throw new Error(`Memo not found: ${id}`);
  return memo;
}

export function summarize(content: string, length = 80): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  return oneLine.length > length ? `${oneLine.slice(0, length - 3)}...` : oneLine;
}
