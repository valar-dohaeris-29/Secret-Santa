#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
bucket=$(tofu -chdir=infra output -raw bucket)
distribution=$(tofu -chdir=infra output -raw distribution)
[[ "$bucket" == secret-santa-prod-web-* ]] || { echo 'Unexpected deployment bucket'; exit 1; }
aws s3 sync dist/ "s3://$bucket/" --exclude index.html --cache-control 'public,max-age=31536000,immutable' --region af-south-1
aws s3 cp dist/index.html "s3://$bucket/index.html" --cache-control 'no-cache' --region af-south-1
aws cloudfront create-invalidation --distribution-id "$distribution" --paths '/*'
