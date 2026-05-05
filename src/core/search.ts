import path from "node:path";
import { commandExists, run } from "../utils/shell.js";

export interface SearchResult {
  filePath: string;
  line: number;
  text: string;
}

export function searchBackend(): "rg" | "grep" {
  return commandExists("rg") ? "rg" : "grep";
}

export async function searchMemos(dataDir: string, query: string, limit = 20): Promise<SearchResult[]> {
  const root = path.join(dataDir, "memos");
  if (searchBackend() === "rg") {
    const result = await run("rg", ["--json", query, root], { allowFailure: true });
    const rows: SearchResult[] = [];
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
