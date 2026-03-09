#!/usr/bin/env bash
# Verifies that agent workflow files exist and have the expected trigger configurations.
set -euo pipefail

WORKFLOWS_DIR="$(cd "$(dirname "$0")/../workflows" && pwd)"
PASS=0
FAIL=0

check() {
  local description="$1"
  local result="$2"
  if [ "$result" = "true" ]; then
    echo "  PASS: $description"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Verifying agent workflow triggers ==="

# claude-triage.yml
TRIAGE="$WORKFLOWS_DIR/claude-triage.yml"
echo ""
echo "claude-triage.yml"
check "file exists" "$([ -f "$TRIAGE" ] && echo true || echo false)"
check "triggers on issues.opened" "$(grep -q 'opened' "$TRIAGE" && echo true || echo false)"
check "triggers on issues.reopened" "$(grep -q 'reopened' "$TRIAGE" && echo true || echo false)"

# claude-interactive.yml
INTERACTIVE="$WORKFLOWS_DIR/claude-interactive.yml"
echo ""
echo "claude-interactive.yml"
check "file exists" "$([ -f "$INTERACTIVE" ] && echo true || echo false)"
check "triggers on issue_comment.created" "$(grep -q 'issue_comment' "$INTERACTIVE" && echo true || echo false)"
check "triggers on pull_request_review_comment.created" "$(grep -q 'pull_request_review_comment' "$INTERACTIVE" && echo true || echo false)"
check "triggers on @claude mention" "$(grep -q '@claude' "$INTERACTIVE" && echo true || echo false)"
check "restricts to OWNER/MEMBER/COLLABORATOR" "$(grep -q 'OWNER,MEMBER,COLLABORATOR' "$INTERACTIVE" && echo true || echo false)"

# claude-auto-fix-issue.yml
AUTO_FIX="$WORKFLOWS_DIR/claude-auto-fix-issue.yml"
echo ""
echo "claude-auto-fix-issue.yml"
check "file exists" "$([ -f "$AUTO_FIX" ] && echo true || echo false)"
check "triggers on repository_dispatch claude-fixable" "$(grep -q 'claude-fixable' "$AUTO_FIX" && echo true || echo false)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
