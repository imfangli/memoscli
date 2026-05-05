# Security Policy

## Supported Versions

Security updates are handled on the latest `main` branch while the project is pre-1.0.

## Reporting A Vulnerability

Please open a private security advisory on GitHub if available. If not, open an issue with minimal detail and ask for a private contact path.

Do not include live webhook URLs, tokens, secrets, private memo content, or repository credentials in public issues.

## Local Secrets

`~/.momo/config.toml` may contain webhook URLs and HMAC secrets. The default memo data `.gitignore` ignores this file.

Before publishing a memo data repository, check:

```bash
git -C ~/.momo status --short
git -C ~/.momo grep -n "secret\\|token\\|password" || true
```

Webhook queue files under `events/` are runtime state and are ignored by default.
