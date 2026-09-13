#!/usr/bin/env bash
set -euo pipefail

# Merge source branch to test and trigger CI/CD deployment.
# Auto-detects repo info from git remote when not explicitly passed.
#
# Usage:
#   run.sh [source-branch]
#   run.sh [source-branch] --repo-owner OWNER --repo-name NAME [--workflow FILE] [--deploy-env ENV]
#
# Environment variables (all optional; auto-detected when absent):
#   GITHUB_TOKEN / GH_TOKEN — GitHub personal access token

SOURCE_BRANCH="${1:-}"
TARGET_BRANCH="test"
WORKFLOW_FILE="cicd.yml"
DEPLOY_ENV="test"
ACTION_TYPE="build-and-deploy"
REPO_OWNER=""
REPO_NAME=""

# ---- helpers ----

die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
info() { printf '%s\n' "$*"; }

resolve_source_branch() {
  if [[ -n "$SOURCE_BRANCH" ]]; then
    return 0
  fi
  SOURCE_BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [[ -z "$SOURCE_BRANCH" ]]; then
    die "source branch is required — pass it as the first argument or run inside a git repo"
  fi
}

detect_repo_from_remote() {
  local url
  url="$(git remote get-url origin 2>/dev/null || true)"
  if [[ -z "$url" ]]; then
    die "cannot detect repo: no 'origin' remote found"
  fi

  # Support https://github.com/owner/repo.git and git@github.com:owner/repo.git
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    REPO_OWNER="${REPO_OWNER:-${BASH_REMATCH[1]}}"
    REPO_NAME="${REPO_NAME:-${BASH_REMATCH[2]}}"
  else
    die "cannot parse GitHub owner/repo from remote url: $url"
  fi
}

get_github_token() {
  local token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

  if [[ -z "$token" ]] && command -v gh >/dev/null 2>&1; then
    token="$(gh auth token 2>/dev/null || true)"
  fi

  if [[ -z "$token" ]]; then
    token="$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | awk -F= '/^password=/{print $2}' || true)"
  fi

  if [[ -z "$token" ]]; then
    die "no GitHub token available. Set GITHUB_TOKEN / GH_TOKEN, run 'gh auth login', or configure git credential helper."
  fi

  printf '%s\n' "$token"
}

check_prerequisites() {
  if [[ ! -f ".github/workflows/$WORKFLOW_FILE" ]]; then
    die "workflow file not found: .github/workflows/$WORKFLOW_FILE"
  fi

  # Check source branch exists on remote (use gh if available, else git ls-remote)
  if command -v gh >/dev/null 2>&1; then
    if ! gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$SOURCE_BRANCH" >/dev/null 2>&1; then
      die "source branch '$SOURCE_BRANCH' not found on remote $REPO_OWNER/$REPO_NAME"
    fi
  else
    if ! git ls-remote --exit-code --heads origin "$SOURCE_BRANCH" >/dev/null 2>&1; then
      die "source branch '$SOURCE_BRANCH' not found on origin"
    fi
  fi
}

