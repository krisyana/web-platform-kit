#!/usr/bin/env bash
# Verifies what would be published without publishing: build, lint the package exports, check types resolution,
# then `pnpm publish --dry-run` per package. Never publishes.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm run build
for dir in packages/*/; do
  name=$(node -p "require('./${dir}package.json').name")
  echo "=== ${name} ==="
  (cd "$dir" && pnpm exec publint --strict)
  # attw: ignore-rules for known, documented false positives can be added here
  (cd "$dir" && pnpm pack --pack-destination /tmp >/dev/null && pnpm exec attw --pack . --profile node16)
  (cd "$dir" && pnpm publish --dry-run --no-git-checks --access public)
done
echo "dry run complete: nothing was published"
