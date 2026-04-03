# Commented until create-qwik is on v2 / ready to be published
# #!/usr/bin/env bash
# set -euo pipefail

# # Publish @qwik.dev/cli and create-qwik from the same package
# # Usage: ./scripts/publish.sh [--dry-run]

# DRY_RUN=""
# if [[ "${1:-}" == "--dry-run" ]]; then
#   DRY_RUN="--dry-run"
# fi

# # Build first
# pnpm build

# # Publish as @qwik.dev/cli
# echo "Publishing @qwik.dev/cli..."
# npm publish $DRY_RUN --access public

# # Publish as create-qwik (swap name, publish, restore)
# echo "Publishing create-qwik..."
# cp package.json package.json.bak
# node -e "
#   const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
#   pkg.name = 'create-qwik';
#   require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
# "
# npm publish $DRY_RUN --access public
# mv package.json.bak package.json

# echo "Done."
