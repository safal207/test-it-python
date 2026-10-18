# Repository guidance for coding agents and PR reviewers

This repo powers public AI PATH (Russian-language educational program chooser) and the Test it Python training site. Students may arrive from a phone, so preserve small-screen usability.

## Before coding or reviewing

1. Read the PR's stated objective and inspect the **current diff and head SHA**. Do not infer approval from old bot responses.
2. **Do not silently remove or rename existing programs** or rewrite learning outcomes into guaranteed income/offers/funding. Verify 15 programs and questionnaire/URL selection remain usable.
3. Edit the smallest relevant file. Avoid mass reformatting `dist/ai-path/index.html`, which is large and contains source provenance and accessible gallery markup.
4. Never commit private CRM/mentor student data, customer contacts, API keys, tokens, signed-in session material, or unapproved images. `vibe-coding/crm-demo.html` must use **fictional data only** with no external requests.
5. Keep `<button>` for actions, `<a>` for navigation; keyboard, labels, Escape/focus behavior and reduced motion must remain accessible.
6. Preserve the current visual gallery's real screenshot attribution. Do not replace runtime screenshots with AI renders or represent generated illustrations as actual project results.
7. The GitHub Pages deployment must be gated on passing **browser acceptance** and **Lighthouse**. CI failures are blockers, not an invitation to skip checks.
8. AI reviewers (Codex, CodeRabbit, Qodo) are advisory. Qodo was intentionally disabled due quota; do not silently reactivate apps, add credentials or enable automatic merge.
9. For any security-sensitive agent/financial/permission claim, describe what is **implemented**, **tested**, and **not proved**. An HTTP 200 is not external success.

## Required pre-merge verification

- `npm run check`
- `node --check scripts/verify-ai-path.mjs`
- Playwright GitHub Action `AI PATH interactive smoke` on the exact PR HEAD.
- LHCI `AI PATH Lighthouse and accessibility budgets` on the exact PR HEAD.
- Manually inspect desktop and 320/390px mobile screenshots from test artifacts for user-visible changes.
- Confirm project links, demo provenance and course scope. Run no external/customer actions from CI.
- Reconfirm review findings after any fix that changes the PR HEAD.

## Safety of merges/closures

Do not auto-merge, auto-close or delete other PRs. `scripts/audit-pr-backlog.mjs` is strictly read-only. Some Causal-Memory-Layer proposals explicitly contain private data and interpret closure as rejection. A green CI badge alone does not grant approval.

For a review, prioritize: false customer data handling, unsafe CSV content, incorrect program links/IDs, inconsistent course copy, accessibility regressions, GitHub Pages publication race, stale reviews, and missing branch protection.
