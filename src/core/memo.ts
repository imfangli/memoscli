import matter from "gray-matter";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { MemoMetadata, MemoRecord } from "../types.js";
import { dateParts, localIso } from "../utils/time.js";
import { randomHex } from "../utils/hash.js";
import { ensureDir } from "../utils/fs.js";

export function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const re = /(^|\s)#([A-Za-z0-9_\-\u4e00-\u9fa5]+)/gu;
  for (const match of content.matchAll(re)) tags.add(match[2]);
  return [...tags].sort();
}

export function createMemoIdentity(date = new Date(), suffix = randomHex(2)): {
  id: string;
  relativePath: string;
} {
  const parts = dateParts(date);
  const id = `${parts.compact}-${suffix}`;
  return {
    id,
    relativePath: path.join("memos", parts.year, parts.month, parts.day, `${parts.time}-${suffix}.md`),
  };
}

export function parseMemo(raw: string, filePath: string, relativePath: string): MemoRecord {
  const parsed = matter(raw);
  const data = parsed.data as Partial<MemoMetadata>;
  const meta: MemoMetadata = {
    id: String(data.id || ""),
    created_at: String(data.created_at || ""),
    updated_at: String(data.updated_at || ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    visibility: String(data.visibility || "public"),
  };
  return { meta, content: parsed.content.trimEnd(), filePath, relativePath };
}

export async function readMemoFile(filePath: string, dataDir: string): Promise<MemoRecord> {
  const relativePath = path.relative(dataDir, filePath);
  return parseMemo(await readFile(filePath, "utf8"), filePath, relativePath);
}

export function serializeMemo(meta: MemoMetadata, content: string): string {
  return matter.stringify(content.trimEnd() + "\n", meta);
}

export async function writeMemoFile(dataDir: string, relativePath: string, meta: MemoMetadata, content: string): Promise<string> {
  const filePath = path.join(dataDir, relativePath);
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, serializeMemo(meta, content), "utf8");
  return filePath;
}

export function newMemo(content: string, date = new Date()): { meta: MemoMetadata; relativePath: string } {
  const identity = createMemoIdentity(date);
  const now = localIso(date);
  return {
    relativePath: identity.relativePath,
    meta: {
      id: identity.id,
      created_at: now,
      updated_at: now,
      tags: extractTags(content),
      visibility: "public",
    },
  };
}

export function validateRawMemo(record: MemoRecord, original: MemoMetadata): MemoMetadata {
  if (!record.meta.id) throw new Error("Invalid front matter: id is required.");
  if (!record.meta.created_at || Number.isNaN(new Date(record.meta.created_at).getTime())) {
    throw new Error("Invalid front matter: created_at must be a valid date.");
  }
  if (!Array.isArray(record.meta.tags)) throw new Error("Invalid front matter: tags must be an array.");
  return {
    ...record.meta,
    id: original.id,
    created_at: original.created_at,
    updated_at: localIso(),
    tags: record.meta.tags.map(String),
    visibility: record.meta.visibility || "public",
  };
}
