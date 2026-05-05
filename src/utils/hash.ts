import { createHash, createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

export function randomHex(bytes = 2): string {
  return randomBytes(bytes).toString("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function hmacSha256(secret: string, payload: string, timestamp: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}
