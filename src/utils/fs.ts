import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export function expandHome(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

export function resolvePath(input: string): string {
  return path.resolve(expandHome(input));
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walkFiles(root: string, suffix = ".md"): Promise<string[]> {
  if (!(await pathExists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) return walkFiles(full, suffix);
      return entry.isFile() && entry.name.endsWith(suffix) ? [full] : [];
    }),
  );
  return files.flat();
}
