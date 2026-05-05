# memoscli

Local-first Markdown memo CLI backed by Git and webhooks.

`memoscli` is a small command-line memo tool for people who prefer writing from the terminal. It is not a replacement for the Memos web app. The core idea is simpler: one memo is one Markdown file, Git records history and sync, and optional webhooks notify external systems.

## Features

- Local-first storage in Markdown files
- One memo per file under `~/.momo/memos/YYYY/MM/DD/`
- Git commit for each add/edit/delete
- Optional background Git sync
- Safe edit mode that edits only the memo body
- `rg` search with `grep` fallback
- `fzf` selection with a Node prompt fallback
- Webhook event queue with retry

## Requirements

- Node.js 20+
- Git
- A POSIX-like shell for background Git sync

Optional:

- pnpm for source development
- `rg` for faster search
- `fzf` for interactive selection
- `nvim`, `vim`, `vi`, or `nano` if `$EDITOR` is not set

## OS Support

Fully supported:

- macOS
- Linux

Supported via compatibility layer:

- Windows with WSL or Git Bash

Not guaranteed in v0.1:

- Windows native PowerShell/CMD

Some features, especially background Git sync and command detection, currently depend on `sh`.

## Install

```bash
npm i -g memoscli
memo --help
```

The npm package is named `memoscli`; the installed command is `memo`.

You can also try it without installing globally:

```bash
npx memoscli --help
```

## Quick Start

```bash
memo init
memo a "A local-first memo idea #idea #cli"
memo ls
memo s "local-first"
```

Open a memo:

```bash
memo sh 20260505143012-a8f3
```

Edit a memo:

```bash
memo e 20260505143012-a8f3
```

Delete a memo:

```bash
memo rm 20260505143012-a8f3
```

Manual Git sync:

```bash
memo sy
```

## Install From Source

```bash
git clone https://github.com/imfangli/memoscli.git
cd memoscli
pnpm install
pnpm build
pnpm link --global
memo --help
```

If `pnpm link --global` reports that the global bin directory is missing:

```bash
pnpm setup
source ~/.zshrc
pnpm link --global
```

Development mode:

```bash
pnpm dev -- --help
pnpm dev -- init /tmp/memo-demo
```

## Data Model

Default data directory:

```text
~/.momo/
├── memos/
├── assets/
├── events/
│   ├── pending/
│   ├── sent/
│   └── failed/
├── config.toml
└── .git/
```

Memo file example:

```markdown
---
id: 20260505143012-a8f3
created_at: '2026-05-05T14:30:12+08:00'
updated_at: '2026-05-05T14:30:12+08:00'
tags:
  - idea
  - cli
---

Today I thought about a local-first memo tool.

#idea #cli
```

`config.toml` is ignored by the memo data repository because it may contain local paths, webhook URLs, or secrets.

## Configuration

Open:

```bash
$EDITOR ~/.momo/config.toml
```

Default shape:

```toml
data_dir = "/Users/you/.momo"

[git]
auto_commit = true
auto_push = false
default_branch = "main"

[editor]
raw_by_default = false
extract_tags_from_body = true

[webhook]
enabled = true
auto_send = true
timeout_seconds = 5
retry = 3
secret = ""
```

You can override the data directory per command:

```bash
memo --data-dir ~/notes/memo a "Write somewhere else"
```

Or by environment variable:

```bash
MOMO_DIR=~/notes/memo memo ls
```

## Git Sync

Each memo mutation creates a local Git commit.

Manual sync:

```bash
memo sync
```

Enable background sync after add/edit/delete:

```toml
[git]
auto_push = true
```

When enabled, mutation commands return immediately after starting background sync:

```text
Git: sync started in background. Log: .git/memo-sync.log
```

Check the log inside the memo data repository:

```bash
tail -f ~/.momo/.git/memo-sync.log
```

## Webhooks

Configure endpoints in `~/.momo/config.toml`:

```toml
[webhook]
enabled = true
auto_send = true
timeout_seconds = 5
retry = 3
secret = ""

[[webhook.endpoints]]
name = "n8n"
url = "https://n8n.example.com/webhook/memos"
enabled = true
events = ["memo.created", "memo.updated", "memo.deleted"]
```

Commands:

```bash
memo wh st       # status
memo wh f        # flush pending events
memo wh r        # retry failed events
memo wh t n8n    # send test event
```

If `webhook.secret` is set, requests include:

```text
x-momo-timestamp
x-momo-signature: sha256=<hmac>
```

Webhook queue files are runtime state and are ignored by Git.

## Search And Selection

Search:

```bash
memo s "webhook"
memo s "webhook" --matches
memo s "webhook" --path
```

`memo` uses `rg` when available and falls back to `grep`.

Search output highlights matches unless `NO_COLOR` is set:

```bash
NO_COLOR=1 memo s "webhook"
```

Interactive selection uses `fzf` when available:

```bash
memo o
memo e --select
memo rm --select
memo s "webhook" --select
```

## Command Aliases

| Command | Alias |
| --- | --- |
| `memo init` | `memo i` |
| `memo add` | `memo a` |
| `memo list` | `memo ls` |
| `memo today` | `memo td` |
| `memo show` | `memo sh` |
| `memo open` | `memo o` |
| `memo edit` | `memo e` |
| `memo delete` | `memo rm` |
| `memo search` | `memo s` |
| `memo sync` | `memo sy` |
| `memo status` | `memo st` |
| `memo webhook` | `memo wh` |

Webhook aliases:

| Command | Alias |
| --- | --- |
| `memo wh status` | `memo wh st` |
| `memo wh flush` | `memo wh f` |
| `memo wh retry` | `memo wh r` |
| `memo wh test` | `memo wh t` |
| `memo wh generate` | `memo wh g` |

## Troubleshooting

### `memo` is not found after npm install

Check your global npm bin path:

```bash
npm bin -g
npm config get prefix
```

Make sure the global bin directory is in your `PATH`.

### `pnpm link --global` cannot find global bin dir

Run:

```bash
pnpm setup
source ~/.zshrc
pnpm link --global
```

### Git says there is no tracking information

Use:

```bash
memo sync
```

`memo sync` can set upstream automatically when an `origin` remote exists.

### Background sync did not push

Check:

```bash
tail -n 80 ~/.momo/.git/memo-sync.log
git -C ~/.momo status --short --branch
```

### `rg` or `fzf` is missing

`memo` still works. Search falls back to `grep`, and interactive selection falls back to a basic Node prompt.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Release And npm Publishing

This package is published to npm from GitHub Releases via npm Trusted Publishing.

Trusted publisher settings on npm:

- Package: `memoscli`
- Publisher: GitHub Actions
- Owner: `imfangli`
- Repository: `memoscli`
- Workflow filename: `publish.yml`

Release tags must match `package.json` exactly, for example `v0.1.0`.

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT
