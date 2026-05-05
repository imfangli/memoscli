export type MemoVisibility = "public" | "private" | "protected";

export interface MemoMetadata {
  id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  visibility: MemoVisibility | string;
}

export interface MemoRecord {
  meta: MemoMetadata;
  content: string;
  filePath: string;
  relativePath: string;
}

export interface WebhookEndpoint {
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
}

export interface MomoConfig {
  data_dir: string;
  git: {
    auto_commit: boolean;
    auto_push: boolean;
    default_branch: string;
  };
  editor: {
    raw_by_default: boolean;
    extract_tags_from_body: boolean;
  };
  webhook: {
    enabled: boolean;
    auto_send: boolean;
    timeout_seconds: number;
    retry: number;
    secret: string;
    endpoints: WebhookEndpoint[];
  };
}

export type GitNameStatus = "A" | "M" | "D" | "R";

export type MemoEventName =
  | "memo.created"
  | "memo.updated"
  | "memo.deleted"
  | "memo.renamed"
  | "webhook.test";

export interface MemoWebhookEvent {
  event_id: string;
  event: MemoEventName;
  occurred_at: string;
  source: "momo-cli";
  sync_mode?: "replace";
  memo?: MemoMetadata & { content: string };
  file?: {
    path: string;
    status: "added" | "modified" | "deleted" | "renamed";
    sha256?: string;
  };
  git?: {
    branch: string;
    commit: string;
    commit_message: string;
  };
}
