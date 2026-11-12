#!/usr/bin/env bash
# Verifies what would be published without publishing: build, lint the package exports, check types resolution,
# then `pnpm publish --dry-run` per package. Never publishes.
set -euo pipefail
rm -rf /tmp/kit-pack && mkdir -p /tmp/kit-pack
cd "$(dirname "$0")/.."
pnpm run build
for dir in packages/*/; do
  name=$(node -p "require('./${dir}package.json').name")
  echo "=== ${name} ==="
  (cd "$dir" && pnpm exec publint --strict)
  # styles.css is a plain CSS asset (no types), so it is excluded from attw; node10 resolution is ignored by the node16 profile
  (cd "$dir" && pnpm pack --pack-destination /tmp >/dev/null && pnpm exec attw --pack . --profile node16 --exclude-entrypoints styles.css)
  if [ "$name" = "@kit/ui" ]; then # the migration docs promise this file exists in the published package
    (cd "$dir" && pnpm pack --pack-destination /tmp/kit-pack >/dev/null && tar tzf /tmp/kit-pack/kit-ui-*.tgz | grep -q "package/codemods/button-loading-to-busy.cjs") || { echo "codemod missing from tarball"; exit 1; }
  fi
  (cd "$dir" && pnpm publish --dry-run --no-git-checks --access public)
done
echo "dry run complete: nothing was published"