merge_via_gh() {
  local token="$1"
  export GH_TOKEN="$token"

  set +e
  local output rc
  output="$(gh api -X POST "repos/$REPO_OWNER/$REPO_NAME/merges" \
    -f base="$TARGET_BRANCH" \
    -f head="$SOURCE_BRANCH" \
    -f commit_message="[#AI] chore: merge $SOURCE_BRANCH into $TARGET_BRANCH" 2>&1)"
  rc=$?
  set -e

  if [[ $rc -eq 0 ]]; then
    printf '%s\n' "$output" | sed -n 's/.*"sha": "\([^"]*\)".*/Merge commit: \1/p' | head -n 1
    return 0
  fi

  if printf '%s\n' "$output" | grep -qiE 'already up[ -]to[ -]date|no commits between'; then
    info "Remote merge skipped: '$SOURCE_BRANCH' is already merged into '$TARGET_BRANCH'."
    return 0
  fi

  die "remote merge failed: $output"
}

merge_via_curl() {
  local token="$1"
  local response body status

  response="$(curl -sS -w "\n%{http_code}" -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $token" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/merges" \
    -d "{\"base\":\"$TARGET_BRANCH\",\"head\":\"$SOURCE_BRANCH\",\"commit_message\":\"[#AI] chore: merge $SOURCE_BRANCH into $TARGET_BRANCH\"}" 2>&1)" || {
    # Retry with HTTP/1.1 on HTTP2 framing errors
    response="$(curl -sS --http1.1 -w "\n%{http_code}" -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer $token" \
      "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/merges" \
      -d "{\"base\":\"$TARGET_BRANCH\",\"head\":\"$SOURCE_BRANCH\",\"commit_message\":\"[#AI] chore: merge $SOURCE_BRANCH into $TARGET_BRANCH\"}")"
  }

  status="$(printf '%s\n' "$response" | tail -n 1)"
  body="$(printf '%s\n' "$response" | sed '$d')"

  if [[ "$status" == "201" ]]; then
    printf '%s\n' "$body" | sed -n 's/.*"sha": "\([^"]*\)".*/Merge commit: \1/p' | head -n 1
    return 0
  fi

  if [[ "$status" == "204" ]] || printf '%s\n' "$body" | grep -qiE 'already up[ -]to[ -]date|no commits between'; then
    info "Remote merge skipped: '$SOURCE_BRANCH' is already merged into '$TARGET_BRANCH'."
    return 0
  fi

  die "remote merge failed (HTTP $status): $body"
}

trigger_via_gh() {
  gh workflow run "$WORKFLOW_FILE" \
    --ref "$TARGET_BRANCH" \
    -f action_type="$ACTION_TYPE" \
    -f deploy_env="$DEPLOY_ENV"

  gh run list \
    --workflow "$WORKFLOW_FILE" \
    --branch "$TARGET_BRANCH" \
    --event workflow_dispatch \
    --limit 1 \
    --json url,status,conclusion,createdAt \
    --jq '.[] | "Run: " + .url + " | status=" + .status + " | conclusion=" + (.conclusion // "null") + " | createdAt=" + .createdAt'
}

trigger_via_curl() {
  local token="$1"

  curl -sS -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $token" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/$WORKFLOW_FILE/dispatches" \
    -d "{\"ref\":\"$TARGET_BRANCH\",\"inputs\":{\"action_type\":\"$ACTION_TYPE\",\"deploy_env\":\"$DEPLOY_ENV\"}}" \
    >/dev/null

  curl -sS \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $token" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/$WORKFLOW_FILE/runs?branch=$TARGET_BRANCH&event=workflow_dispatch&per_page=1" \
    | sed -n 's/.*"html_url": "\([^"]*\)".*/Run: \1/p' \
    | head -n 1
}

# ---- main ----

resolve_source_branch

if [[ "$SOURCE_BRANCH" == "$TARGET_BRANCH" ]]; then
  die "source branch cannot be '$TARGET_BRANCH'"
fi

detect_repo_from_remote

info "[1/4] Project: $REPO_OWNER/$REPO_NAME  |  Source: $SOURCE_BRANCH  →  Target: $TARGET_BRANCH"

check_prerequisites

TOKEN="$(get_github_token)"

info "[2/4] Merging '$SOURCE_BRANCH' into '$TARGET_BRANCH' on remote..."
if command -v gh >/dev/null 2>&1; then
  merge_via_gh "$TOKEN"
else
  merge_via_curl "$TOKEN"
fi

info "[3/4] Triggering workflow dispatch to deploy '$TARGET_BRANCH' → '$DEPLOY_ENV'..."
if command -v gh >/dev/null 2>&1; then
  trigger_via_gh
else
  trigger_via_curl "$TOKEN"
fi

info "[4/4] Done."
