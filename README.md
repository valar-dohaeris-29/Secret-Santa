# Secret Santa

A Vue 3 Christmas reveal experience with a password-protected organizer portal. Organizers create draft lists, set directional exclusions, and finalize one immutable draw. Each participant receives a private random link. No assignments are returned by admin APIs, no old codes are accepted, and no messages are sent automatically.

## Deployment status

Live: https://www.santa.deuel.pro (admin: `/admin`). On 2026-11-09, all 26 isolated AWS resources were applied and the live HTTPS/redirect/API/DynamoDB/private-S3 smoke test passed. The temporary verification list was removed. Local validation passed seven backend tests, the mobile/keyboard browser flow, type checking, production build, and OpenTofu validation.

GitHub Pages retirement is incomplete: GitHub rejected deletion twice with HTTP 422, “Deactivating GitHub pages for this repository is not allowed,” despite admin permissions. Publishing was switched from legacy branch builds to workflow mode to stop branch-triggered rebuilds, but the existing legacy URL still serves its previous deployment. In [repository Pages settings](https://github.com/valar-dohaeris-29/Secret-Santa/settings/pages), select “Deploy from a branch,” then the **None** branch and Save, following [GitHub’s deletion instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/deleting-a-github-pages-site). If the UI also refuses, GitHub support must resolve the restriction.

## Development

Requires Node 22+, AWS credentials, and a DynamoDB table with string keys `pk` and `sk` (TTL attribute `expires`). The Node server and Lambda share `server/app.mjs` and the DynamoDB store. Development uses durable DynamoDB too; use a separate table when experimenting with real lists. The memory store is only for isolated automated tests.

```sh
npm ci
npm run dev
```

The ignored `.env` contains `ADMIN_PASSWORD_HASH`, `TABLE_NAME`, and `APP_ORIGIN=http://localhost:5173`. The supplied password was salted with scrypt; its plaintext is never stored in the app. The ignored `infra/secrets.auto.tfvars` contains the same server-side hash for deployment. There is no registration or password-reset flow. Keep these files and infrastructure state private. Sessions expire after eight hours, use HttpOnly/SameSite cookies, and use Secure cookies in production. Login attempts are limited durably to ten per source address per 15-minute window. Behind CloudFront, API Gateway source addresses may represent a shared edge, so this limit is deliberately conservative.

## Organizer workflow

Follow “secrecy” in the footer or open `/admin`. Create a list through title, optional message, required display-text budget, 2–100 names, and exclusions. Names can be pasted one per line. Self-draws are always excluded; additional exclusions are directional. Save a draft, then explicitly generate the draw. Impossible constraints leave the draft unchanged.

Finalization uses a conditional DynamoDB write against the draft version. Names, exclusions, tokens, and assignments are committed together; a concurrent repeat returns the existing finalized draw. Metadata remains editable. Duplication creates a fresh draft without tokens or assignments. Only drafts can be deleted. Stale edits are rejected.

Share each personal `/s/<token>` link only with its participant. Anyone possessing it can reveal that participant’s recipient. Refreshes and repeat reveals return the same assignment. Hiding the name or leaving the tab clears the visible reveal. Reduced-motion preferences disable confetti.

## Verification

```sh
npm run build
npm test
npm run build:api
npx playwright test
```

Browser tests use installed Chrome locally (Playwright Chromium in CI) and an isolated in-memory backend with a test-only password. They cover mobile layout, keyboard entry, the creation wizard, exclusions, copying links, direct URL refresh, repeat reveals, hide/focus, and reduced motion. Backend tests cover authentication, expiry, rate limits, validation, impossible draws, concurrency, locks, metadata edits, duplication, and JSON error responses. CI builds before testing because the Node static-serving test checks production output.

## AWS deployment

`infra/` is independent from the supplied `infra-for-crowd-album/` reference. Never run apply in the reference directory or reuse its state. Santa uses only `secret-santa-prod` resource names and a dedicated local state file. All application resources are in `af-south-1`; the CloudFront ACM certificate is in `us-east-1`. DNS uses the existing `deuel.pro` hosted zone.

```sh
npm run build:api
tofu -chdir=infra init
tofu -chdir=infra validate
tofu -chdir=infra plan -out=santa.tfplan
# Review that every change belongs to Santa before applying.
tofu -chdir=infra apply santa.tfplan
bash scripts/deploy-web.sh
```

The stack provisions private S3 with CloudFront origin access control, HTTPS and the canonical redirect from `santa.deuel.pro` to `www.santa.deuel.pro`, an HTTP API, Node 22 Lambda, on-demand DynamoDB with point-in-time recovery, restricted IAM, and 14-day Lambda logs. API requests bypass caching. SPA rewrites apply only to known frontend routes, so API errors remain JSON. Request bodies, participant URLs, and assignments are not logged. Provider locks are committed; state, plans, provider caches, secrets, private legacy data, and generated bundles are ignored.

The deployment script uploads the compiled frontend and invalidates CloudFront. Run API deployment again after server changes. Verify HTTPS, nested navigation, anonymous admin rejection, login, one complete test draw, repeat reveals, and private bucket denial before retiring GitHub Pages. The validation workflow never publishes Pages.

## Dependency audit

The production dependency audit reports zero vulnerabilities after compatible updates. Seven development-tooling findings remain in the existing Vite 5/type-checking dependency tree; resolving them requires separate major-version upgrades. These development servers are not deployed to AWS.

## Documentation checked

Context7 was not available in this implementation session. APIs were checked against official [Vue forms](https://vuejs.org/guide/essentials/forms.html), [Vue Router history](https://router.vuejs.org/guide/essentials/history-mode.html), [Vite server options](https://vite.dev/config/server-options.html), [AWS SDK v3 DynamoDB document client](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html), and [AWS provider CloudFront documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution). Provider configuration is also checked with OpenTofu validation.
