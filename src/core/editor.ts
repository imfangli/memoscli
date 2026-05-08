import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { commandExists, runShell } from "../utils/shell.js";

export function resolveEditor(): string {
  if (process.env.EDITOR) return process.env.EDITOR;
  for (const candidate of ["nvim", "vim", "vi", "nano"]) {
    if (commandExists(candidate)) return candidate;
  }
  throw new Error("No editor found. Set $EDITOR or install nvim, vim, vi, or nano.");
}

export async function editText(initial: string, suffix = ".md"): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "memo-"));
  const filePath = path.join(dir, `memo${suffix}`);
  await writeFile(filePath, initial, "utf8");
  try {
    await runShell(`${resolveEditor()} ${JSON.stringify(filePath)}`);
    return await readFile(filePath, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function editFile(filePath: string): Promise<void> {
  await runShell(`${resolveEditor()} ${JSON.stringify(filePath)}`);
}
