# Cross-AI global configuration

This directory is the single source of truth for global instructions shared by AI coding tools.

- Edit `AI_RULES.md` for portable behavior and preferences.
- Edit `targets/` only for platform-specific instruction differences.
- Keep permissions, hooks, models, plugins and MCP configuration in each platform's native configuration.
- Never store credentials or machine-specific absolute paths here.
- Portable skills live in `skills/` and are copied into each platform's native global skill directory.

Run `scripts/sync-ai-config.sh` to regenerate Claude Code and Codex instruction files. Existing outputs are backed up with the suffix `.pre-unified-config.bak`.
