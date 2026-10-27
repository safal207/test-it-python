# AI PATH automated acceptance

`Publish Test it` calls the browser and Lighthouse reusable workflows. Deploy
depends on both workflows: a failed functional, nonfunctional, theme, game,
journey, browser or Lighthouse job blocks publication. These checks run against
the checked-out revision, without sending enquiries or changing production data.

## Functional coverage

- `npm run test:functional`: all 23 journey links open the matching course,
  preserve level/pace, render the matching enquiry and return to the same journey.
  Also covers catalog search, plan parameter reload, invalid URL input and mobile
  menu Escape recovery. JSON results and a Playwright trace are archived.
- `npm run test:journeys`: 29 cards (23 school + 6 Academy), age hints without
  persistence, filters, keyboard controls, no-JavaScript fallback and route links.
- Existing smoke steps retain PDF, enquiry, notebook recovery, 3D Academy,
  game, AI Desk and Plan to Space checks. The separate Firefox/WebKit workflow
  retains its focused cross-browser coverage.

Route assertions wait for the expected rendered plan. Reading the initial HTML
heading immediately after a navigation can observe the AI Navigator placeholder
before app.js updates it; an incorrect final course still fails the assertion.

## Nonfunctional coverage

`npm run test:nonfunctional` checks ten school routes at 320, 390, 768 and 1440 CSS
pixels: document overflow against clientWidth, failed local resources, loaded
image decoding, console errors and uncaught exceptions. It reserves a classic
scrollbar gutter so the 320px test also catches body min-width overflow.

At 390 and 1440px, axe checks WCAG 2 A/AA and WCAG 2.1 AA rules on the visible DOM.
Violations fail acceptance. Incomplete checks are saved as `manualReview` in
results.json and require a human; automated accessibility is not full WCAG proof.
Existing theme acceptance also checks light/dark/Matrix, contrast, keyboard and
storage recovery. Screenshots and JSON reports are uploaded even after failures.

## Lighthouse

- Desktop: `npm run test:lighthouse`, 13 routes, two measurements per route.
- Mobile: `npm run test:lighthouse:mobile`, five key routes, two measurements,
  mobile emulation at 390 × 844 and Lighthouse's mobile throttling defaults.
- Required budgets for both profiles: performance >= 0.55, accessibility >= 0.95,
  CLS <= 0.1, console errors audit = 1 and label/content-name audit = 1.
- SEO >= 0.75 and best practices >= 0.75 remain advisory warnings.
- Each profile has a separate job and downloadable JSON/HTML artifacts. Raising
  budgets should follow a measured baseline, not be used to hide a failed audit.

## Local execution

Use Node 22 and the same pinned tools as CI:

```sh
npm install --no-save --no-package-lock playwright@1.55.0 axe-core@4.10.3 @lhci/cli@0.15.1
npx playwright install chromium
npm run check
npm run test:functional
npm run test:nonfunctional
npm run test:journeys
npm run test:lighthouse
npm run test:lighthouse:mobile
```

New regression runners and journey acceptance use an isolated Node preview on a
random local port. The other existing smoke runners require Python 3 as `python3`.
For local development only, `QA_BROWSER_CHANNEL=chrome` selects installed Chrome;
CI does not set it and uses the browser bundled with the pinned Playwright image.
Artifacts are ignored by Git. On Windows, generated-output verification requires
LF working files; regenerate the neural course and journey catalogs if a CRLF
checkout reports stale output, and verify there is no content diff.

## Release and manual boundaries

A green PR workflow validates the proposed revision; it does not mean merged or
deployed. After an approved merge, check the new Publish Test it run and the live
URL. Physical Android/iPhone testing is still needed for touch gestures, mobile
GPU performance, browser chrome/safe-area, virtual keyboard/toast, mail/PDF/share,
clipboard transfer and TalkBack/VoiceOver. Human review must verify scientific
content and actual learner projects. CI does not perform these external actions.
