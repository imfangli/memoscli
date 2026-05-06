# Changelog

## 0.3.0

- Add a project logo asset and show it at the top of the English and Chinese README files.
- Include README assets in the published npm package.

## 0.2.0

- Add `memo init --from <repo>` to initialize a memo data directory from an existing Git repository.
- Bootstrap local-only config and runtime directories after cloning a memo data repository.
- Refuse to clone into non-empty target directories to avoid overwriting local files.
- Document multi-computer GitHub sync setup and troubleshooting.

## 0.1.0

- First npm release.
- Initial local-first memo CLI.
- Markdown front matter memo storage.
- Git commits for add/edit/delete.
- Safe body-only edit mode and raw edit mode.
- Search with `rg`/`grep` and highlighted output.
- Interactive selection with `fzf` fallback.
- Webhook queue, flush, retry, and test commands.
- Optional background Git sync.
- Command aliases for common workflows.
