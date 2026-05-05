import path from "node:path";
import { commandExists, run } from "../utils/shell.js";
import { readMemoFile } from "./memo.js";
import { MemoRecord } from "../types.js";
import { displayDateTime } from "../utils/time.js";
import { summarize } from "./storage.js";

export interface RawSearchResult {
  filePath: string;
  line: number;
  text: string;
}

export interface SearchMatch {
  line: number;
  text: string;
}

export interface SearchResult {
  memo: MemoRecord;
  relativePath: string;
  matches: SearchMatch[];
}

export function searchBackend(): "rg" | "grep" {
  return commandExists("rg") ? "rg" : "grep";
}

export async function rawSearchMemos(dataDir: string, query: string, limit = 100): Promise<RawSearchResult[]> {
  const root = path.join(dataDir, "memos");
  if (searchBackend() === "rg") {
    const result = await run("rg", ["--json", query, root], { allowFailure: true });
    const rows: RawSearchResult[] = [];
    for (const line of result.stdout.split("\n").filter(Boolean)) {
      const event = JSON.parse(line) as { type: string; data?: any };
      if (event.type === "match") {
        rows.push({
          filePath: event.data.path.text,
          line: event.data.line_number,
          text: event.data.lines.text.trim(),
        });
      }
      if (rows.length >= limit) break;
    }
    return rows;
  }
  const result = await run("grep", ["-RIn", "--include=*.md", query, root], { allowFailure: true });
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => {
      const [filePath, lineNo, ...rest] = line.split(":");
      return { filePath, line: Number(lineNo), text: rest.join(":").trim() };
    });
}

export async function searchMemos(dataDir: string, query: string, limit = 20): Promise<SearchResult[]> {
  const rawResults = await rawSearchMemos(dataDir, query, Math.max(limit * 5, limit));
  const grouped = new Map<string, SearchResult>();
  for (const raw of rawResults) {
    const memo = await readMemoFile(raw.filePath, dataDir);
    const key = memo.meta.id || memo.relativePath;
    const existing = grouped.get(key);
    if (existing) {
      existing.matches.push({ line: raw.line, text: raw.text });
    } else {
      grouped.set(key, {
        memo,
        relativePath: memo.relativePath,
        matches: [{ line: raw.line, text: raw.text }],
      });
    }
  }
  return [...grouped.values()].slice(0, limit);
}

export function formatSearchResult(
  result: SearchResult,
  options: { query?: string; showMatches?: boolean; showPath?: boolean; color?: boolean } = {},
): string {
  const tags = result.memo.meta.tags.length ? `  #${result.memo.meta.tags.join(" #")}` : "";
  const pathText = options.showPath ? `  ${result.relativePath}` : "";
  const header = `${displayDateTime(result.memo.meta.created_at)}  ${result.memo.meta.id}${tags}${pathText}`;
  const matches = options.showMatches ? result.matches : result.matches.slice(0, 1);
  return [header, ...matches.map((match) => highlightQuery(summarize(match.text, 120), options.query, options.color))].join("\n");
}

export function highlightQuery(text: string, query?: string, color = !process.env.NO_COLOR): string {
  if (!query || !color) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return text;
  return text.replace(new RegExp(escaped, "gi"), (match) => `\u001b[1;33m${match}\u001b[0m`);
}
