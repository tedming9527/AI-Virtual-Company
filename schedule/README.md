# Scheduling

The source of truth is `company-schedule.yaml` (default: Sunday 20:00 Asia/Shanghai). A Codex thread automation is also created for the weekly run.

For an optional local macOS fallback, copy `com.ai-virtual-company.weekly.plist.template` to `~/Library/LaunchAgents/com.ai-virtual-company.weekly.plist`, replace `__ROOT__` with this folder’s absolute path, then load it with `launchctl bootstrap gui/$(id -u) ...`. The fallback creates an inbox event; it deliberately does not impersonate or scrape any conversation.
