#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - stage, commit, and push branch to remote
# Usage:
#   ./deploy.sh                # push current branch to origin
#   ./deploy.sh main           # push main to origin
#   ./deploy.sh deploy-site upstream

REMOTE=${2:-origin}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository. Initialize git and add a remote first."
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TARGET_BRANCH=${1:-$CURRENT_BRANCH}

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Remote '$REMOTE' is not configured."
  echo "Add one first, for example: git remote add $REMOTE https://github.com/<owner>/<repo>.git"
  exit 1
fi

if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
  if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    echo "Switching to existing branch: $TARGET_BRANCH"
    git checkout "$TARGET_BRANCH"
  else
    echo "Creating branch: $TARGET_BRANCH (from $CURRENT_BRANCH)"
    git checkout -b "$TARGET_BRANCH"
  fi
fi

echo "Staging all changes..."
git add -A

if git diff --staged --quiet; then
  echo "No staged changes to commit."
else
  echo "Committing changes..."
  git commit -m "chore: update site"
fi

echo "Pushing '$TARGET_BRANCH' to '$REMOTE'..."
git push -u "$REMOTE" "$TARGET_BRANCH"

echo "Push complete."
echo "Optional PR command:"
echo "  gh pr create --title 'Update site' --body 'Site updates' --base main --head $TARGET_BRANCH"
