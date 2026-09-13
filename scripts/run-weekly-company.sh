#!/bin/zsh
# Local launcher configuration. Intended to be invoked by launchd or manually.
set -eu
ROOT="${AI_VIRTUAL_COMPANY_ROOT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/AI-Virtual-Company}"
mkdir -p "$ROOT/inbox/session-events"
STAMP="$(date '+%Y-%m-%dT%H:%M:%S%z')"
EVENT="$ROOT/inbox/session-events/weekly-${STAMP}.md"
cat > "$EVENT" <<EOF
id: weekly-${STAMP}
created_at: ${STAMP}
source: local-scheduler
request: Run the bounded weekly specialist learning cycle and Weekly All Hands using schedule/company-schedule.yaml.
scope: AI Virtual Company
sensitivity: internal
requested_outcome: research-and-meeting
EOF
echo "Created routing event: $EVENT"
echo "Open the company in Codex and ask Chief of Staff to process this event."
