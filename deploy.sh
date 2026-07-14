#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - commit current workspace and push to remote branch for PR
# Usage: ./deploy.sh [branch-name]
BRANCH=${1:-deploy-site}
REMOTE=${2:-origin}

echo "Checking git status..."
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository. Initialize and add remote first."
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Creating branch: $BRANCH (based on $CURRENT_BRANCH)"
git checkout -b "$BRANCH"

echo "Staging all changes..."
git add -A

echo "Committing..."
if git diff --staged --quiet; then
  echo "No changes to commit."
else
  git commit -m "chore: deploy site changes"
fi

echo "Pushing to remote $REMOTE branch $BRANCH"
git push -u "$REMOTE" "$BRANCH"

echo "Done. If you want, open a Pull Request on GitHub and merge to main, or enable GitHub Pages from repository settings."

echo "Optional: create a PR using GitHub CLI (if installed):"
echo "  gh pr create --title 'Deploy site' --body 'Deploy updated site' --base main --head $BRANCH"

echo "Optional: publish to GitHub Pages (if you want main to be the Pages source):"
echo "  gh repo edit --default-branch main && gh pages publish --branch main --source ."
