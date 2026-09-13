#!/usr/bin/env bash
set -euo pipefail

SOURCE_BRANCH="${1:-}"
TARGET_BRANCH="test"
WORKFLOW_FILE="cicd.yml"
DEPLOY_ENV="test"
ACTION_TYPE="build-and-deploy"
REPO_OWNER=""
REPO_NAME=""
POLL_MAX=120
POLL_INTERVAL=15

die()  { printf '❌ Error: %s\n' "$*" >&2; exit 1; }
info() { printf '%s\n' "$*"; }
remote_sha() { git ls-remote origin "refs/heads/$1" 2>/dev/null | awk 'NR==1{print $1; exit}'; }

resolve_source_branch() {
  if [[ -n "$SOURCE_BRANCH" ]]; then return 0; fi
  SOURCE_BRANCH="$(git branch --show-current 2>/dev/null || true)"
  [[ -n "$SOURCE_BRANCH" ]] || die "source branch is required"
}

ensure_vanke_project() {
  local top
  top="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$top" ]] || die "not inside a Git repository"
  [[ "/$top/" == */vanke/* ]] || die "this workflow is restricted to projects under a vanke directory"
}

detect_repo_from_remote() {
  local url
  url="$(git remote get-url origin 2>/dev/null || true)"
  [[ -n "$url" ]] || die "no origin remote found"
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    REPO_OWNER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
  else
    die "cannot parse GitHub owner/repo from origin"
  fi
}

ensure_gh() {
  command -v gh >/dev/null 2>&1 || die "GitHub CLI is required"
  if ! gh auth status >/dev/null 2>&1; then
    local credential="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
    [[ -n "$credential" ]] || die "GitHub CLI is not authenticated"
    export GH_TOKEN="$credential"
  fi
}

step1_check_clean() {
  info "[1/5] Checking working tree..."
  git diff --quiet && git diff --cached --quiet || die "working tree has uncommitted tracked changes"
}

step2_ensure_pushed() {
  info "[2/5] Checking source branch on origin..."
  local local_tip remote_tip remote_after
  remote_tip="$(remote_sha "$SOURCE_BRANCH")"
  [[ -n "$remote_tip" ]] || die "source branch is not on origin"
  local_tip="$(git rev-parse --verify --quiet "$SOURCE_BRANCH" 2>/dev/null || true)"
  [[ -n "$local_tip" ]] || return 0
  [[ "$local_tip" == "$remote_tip" ]] && return 0
  git merge-base --is-ancestor "$remote_tip" "$local_tip" || die "local branch is behind or diverged"
  git push origin "$SOURCE_BRANCH" || die "git push failed"
  remote_after="$(remote_sha "$SOURCE_BRANCH")"
  [[ "$remote_after" == "$local_tip" ]] || die "push verification failed"
}

step3_merge_and_verify() {
  info "[3/5] Merging and verifying..."
  local source_sha target_sha output rc ahead_by
  source_sha="$(remote_sha "$SOURCE_BRANCH")"
  target_sha="$(remote_sha "$TARGET_BRANCH")"
  [[ -n "$source_sha" && -n "$target_sha" ]] || die "cannot read remote branch tips"
  set +e
  output="$(gh api -X POST "repos/$REPO_OWNER/$REPO_NAME/merges" -f base="$TARGET_BRANCH" -f head="$SOURCE_BRANCH" -f commit_message="[#AI] chore: merge $SOURCE_BRANCH into $TARGET_BRANCH" 2>&1)"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]] && ! printf '%s' "$output" | grep -qiE 'already up[ -]to[ -]date|no commits between'; then
    die "remote merge failed: $output"
  fi
  target_sha="$(remote_sha "$TARGET_BRANCH")"
  ahead_by="$(gh api "repos/$REPO_OWNER/$REPO_NAME/compare/${target_sha}...${source_sha}" --jq '.ahead_by' 2>/dev/null || true)"
  [[ "$ahead_by" == "0" ]] || die "merge verification failed"
}

step4_trigger_and_verify() {
  info "[4/5] Triggering workflow..."
  local run_before new_id run_url i
  [[ -f ".github/workflows/$WORKFLOW_FILE" ]] || die "workflow file not found"
  run_before="$(gh run list --workflow "$WORKFLOW_FILE" --branch "$TARGET_BRANCH" --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // ""' 2>/dev/null || true)"
  gh workflow run "$WORKFLOW_FILE" --ref "$TARGET_BRANCH" -f action_type="$ACTION_TYPE" -f deploy_env="$DEPLOY_ENV" || die "workflow dispatch failed"
  new_id=""
  for ((i=1; i<=20; i++)); do
    sleep 3
    new_id="$(gh run list --workflow "$WORKFLOW_FILE" --branch "$TARGET_BRANCH" --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // ""' 2>/dev/null || true)"
    [[ -n "$new_id" && "$new_id" != "$run_before" ]] && break
  done
  [[ -n "$new_id" && "$new_id" != "$run_before" ]] || die "no new workflow run appeared"
  run_url="$(gh run view "$new_id" --json url --jq '.url' 2>/dev/null || true)"
  RUN_ID="$new_id"
  RUN_URL="$run_url"
}

step5_poll() {
  info "[5/5] Polling workflow..."
  local i data status conclusion
  for ((i=1; i<=POLL_MAX; i++)); do
    data="$(gh run view "$RUN_ID" --json status,conclusion --jq '.status + " " + (.conclusion // "null")' 2>/dev/null || true)"
    status="${data%% *}"
    conclusion="${data##* }"
    if [[ "$status" == "completed" ]]; then
      [[ "$conclusion" == "success" ]] || die "build failed ($conclusion): $RUN_URL"
      info "Build succeeded: $RUN_URL"
      return 0
    fi
    sleep "$POLL_INTERVAL"
  done
  die "workflow polling timed out: $RUN_URL"
}

RUN_ID=""
RUN_URL=""
resolve_source_branch
[[ "$SOURCE_BRANCH" != "$TARGET_BRANCH" ]] || die "source branch cannot be test"
ensure_vanke_project
detect_repo_from_remote
ensure_gh
info "Repo: $REPO_OWNER/$REPO_NAME"
info "Merge: $SOURCE_BRANCH -> $TARGET_BRANCH"
step1_check_clean
step2_ensure_pushed
step3_merge_and_verify
step4_trigger_and_verify
step5_poll
