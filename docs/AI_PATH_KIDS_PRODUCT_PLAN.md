# AI PATH Kids — product direction (proposal)

Date: 2026-11-24. Draft experiment. Existing published school, Test IT Python, Studio, other projects and learner storage are not replaced.

## Target and promise

Start with ages 7–12, then validate ages 13–16 separately. Parent or teacher distributes a link; child starts a short, useful learning mission without payment or signup. Russian and English from the first prototype; Turkish is a candidate after translation and educator review. No claim of validated demand or learning efficacy.

## Product boundaries

- Free forever is the proposed product policy for core lessons, explanations, retries, basic progress and access to the core learning path. No paywall on mistakes, no XP purchases, no advertising in child sessions.
- Five core paths: logic/maths, English, science, money literacy, and coding/AI literacy. Integrate goal-setting, time and healthy habits across paths. Teach online safety and AI limitations explicitly.
- Keep adult QA, professional marketing and career programs in Studio/legacy catalogue, not in the child's navigation. Archive rather than destroy existing resources or change stored progress without migration.
- Reuse existing game, physics, finance, age-aware journey and life-skills content after teacher review. No copied competitor characters, brand or copyrighted lesson content.
- Optional paid extensions offered to adults: game creation club, 3D creative projects, mentor feedback, expanded family reports, later school licensing. Prices and demand unvalidated; no payments or subscriptions in prototype.
- No child accounts, personal data collection, analytics, chat, public leaderboards, ads or external AI prompts in prototype. Before adding accounts/telemetry/payment, review applicable COPPA, GDPR child protections and local law, consent, retention, deletion, accessibility and safeguards. Parent area in this prototype is a label, not an authentication boundary.
- Reward mastery and effort; no streak punishment, no artificial scarcity, no variable loot rewards. Give feedback and unlimited retries. XP once per completed mission; reviewing never loses progress.

## Prototype v0.1

New standalone route `dist/ai-path/kids/index.html`, not linked from public home. Three original missions (logic, English, algorithms), three questions each, RU/EN switching, accessible buttons/feedback, local progress, parent information and proposed extras. No external network dependencies. This is a small functional pilot, not a full school or a market launch.

## Roadmap

| Phase | Work | Acceptance |
|---|---|---|
| KIDS-01 | Functional learning loop and translation skeleton | 9 questions, language parity, retries, idempotent reward, restore/reset, 320/390/1440 layouts |
| KIDS-02 | Separate navigation and age pathways; original mascot and design | Child path has one clear primary CTA; no adult course clutter; keyboard and contrast QA |
| KIDS-03 | Reuse science/finance and curate free core curriculum | Educator-reviewed objectives and explanations, no factual/math errors, gradual difficulty |
| KIDS-04 | Mastery map, spaced review and progress | Evidence of learning rather than XP alone; no duplicate rewards or pressure |
| KIDS-05 | Parent experience and international pilot | Consent and privacy review; free starter cohort, localization reviewed by native speakers |
| KIDS-06 | Optional paid extensions | Adult-only checkout, transparent terms and refunds, no child upsell; validated demand and economics |

## Measurement (proposed, not collected in prototype)

Pilot: first-mission completion, second-mission completion, 7-day voluntary return, correct answers on a new problem after practice, parent-reported usefulness, support issues and adult opt-in interest. Collect only with privacy review and appropriate adult consent; prefer aggregate or local data. Never interpret XP as demonstrated mastery. No numeric performance, retention or revenue claims until measured.

## QA gate

Review exact diff and untouched main; run smoke, isolated browser tests at 320/390/1440, keyboard and screen-reader checks, correct/incorrect paths, repeated mission reward, reload/reset, language switching mid-lesson, storage unavailable, no network/write requests. Check that existing school's route and storage remain unchanged. Do not merge or publish until approved separately.

## Reference patterns (not copied content)

- Uchi.ru: https://uchi.ru/products — age-adapted interactive learning and optional paid courses.
- Duolingo: https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/ — short learning path and practice.
- Code.org: https://code.org/en-US/curriculum/elementary-school — free foundational computing curriculum.
