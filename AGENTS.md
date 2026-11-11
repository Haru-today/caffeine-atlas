# Shared agent rules — Caffeine Atlas

This is the common project policy for Codex, Claude Code and Google Antigravity
CLI (Gemini). `CLAUDE.md` and `GEMINI.md` import this file; keep shared rules here.
Antigravity also reads `AGENTS.md` directly; retain `GEMINI.md` for compatibility.
For personal Google AI subscriptions, use `agy` with Google sign-in. Do not use
legacy `gemini` or API keys as a subscription fallback, enable paid overages,
or upgrade plans without explicit owner approval.

## Scope and existing behavior

- Implement the requested change with the smallest safe, maintainable patch.
  Inspect relevant files first; follow existing architecture and dependencies.
- This repository is `Haru-today/caffeine-atlas`. The static public app is in
  `caffeine-sensitivity-app/`; the root `index.html` redirects to it. Preserve
  public URLs, QR routing, source evidence and existing UI unless requested.
- The public demo has `RESEARCH_STORAGE_MODE = false` and an empty direct
  Google Sheets endpoint. Preserve the no-write public behavior, consent and
  privacy controls. Do not activate research storage to make a test pass.
- Protected research access, Google OAuth, administrator approval and
  Cloudflare Workers/D1 are managed in `Haru-today/haru-today.github.io`.
  Do not reset or recreate these connections. Google Apps Script source here
  is separate from the actually deployed Google service.
- Read `PUBLIC-DEMO-RELEASE.md` and `PRIVACY-OPERATIONS.md` when changing
  storage or public behavior. Historical setup examples are not evidence of
  current permissions or authorization to publish a direct Apps Script URL.

## GitHub and multiple agents/devices

- GitHub `origin` is the shared source of truth. `main` is the reviewed
  integration branch; active work is shared through its pushed task branch.
- Before editing, inspect `git status --short --branch` and `git log -1 --oneline`.
  Verify origin matches this repository without printing credential-bearing URLs,
  then `git fetch origin`. Check existing PRs/branches
  before starting duplicate work.
- Use one `<agent>/<task>` branch (`codex`, `claude` or `gemini`) and a separate Git worktree per concurrent
  task. Continue an existing task branch when appropriate. Agree on file
  ownership: only one agent writes a given file at a time. Hand off explicitly
  before another agent edits it; do not share one active working directory.
- Before switching Mac/Windows, review and commit intended files, push the
  task branch and record its commit SHA, tests and remaining work in the PR.
  On the other device, fetch and compare the branch/commit before editing.
  Use a clean worktree for that branch or fast-forward a clean matching branch
  with `git pull --ff-only`. Stop on divergence or uncommitted changes and
  reconcile them; never reset, force-push, clean, auto-stash or pull over work.
- Use PRs targeting `main`; do not push directly to `main`. Run focused checks
  and fix regressions. Obtain explicit owner approval before merging,
  deploying, changing Pages/production settings, changing OAuth/approval/D1
  permissions, publishing Apps Script versions or deleting research data.
- Do not introduce hooks, dependencies or global tool settings just to align
  agents. Do not commit local machine state, downloaded research data or test
  screenshots containing private data.

## Privacy and research integrity

- Never put credentials, tokens, cookies, `.env` contents, patient reports,
  participant-level genotypes or identifiable research data in prompts, logs,
  fixtures, commits or PRs. Use synthetic test data and report auth status only.
- Do not enable paid APIs, create billable resources or change subscriptions
  without explicit owner approval. Existing subscriptions do not imply API
  billing authorization. The user completes interactive account consent.
- Never fabricate experimental findings, sequences, genotypes or references.
  Check allele/strand orientation and calculation units against the relevant
  primary evidence before changing scientific logic. Do not equate a model
  score or demo output with a validated clinical diagnosis or wet-lab result.
- Preserve evidence provenance and distinguish recorded observation,
  source-supported interpretation and unresolved uncertainty. Use
  `확인 필요` / `추가 자료조사 필요` for unsupported scientific gaps.

## Relevant verification

Run commands from the repository root. CI uses Node 22. There is no root
`package.json`; the Node tests below do not need dependency installation.

- App syntax: `node --check caffeine-sensitivity-app/app.js`.
- Public/demo mode: `node --test tests/public-symposium-demo.test.cjs`.
- Routes/privacy: `node --test tests/portal-routing.test.cjs tests/privacy-notices.test.cjs`.
- Save receipts/alleles: `node --test tests/confirmed-save.test.cjs`.
- Apps Script behavior with synthetic Sheets: `node --test tests/google-apps-script-batch.test.cjs`.
- For broader impact, `node --test tests/*.test.cjs` runs the existing Node
  suite. It does not contact or validate the production Google Sheet.
- Browser coverage uses `tests/symposium-browser.cjs`. Follow
  `.github/workflows/public-demo.yml` for its pinned Playwright installation,
  local server and Chromium/WebKit setup; keep installation in a disposable
  test worktree. A local browser pass is not physical-device QA.

Report changed files/behavior, executed checks/results and unresolved issues.
Distinguish local tests, GitHub CI, public/protected served assets and
owner-completed Google login or backend verification. A pushed commit or
merged PR is not proof of deployment; never claim unexecuted checks passed.
