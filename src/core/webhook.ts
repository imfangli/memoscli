import { mkdir, readFile, rename, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MemoWebhookEvent, MomoConfig } from "../types.js";
import { ensureDir, pathExists } from "../utils/fs.js";
import { hmacSha256, randomHex, sha256File } from "../utils/hash.js";
import { localIso } from "../utils/time.js";
import { gitBranch, gitCommitMessage, gitHead, gitLastCommitNameStatus, gitShow } from "./git.js";
import { parseMemo, readMemoFile } from "./memo.js";

export function eventsDir(dataDir: string, queue: "pending" | "sent" | "failed"): string {
  return path.join(dataDir, "events", queue);
}

export async function ensureEventDirs(dataDir: string): Promise<void> {
  await Promise.all(["pending", "sent", "failed"].map((queue) => ensureDir(eventsDir(dataDir, queue as "pending"))));
}

export async function queueEvent(dataDir: string, event: MemoWebhookEvent, queue: "pending" | "sent" | "failed" = "pending"): Promise<string> {
  await ensureEventDirs(dataDir);
  const filePath = path.join(eventsDir(dataDir, queue), `${event.event_id}.json`);
  await writeFile(filePath, JSON.stringify(event, null, 2), "utf8");
  return filePath;
}

function eventName(status: string): MemoWebhookEvent["event"] | undefined {
  if (status === "A") return "memo.created";
  if (status === "M") return "memo.updated";
  if (status === "D") return "memo.deleted";
  return undefined;
}

function fileStatus(status: string): NonNullable<MemoWebhookEvent["file"]>["status"] {
  if (status === "A") return "added";
  if (status === "M") return "modified";
  if (status === "D") return "deleted";
  return "renamed";
}

export async function generateEventsForLastCommit(dataDir: string): Promise<MemoWebhookEvent[]> {
  return generateEventsFromStatuses(dataDir, await gitLastCommitNameStatus(dataDir));
}

export async function generateEventsFromDiff(dataDir: string, from: string, to: string): Promise<MemoWebhookEvent[]> {
  const { gitDiffNameStatus } = await import("./git.js");
  return generateEventsFromStatuses(dataDir, await gitDiffNameStatus(dataDir, from, to), from);
}

async function generateEventsFromStatuses(dataDir: string, rows: string[], deletedRef = "HEAD~1"): Promise<MemoWebhookEvent[]> {
  const branch = await gitBranch(dataDir);
  const commit = await gitHead(dataDir);
  const commit_message = await gitCommitMessage(dataDir);
  const events: MemoWebhookEvent[] = [];
  for (const row of rows) {
    const [status, relativePath] = row.split(/\s+/);
    const event = eventName(status);
    if (!event || !relativePath?.endsWith(".md")) continue;
    const fullPath = path.join(dataDir, relativePath);
    const raw = status === "D" ? await gitShow(dataDir, `${deletedRef}:${relativePath}`) : await readFile(fullPath, "utf8");
    const memo = parseMemo(raw, fullPath, relativePath);
    events.push({
      event_id: `evt_${memo.meta.id.replace("-", "_")}_${randomHex(2)}`,
      event,
      occurred_at: localIso(),
      source: "momo-cli",
      sync_mode: status === "D" ? undefined : "replace",
      memo: { ...memo.meta, content: memo.content },
      file: {
        path: relativePath,
        status: fileStatus(status),
        sha256: status === "D" ? undefined : await sha256File(fullPath),
      },
      git: { branch, commit, commit_message },
    });
  }
  for (const event of events) await queueEvent(dataDir, event);
  return events;
}

export async function countEvents(dataDir: string, queue: "pending" | "sent" | "failed"): Promise<number> {
  const dir = eventsDir(dataDir, queue);
  if (!(await pathExists(dir))) return 0;
  return (await readdir(dir)).filter((file) => file.endsWith(".json")).length;
}

export async function flushQueue(dataDir: string, config: MomoConfig, source: "pending" | "failed" = "pending"): Promise<{ sent: number; failed: number }> {
  await ensureEventDirs(dataDir);
  const dir = eventsDir(dataDir, source);
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
  let sent = 0;
  let failed = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const event = JSON.parse(await readFile(filePath, "utf8")) as MemoWebhookEvent;
    const ok = await sendEvent(config, event);
    const target = path.join(eventsDir(dataDir, ok ? "sent" : "failed"), file);
    await mkdir(path.dirname(target), { recursive: true });
    await rename(filePath, target);
    if (ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

export async function sendEvent(config: MomoConfig, event: MemoWebhookEvent): Promise<boolean> {
  if (!config.webhook.enabled) return true;
  const endpoints = config.webhook.endpoints.filter(
    (endpoint) => endpoint.enabled && endpoint.events.includes(event.event),
  );
  if (endpoints.length === 0) return true;
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.webhook.secret) {
    headers["x-momo-timestamp"] = timestamp;
    headers["x-momo-signature"] = `sha256=${hmacSha256(config.webhook.secret, body, timestamp)}`;
  }
  const timeout = Math.max(1, config.webhook.timeout_seconds) * 1000;
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(endpoint.url, { method: "POST", headers, body, signal: controller.signal });
        return response.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return results.every(Boolean);
}

export async function createTestEvent(name: string): Promise<MemoWebhookEvent> {
  return {
    event_id: `evt_test_${Date.now()}_${randomHex(2)}`,
    event: "webhook.test",
    occurred_at: localIso(),
    source: "momo-cli",
    memo: { id: "test", content: `Webhook test for ${name}`, created_at: localIso(), updated_at: localIso(), tags: [], visibility: "public" },
  };
}
