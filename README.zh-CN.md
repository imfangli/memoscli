<p align="center">
  <img src="assets/memoscli-logo.svg" alt="memoscli" width="360">
</p>

# memoscli

[English README](README.md)

`memoscli` 是一个本地优先的 Markdown memo 命令行工具：一条 memo 对应一个 Markdown 文件，Git 负责历史记录和多设备同步，Webhook 可把变更事件推送给外部系统。

它不是 Memos Web App 的替代品。它更适合习惯在终端里写东西、希望数据直接落在本地文件系统、并用 Git 掌控同步和版本历史的用户。

## 快速开始

安装：

```bash
npm i -g memoscli
memo --help
```

npm 包名是 `memoscli`，安装后的命令是 `memo`。也可以不全局安装，直接试用：

```bash
npx memoscli --help
```

初始化默认数据目录并写入第一条 memo：

```bash
memo init
memo a "一个本地优先的 memo 想法 #idea #cli"
memo ls
memo s "本地优先"
```

查看、编辑、删除一条 memo：

```bash
memo sh 20260505143012-a8f3
memo e 20260505143012-a8f3
memo rm 20260505143012-a8f3
```

手动 Git 同步：

```bash
memo sy
```

如果要使用自定义数据目录：

```bash
memo init ~/notes/memo
memo --data-dir ~/notes/memo a "写到另一个 memo 仓库"
```

也可以通过环境变量指定：

```bash
MEMO_DIR=~/notes/memo memo ls
```

## 核心概念

- 默认数据目录是 `~/.memo/`。
- 每条 memo 都是一个 Markdown 文件，默认保存到 `~/.memo/memos/YYYY/MM/DD/`。
- `memo add`、`memo edit`、`memo delete` 会为变更创建本地 Git commit。
- `config.toml` 是每台机器的本地配置，不会进入 memo 数据仓库，因为它可能包含本地路径、Webhook URL 或 secret。
- 搜索优先使用 `rg`，没有安装时回退到 `grep`。
- 交互式选择优先使用 `fzf`，没有安装时回退到内置的 Node prompt。

默认目录结构：

```text
~/.memo/
├── memos/
├── assets/
├── events/
│   ├── pending/
│   ├── sent/
│   └── failed/
├── config.toml
└── .git/
```

memo 文件示例：

```markdown
---
id: 20260505143012-a8f3
created_at: '2026-05-05T14:30:12+08:00'
updated_at: '2026-05-05T14:30:12+08:00'
tags:
  - idea
  - cli
---

今天想到一个本地优先的 memo 工具。

#idea #cli
```

## 常用命令速查

| 功能 | 命令 | 别名 | 示例 |
| --- | --- | --- | --- |
| 初始化数据目录 | `memo init [dir]` | `memo i` | `memo init` |
| 从已有 Git 仓库初始化 | `memo init --from <repo>` | `memo i` | `memo init --from git@github.com:user/memos.git` |
| 添加 memo | `memo add [content...]` | `memo a` | `memo a "今天的想法 #idea"` |
| 查看最近 memo | `memo list` | `memo ls` | `memo ls --limit 10` |
| 查看今天的 memo | `memo today` | `memo td` | `memo td` |
| 显示指定 memo | `memo show <id>` | `memo sh` | `memo sh 20260505143012-a8f3` |
| 交互式打开 memo | `memo open` | `memo o` | `memo o` |
| 编辑 memo | `memo edit [id]` | `memo e` | `memo e --select` |
| 删除 memo | `memo delete [id]` | `memo rm` | `memo rm --select` |
| 搜索 memo | `memo search <query>` | `memo s` | `memo s "webhook" --matches` |
| Git 同步 | `memo sync` | `memo sy` | `memo sy` |
| 查看状态 | `memo status` | `memo st` | `memo st` |
| Webhook 管理 | `memo webhook` | `memo wh` | `memo wh st` |

常用筛选和交互选项：

```bash
memo ls --tag idea
memo ls --date 2026-05-05
memo s "webhook" --matches
memo s "webhook" --path
memo s "webhook" --select
memo e --select
memo rm --select
```

## 多设备同步

每次 memo 变更都会创建本地 Git commit。你可以把 `~/.memo/` 当成一个普通 Git 仓库来连接 GitHub、GitLab 或自建 Git 服务。

第一台电脑：

```bash
memo init
git -C ~/.memo remote add origin git@github.com:user/memos.git
memo sync
```

另一台电脑：

```bash
memo init --from git@github.com:user/memos.git
memo sync
```

也可以克隆到自定义目录：

```bash
memo init ~/notes/memo --from git@github.com:user/memos.git
memo --data-dir ~/notes/memo sy
```

