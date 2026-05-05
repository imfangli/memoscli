# Contributing

Thanks for taking a look at `memoscli`.

## Development Setup

```bash
pnpm install
pnpm build
pnpm test
```

Run the CLI from source:

```bash
pnpm dev -- --help
pnpm dev -- init /tmp/memo-dev
pnpm dev -- --data-dir /tmp/memo-dev a "hello #dev"
```

## Checks Before A PR

Please run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm audit --registry=https://registry.npmjs.org --audit-level moderate
pnpm pack --dry-run
```

## Design Principles

- Markdown files are the source of truth.
- One memo is one file.
- Git should commit only the touched memo file.
- Webhook failure should not make a successful memo operation fail.
- Keep the default CLI path simple: write first, configure later.

## OS Support

The supported development targets are macOS, Linux, and Windows through WSL or Git Bash. Windows native PowerShell/CMD is not guaranteed in v0.1.

## Pull Request Notes

- Add focused tests for behavior changes.
- Avoid committing generated `dist/` files unless the release process asks for them.
- Do not commit local `config.toml`, webhook secrets, or memo data.

## Release Process

Releases are published to npm from GitHub Releases using npm Trusted Publishing.

Before creating a release:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm audit --registry=https://registry.npmjs.org --audit-level moderate
pnpm pack --dry-run
```

Update the package version:

```bash
npm version patch
git push origin main --follow-tags
```

Create a GitHub Release whose tag exactly matches the package version:

```text
v0.1.1
```

The publish workflow checks the tag against `package.json` and then runs tests, typecheck, build, pack dry-run, and `npm publish --access public`.

Trusted publisher setup on npm:

- Package: `memoscli`
- Publisher: GitHub Actions
- Owner: `imfangli`
- Repository: `memoscli`
- Workflow filename: `publish.yml`

The workflow intentionally does not use `NPM_TOKEN`.
