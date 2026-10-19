# Neural courses in AI PATH

The former single `ml` program was split at the user's request into eight selectable courses. The other fourteen programs and all existing IDs/numbers remain. `?program=ml` now opens **Нейросети: первая модель**; seven additions use numbers 16–22. The catalogue therefore contains 22 programs.

## Homepage discovery

The main catalogue initially displays all eight neural/data courses in learning order, without search, category selection or expansion. The other fourteen programs remain available through categories and the show-more action. This is one catalogue, not a second set of duplicated course cards. Track numbers and deep links stay stable.

The hero and mobile header lead directly to the catalogue. Two keyboard-operable starter actions open the Python or first-model plan. Course cards show a short deliverable, requirements, duration and one plan action; the full scope stays in the plan and static guide. The hero course action clears an earlier catalogue filter/search so it always returns to the advertised courses.

The interaction reference is [SamCart Pages](https://www.samcart.com/ai/pages): explicit offer, outcome-led copy and a direct next action on the same page. AI PATH retains its existing mentor-contact journey; no SamCart payment integration, sales claims, artificial discounts or enrollment metrics are introduced.

## Source coverage

Notebook inventory: `safal207/students` at `d848e04c8f8d6e3e8e42ce15fbd98c00612e0e17` (66 `.ipynb` files). Only public source links and metadata are indexed; notebook contents, datasets and saved outputs are not copied or executed by the school.

| Course ID | Scope | Notebook count |
| --- | --- | ---: |
| `ml-python` | Python, OOP, Linux/Colab, import/export, NumPy, matrices, Pandas, Matplotlib, Seaborn, parsing; story/server exercises as supplementary practice | 21 |
| `ml` | Controlled NumPy MLP starter + Classification | 4 |
| `ml-data` | ML table analysis and probability/statistics | 3 |
| `ml-vision` | CV (7), historical medical-image exercises (10), Terra AI (1) | 18 |
| `ml-text` | All NLP exercises | 10 |
| `ml-audio` | Both AudioNet exercises | 2 |
| `ml-series` | Stock (3) and Trafic (2) | 5 |
| `ml-tuning` | SeletNetAI (2) and Genetica (1) | 3 |
| **Total** | Every notebook has exactly one primary course | **66** |

All 24 links in the original main-page collection remain represented. The rest include preparation, time series and transfer-learning exercises previously reachable only through the external archive. The old Sonar notebook title in the 24-item collection is corrected: it classifies sensor data, not images.

## Maintenance

- `dist/ai-path/neural-courses-data.js` is the shared curriculum for the chooser and standalone course guide. It specifies prerequisites, scope, stages, first task and expected deliverable. Durations are proposed study plans, not guarantees to finish every archived exercise.
- `dist/ai-path/data/neural-notebooks.json` records source paths, primary course and archive/starter status.
- Run `npm run build:neural-courses` after editing either source. It generates the static guide and explanatory SVG covers. The guide's course descriptions, expandable material lists and links work without JavaScript.
- `npm run check` checks generated content, eight unique courses, 66 unique paths, original 24-link coverage and the single controlled starter designation.
- Browser acceptance checks the actual first-viewport CTA and default eight-course visibility before clicking filters, both hero starters, direct specialization selection, filter/search recovery, beginner recommendations, distinct plans, source coverage, state propagation, keyboard expansion, 320/390/1440px rendering and architecture deep links. The course guide is included in Lighthouse collection.

Historical notebooks are explicitly marked as requiring environment/data checks before use. Only `ML/reproducible_mlp_xor_numpy.ipynb` is described as the source repository's CI-executed starter. Historic accuracy labels are not independently verified. Medical-image examples are educational; financial time series do not provide trading advice.
