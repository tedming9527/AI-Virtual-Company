#!/bin/zsh
set -eu

PROJECTS_ROOT="${TED_PROJECTS_ROOT:-$HOME/Documents/ted-projects}"
PROJECT_ROOT="$PROJECTS_ROOT/ted-personal-execution-system"
REPO_URL="${TED_EXECUTION_REPO_URL:-https://github.com/tedming9527/ted-personal-execution-system.git}"
BRANCH="${TED_EXECUTION_REPO_BRANCH:-main}"
SOURCE_ROOT="$PROJECT_ROOT/apps/ted-mac-assistant"
PLUGIN_ROOT="$PROJECT_ROOT/plugins/ted-mac-assistant"
INSTALL_DIR="${TED_MAC_ASSISTANT_INSTALL_DIR:-$HOME/Applications}"
APP="$INSTALL_DIR/Ted Mac Assistant.app"
MARKETPLACE_FILE="$PROJECT_ROOT/.agents/plugins/marketplace.json"
PLUGIN_ID="ted-mac-assistant@ted-execution"
STATE_FILE="$PROJECT_ROOT/.git/ted-company-plugin.sha256"
ACTION="${1:-check}"
QUIET="${2:-}"

say() { [[ "$QUIET" == "--quiet" ]] || print "$1"; }
warn() { print -u2 "$1"; }

require_project() {
  [[ -d "$PROJECT_ROOT/.git" ]] || { warn "missing: $PROJECT_ROOT (run: $0 sync-project)"; return 1; }
  [[ -r "$SOURCE_ROOT/Package.swift" ]] || { warn "missing: App source"; return 1; }
  [[ -r "$PLUGIN_ROOT/plugin.json" && -r "$PLUGIN_ROOT/mcp.json" ]] || { warn "missing: MCP plugin source"; return 1; }
}

sync_project() {
  mkdir -p "$PROJECTS_ROOT"
  if [[ ! -e "$PROJECT_ROOT" ]]; then
    git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$PROJECT_ROOT"
  fi
  [[ -d "$PROJECT_ROOT/.git" ]] || { warn "not a Git repository: $PROJECT_ROOT"; return 1; }

  local origin tracked local_head remote_head
  origin="$(git -C "$PROJECT_ROOT" remote get-url origin)"
  [[ "$origin" == "$REPO_URL" ]] || { warn "unexpected origin: $origin"; return 1; }
  tracked="$(git -C "$PROJECT_ROOT" status --porcelain --untracked-files=no)"
  [[ -z "$tracked" ]] || { warn "tracked changes prevent automatic update: $PROJECT_ROOT"; return 1; }

  git -C "$PROJECT_ROOT" fetch --prune origin "$BRANCH"
  local_head="$(git -C "$PROJECT_ROOT" rev-parse HEAD)"
  remote_head="$(git -C "$PROJECT_ROOT" rev-parse "origin/$BRANCH")"
  if [[ "$local_head" != "$remote_head" ]]; then
    git -C "$PROJECT_ROOT" merge-base --is-ancestor "$local_head" "$remote_head" || {
      warn "local branch is ahead or diverged; refusing automatic merge"
      return 1
    }
    git -C "$PROJECT_ROOT" merge --ff-only "$remote_head"
  fi
  say "project ready: $(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
}

check_app() {
  if [[ -x "$APP/Contents/MacOS/TedMacAssistant" ]]; then
    say "app present: $APP"
    return 0
  fi
  warn "optional app missing: $APP"
  return 1
}

write_marketplace() {
  require_project
  mkdir -p "${MARKETPLACE_FILE:h}"
  local tmp="${MARKETPLACE_FILE}.tmp.$$"
  {
    print '{'
    print '  "name": "ted-execution",'
    print '  "interface": {"displayName": "Ted Execution"},'
    print '  "plugins": [{'
    print '    "name": "ted-mac-assistant",'
    print '    "source": {"source": "local", "path": "./plugins/ted-mac-assistant"},'
    print '    "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},'
    print '    "category": "Productivity"'
    print '  }]'
    print '}'
  } > "$tmp"
  if [[ ! -r "$MARKETPLACE_FILE" ]] || ! cmp -s "$tmp" "$MARKETPLACE_FILE"; then
    mv "$tmp" "$MARKETPLACE_FILE"
  else
    rm "$tmp"
  fi
  if [[ -w "$PROJECT_ROOT/.git/info/exclude" ]] && ! grep -qxF '/.agents/plugins/marketplace.json' "$PROJECT_ROOT/.git/info/exclude"; then
    print '/.agents/plugins/marketplace.json' >> "$PROJECT_ROOT/.git/info/exclude"
  fi
}