注意：

- `memo init --from` 不会覆盖非空目录；如果目标目录已经有文件，请换一个空目录或自行处理旧目录。
- 远程仓库应该是 memo 数据仓库，而不是 `memoscli` 源码仓库。memo 数据仓库通常会包含 `memos/` 目录。
- `config.toml` 不会同步到远程仓库。每台机器会生成自己的本地配置。

开启 add/edit/delete 后的后台 push：

```toml
[git]
auto_push = true
```

开启后，变更命令会在启动后台同步后立即返回：

```text
Git: sync started in background. Log: .git/memo-sync.log
```

查看后台同步日志：

```bash
tail -f ~/.memo/.git/memo-sync.log
```

## 配置说明

打开配置文件：

```bash
$EDITOR ~/.memo/config.toml
```

默认配置结构：

```toml
data_dir = "/Users/you/.memo"

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

常用项：

- `git.auto_commit`: memo 变更后是否自动创建 Git commit。
- `git.auto_push`: memo 变更后是否启动后台同步。
- `editor.raw_by_default`: 编辑时是否默认打开完整 Markdown 文件；默认只编辑正文，避免误改 front matter。
- `editor.extract_tags_from_body`: 是否从正文里的 `#tag` 自动提取标签。
- `webhook.secret`: Webhook 签名密钥。它可能是敏感信息，不应提交到 Git。

## Webhook

在 `~/.memo/config.toml` 里配置 endpoint：

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

常用命令：

```bash
memo wh st       # 查看队列状态
memo wh f        # 发送 pending 事件
memo wh r        # 重试 failed 事件
memo wh t n8n    # 向 n8n 发送测试事件
```

如果设置了 `webhook.secret`，请求会带上签名头：

```text
x-memo-timestamp
x-memo-signature: sha256=<hmac>
```

Webhook 队列文件属于运行时状态，不会进入 Git。

## 安装要求

必需：

- Node.js 20+
- Git
- POSIX-like shell，用于后台 Git 同步

可选：

- `pnpm`，用于源码开发
- `rg`，用于更快搜索
- `fzf`，用于更好的交互式选择
- `nvim`、`vim`、`vi` 或 `nano`，当 `$EDITOR` 未设置时使用

支持情况：

- macOS 和 Linux 完整支持。
- Windows 可通过 WSL 或 Git Bash 使用。
- 当前版本不保证原生 PowerShell/CMD 体验。

## 从源码安装

```bash
git clone https://github.com/imfangli/memoscli.git
cd memoscli
pnpm install
pnpm build
pnpm link --global
memo --help
```

如果 `pnpm link --global` 提示找不到 global bin 目录：

```bash
pnpm setup
source ~/.zshrc
pnpm link --global
```

开发模式：

```bash
pnpm dev --help
pnpm dev init /tmp/memo-demo
```

## 排障

### npm 安装后找不到 `memo`

检查 npm 全局 bin 路径：

```bash
npm bin -g
npm config get prefix
```

确认全局 bin 目录已经在 `PATH` 中。

### `pnpm link --global` 找不到 global bin 目录

运行：

```bash
pnpm setup
source ~/.zshrc
pnpm link --global
```

### Git 提示没有 tracking information

运行：

```bash
memo sync
```

当存在 `origin` remote 时，`memo sync` 可以自动设置 upstream。

### `memo init --from` 提示目标目录非空

请选择空目录、自己移走旧目录，或克隆到另一个路径：

```bash
memo init ~/notes/memo --from git@github.com:user/memos.git
```

`memo` 不会覆盖非空目录里的文件。

### `memo init --from` 无法访问 GitHub

先确认仓库 URL 正确，并且 Git 可以认证：

```bash
git ls-remote git@github.com:user/memos.git
```

如果使用 SSH URL，确认 SSH key 对 Git 可用。如果使用 HTTPS URL，确认 Git credential helper 里有有效 token。

### 克隆后没有 memo

确认你克隆的是 memo 数据仓库，而不是 `memoscli` 源码仓库。memo 数据仓库应该包含 `memos/` 目录和 memo 文件的 Git 历史。

### 后台同步没有 push

查看日志和 Git 状态：

```bash
tail -n 80 ~/.memo/.git/memo-sync.log
git -C ~/.memo status --short --branch
```

### 没有安装 `rg` 或 `fzf`

`memo` 仍然可用。搜索会回退到 `grep`，交互式选择会回退到基础 Node prompt。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=imfangli/memoscli&type=Date)](https://www.star-history.com/#imfangli/memoscli&Date)

## 贡献、安全和许可

- 贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 安全政策见 [SECURITY.md](SECURITY.md)。
- 许可证：MIT。
