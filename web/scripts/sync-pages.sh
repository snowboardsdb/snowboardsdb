#!/usr/bin/env bash
set -euo pipefail

web_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pages_dir="$web_dir/../../snowboards.github.io"

if [[ ! -d "$pages_dir/.git" ]]; then
  echo "Pages repository not found at $pages_dir" >&2
  exit 1
fi

if [[ ! -f "$web_dir/build/index.html" ]]; then
  echo "Build not found at $web_dir/build" >&2
  exit 1
fi

rsync -a --delete \
  --exclude='/.git/' \
  --exclude='/.gitignore' \
  --exclude='/CNAME' \
  --exclude='/.nojekyll' \
  "$web_dir/build/" "$pages_dir/"

echo "Synced build to $pages_dir"
