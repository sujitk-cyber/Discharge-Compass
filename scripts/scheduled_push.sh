#!/bin/bash
# Pushes 10 commits to origin, one every 30 minutes.
# Run from project root.

set -e
cd "$(dirname "$0")/.."
REPO="discharge-compass"
REMOTE=""

# First 10 commits in order
COMMITS=($(git log --reverse --format=%H | head -10))

echo "=== Discharge Compass - Scheduled Push ==="
echo ""

# Create repo if gh is available
if command -v gh &>/dev/null; then
  if ! gh repo view "$REPO" &>/dev/null 2>&1; then
    echo "Creating public repo: $REPO"
    gh repo create "$REPO" --public --description "30-day hospital readmission risk prediction MVP"
  fi
  REMOTE=$(gh repo view "$REPO" --json cloneUrl -q .cloneUrl 2>/dev/null || true)
fi

if [ -z "$REMOTE" ] && git remote get-url origin &>/dev/null; then
  REMOTE=$(git remote get-url origin)
fi
if [ -z "$REMOTE" ]; then
  echo "gh CLI not found and no origin remote. Create the repo manually:"
  echo "  1. Go to https://github.com/new"
  echo "  2. Name: discharge-compass"
  echo "  3. Public"
  echo "  4. Do NOT initialize with README"
  echo "  5. Create repo"
  echo ""
  read -p "Repo URL (e.g. https://github.com/YOUR_USERNAME/discharge-compass.git): " REMOTE
fi

# Add remote if needed
if ! git remote get-url origin &>/dev/null; then
  git remote add origin "$REMOTE"
elif [ "$(git remote get-url origin)" != "$REMOTE" ]; then
  git remote set-url origin "$REMOTE"
fi

echo ""
echo "Pushing 10 commits, 30 minutes apart (total ~4.5 hours)..."
echo ""

for i in {1..10}; do
  echo "[$(date '+%H:%M:%S')] Pushing Part $i (commit ${COMMITS[$((i-1))]})..."
  git push -f origin "${COMMITS[$((i-1))]}:main"
  if [ $i -lt 10 ]; then
    echo "  Waiting 30 minutes..."
    sleep 1800
  fi
done

echo ""
echo "Done. All 10 parts pushed to $REMOTE"