plugin_fingerprint() {
  python3 - "$PLUGIN_ROOT" <<'PY'
import hashlib, pathlib, sys
root = pathlib.Path(sys.argv[1])
digest = hashlib.sha256()
for path in sorted(p for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"):
    digest.update(path.relative_to(root).as_posix().encode())
    digest.update(b"\0")
    digest.update(path.read_bytes())
    digest.update(b"\0")
print(digest.hexdigest())
PY
}

marketplace_present() {
  codex plugin marketplace list --json 2>/dev/null \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if any(x.get("name")=="ted-execution" for x in d.get("marketplaces",[])) else 1)'
}

plugin_installed() {
  codex plugin list --marketplace ted-execution --json 2>/dev/null \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); p=[x for x in d.get("installed",[]) if x.get("pluginId")=="ted-mac-assistant@ted-execution"]; raise SystemExit(0 if len(p)==1 and p[0].get("installed") and p[0].get("enabled") else 1)'
}

install_plugin() {
  require_project
  command -v codex >/dev/null || { warn "unavailable: codex plugin CLI"; return 1; }
  write_marketplace
  marketplace_present || codex plugin marketplace add "$PROJECT_ROOT" --json >/dev/null

  local fingerprint previous=""
  fingerprint="$(plugin_fingerprint)"
  [[ -r "$STATE_FILE" ]] && previous="$(<"$STATE_FILE")"
  if plugin_installed && [[ "$fingerprint" == "$previous" ]]; then
    say "plugin current: $PLUGIN_ID"
  else
    if plugin_installed; then
      codex plugin remove "$PLUGIN_ID" --json >/dev/null
    fi
    codex plugin add "$PLUGIN_ID" --json >/dev/null
    plugin_installed || { warn "plugin installation did not verify: $PLUGIN_ID"; return 1; }
    print -r -- "$fingerprint" > "$STATE_FILE"
    say "plugin updated: $PLUGIN_ID"
  fi

  if codex plugin list --marketplace ted-company --json 2>/dev/null | grep -q 'ted-mac-assistant@ted-company'; then
    codex plugin remove ted-mac-assistant@ted-company --json >/dev/null
  fi
  if codex plugin marketplace list --json 2>/dev/null | grep -q '"name": "ted-company"'; then
    codex plugin marketplace remove ted-company --json >/dev/null
  fi
}

check_plugin() {
  require_project
  command -v codex >/dev/null || { warn "unavailable: codex plugin CLI"; return 1; }
  local current expected
  current="$(plugin_fingerprint)"
  expected=""
  [[ -r "$STATE_FILE" ]] && expected="$(<"$STATE_FILE")"
  plugin_installed && [[ -n "$expected" && "$current" == "$expected" ]] || {
    warn "plugin missing or source changed; run: $0 plugin-upgrade"
    return 1
  }
  say "plugin current: $PLUGIN_ID"
}

ensure_all() {
  sync_project
  check_app || true
  install_plugin
}

case "$ACTION" in
  sync-project) sync_project ;;
  ensure) ensure_all ;;
  check)
    require_project
    check_app
    ;;
  install|upgrade)
    require_project
    TED_MAC_ASSISTANT_INSTALL_DIR="$INSTALL_DIR" "$SOURCE_ROOT/scripts/install.sh"
    check_app
    ;;
  doctor)
    require_project
    if [[ -x "$APP/Contents/MacOS/TedMacAssistantDoctor" ]]; then
      "$APP/Contents/MacOS/TedMacAssistantDoctor"
      python3 "$PLUGIN_ROOT/scripts/mcp_server.py" --call ted_status
      python3 "$PLUGIN_ROOT/scripts/mcp_server.py" --call ted_checkpoint_status
    else
      warn "Ted Mac Assistant is not installed. Run: $0 install"
      exit 1
    fi
    ;;
  plugin-check) check_plugin ;;
  plugin-install|plugin-upgrade) install_plugin ;;
  uninstall)
    require_project
    TED_MAC_ASSISTANT_INSTALL_DIR="$INSTALL_DIR" "$SOURCE_ROOT/scripts/uninstall.sh"
    ;;
  *)
    warn "Usage: $0 sync-project|ensure|check|install|upgrade|doctor|uninstall|plugin-check|plugin-install|plugin-upgrade"
    exit 64
    ;;
esac
