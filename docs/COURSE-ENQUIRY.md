# Course choice → plan → mentor enquiry

## Scope and reference

Quick design review of the public course enquiry journey on 19 October 2026, against `6f38ab44bf9f5180ef610b5205db9e999105d80a`. Before-state interactions and screenshots were captured at 1440×960 and 390×844. The revised journey is checked at 1440×960, 390×844 and 320×740.

The product goal is to let a prospective student choose one course, understand its result and conditions, then prepare an accurate request to the mentor. [SamCart](https://www.samcart.com/) is the reference for keeping offer details and the next action together. AI PATH uses a mentor enquiry because its full teaching price and schedule are agreed individually.

The school is authored directly in `dist/ai-path/`. `neural-courses-data.js` separately generates the static course guide and diagrams; its generator check remains required. Main application and plan-style asset revisions are updated together.

## Observed findings

| ID | Severity | Observed before-state | Task impact | Resolution |
| --- | --- | --- | --- | --- |
| ENQ-01 | Moderate | Fresh “Уже знаю Python” selected `ml` with `level=zero`; the request said “Мой уровень: с нуля”. The ML quiz hint explicitly assesses Python knowledge. | The request contradicted the visitor's explicit entry choice. | Starter buttons carry their stated preparation, and the request exposes the preparation control. |
| ENQ-02 | Moderate | The contact summary referred to schedule facts elsewhere; preparation and availability could only be revised through the separate recommender. Price conditions followed the email action. | Comparing the intended request with the plan required leaving the contact panel. | Schedule, requirements, editable parameters and pricing conditions are adjacent to the contact action. |
| ENQ-03 | Minor | Copying the request required first expanding the preview disclosure. | The alternate contact path needed an extra discovery action. | Copy is a visible button. Preview stays optional; clipboard failure opens and selects the real text. |

All observations have high confidence within the sampled journey. The source before-state is preserved in [app.js](https://github.com/safal207/test-it-python/blob/6f38ab44bf9f5180ef610b5205db9e999105d80a/dist/ai-path/app.js) and [index.html](https://github.com/safal207/test-it-python/blob/6f38ab44bf9f5180ef610b5205db9e999105d80a/dist/ai-path/index.html). Effects on enquiries or sales have not been measured.

## Interaction contract

- Choose a card or starter, inspect the result and syllabus, then open the enquiry panel.
- Starter preparation is explicit: Python preparation uses `zero`; knowing Python uses `basic` for the first-model course. Availability is retained.
- Request controls commit preparation and availability to the selected plan, URL, PDF data and contact draft. Editing these controls retains focus and the `#start` destination.
- Optional ideas remain isolated by course and are not persisted or transmitted by the site.
- Full cost, schedule, session duration, support and possible service charges are discussed before deciding to study. A prepared/copied request is not described as submitted, booked or paid.
- Email opens a draft for the visitor to review and send. Copy and Solvery remain available as alternative contact paths.

## Retest and limits

`courseEnquiry()` in `scripts/verify-ai-path.mjs` checks starter identity, adjacent course facts, pricing before the action, native-control changes, canonical-route/contact consistency, visible copy, clipboard-denial recovery, course-idea isolation and URL reload restoration. Existing tests retain questionnaire-draft isolation and all 22 programs, PDFs and 66 course materials.

CI must pass browser, Firefox/WebKit and Lighthouse checks on the PR revision; inspect the matching desktop/320/390 screenshots before merging. Live retest must use the published page. Tests do not send email, contact the mentor, reserve a meeting or take payment. The sample does not establish accessibility conformance, physical-device behavior or conversion improvement.
