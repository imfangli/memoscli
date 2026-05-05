import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import toml from "toml";
import { MomoConfig } from "../types.js";
import { ensureDir, pathExists, resolvePath } from "../utils/fs.js";

export function defaultConfig(dataDir = "~/.momo"): MomoConfig {
  return {
    data_dir: dataDir,
    git: { auto_commit: true, auto_push: false, default_branch: "main" },
    editor: { raw_by_default: false, extract_tags_from_body: true },
    webhook: {
      enabled: true,
      auto_send: true,
      timeout_seconds: 5,
      retry: 3,
      secret: "",
      endpoints: [],
    },
  };
}

export function configToToml(config: MomoConfig): string {
  const endpoints = config.webhook.endpoints
    .map(
      (endpoint) => `
[[webhook.endpoints]]
name = ${JSON.stringify(endpoint.name)}
url = ${JSON.stringify(endpoint.url)}
enabled = ${endpoint.enabled}
events = [${endpoint.events.map((event) => JSON.stringify(event)).join(", ")}]
`,
    )
    .join("");

  return `data_dir = ${JSON.stringify(config.data_dir)}

[git]
auto_commit = ${config.git.auto_commit}
auto_push = ${config.git.auto_push}
default_branch = ${JSON.stringify(config.git.default_branch)}

[editor]
raw_by_default = ${config.editor.raw_by_default}
extract_tags_from_body = ${config.editor.extract_tags_from_body}

[webhook]
enabled = ${config.webhook.enabled}
auto_send = ${config.webhook.auto_send}
timeout_seconds = ${config.webhook.timeout_seconds}
retry = ${config.webhook.retry}
secret = ${JSON.stringify(config.webhook.secret)}
${endpoints}`;
}

export async function createDefaultConfig(dataDir: string): Promise<void> {
  await ensureDir(dataDir);
  const filePath = path.join(dataDir, "config.toml");
  if (!(await pathExists(filePath))) {
    await writeFile(filePath, configToToml(defaultConfig(dataDir)), "utf8");
  }
}

export async function loadConfig(dataDirOverride?: string): Promise<MomoConfig> {
  const envDir = process.env.MOMO_DIR;
  const initialDir = resolvePath(dataDirOverride || envDir || "~/.momo");
  const configPath = path.join(initialDir, "config.toml");
  if (!(await pathExists(configPath))) {
    return { ...defaultConfig(initialDir), data_dir: initialDir };
  }
  const parsed = toml.parse(await readFile(configPath, "utf8")) as Partial<MomoConfig>;
  const merged = defaultConfig(initialDir);
  return {
    data_dir: resolvePath(dataDirOverride || envDir || parsed.data_dir || merged.data_dir),
    git: { ...merged.git, ...parsed.git },
    editor: { ...merged.editor, ...parsed.editor },
    webhook: {
      ...merged.webhook,
      ...parsed.webhook,
      endpoints: parsed.webhook?.endpoints || [],
    },
  };
}
