# AI PATH: project and demo inventory

Inventory date: 2026-11-01. Sources: `dist/ai-path/index.html`, `studio.html`, linked local pages and their scripts at baseline main `930b412`. This records what the site links to and the implementation inspected locally. It is not a claim that external deployments were tested on this date. Later changes in this branch may extend the listed baseline behavior.

## Local projects and practice

All relative links below are under `dist/ai-path/`.

| Project / surface | File | Inspected baseline behavior / artifact |
| --- | --- | --- |
| FLORA | `examples/flora.html` | Palette and scale selection, visual brief; fictional botanical brand, AI illustration |
| Мори | `examples/mori.html` | Three story chapters and choices; fictional character, AI illustration |
| ДАЛЬ | `examples/dal.html` | Three fictional routes, stages and saved route card; AI illustration |
| Pocitel | `examples/pocitel.html`, `pocitel.js` | Four menu pairings, category filter, selection, total and savings. Teaching layout using supplied menu materials; no ordering service |
| AI Desk | `examples/ai-desk.html`, `ai-desk.js`, `ai-desk-scene.js` | Three.js scene, three desk materials, day/evening, camera and configuration URL; fallback if WebGL fails. Visual concept, not furniture engineering |
| От плана к пространству | `examples/plan-to-space.html`, `plan-to-space.js` | One procedural interior, five stages, scroll/slider/buttons. Teaching scene, not a construction plan |
| Мой Космос | `examples/my-cosmos.html` | Four illustrated planet cards and themes, source links to NASA; conditional CSS illustration, not NASA imagery |
| CRM Lite | `vibe-coding/crm-demo.html` | Fictional leads, stages, totals, deletion, sessionStorage and CSV export. No external API or real customer data |
| Мини-игра | `game-lab.html`, `game-lab.js` | 5×5 board, two avatars, two/three-star goal, obstacles, keyboard/buttons, victory and copyable action report |
| SVG transformation | `index.html#transformation-lab`, `design-lab.js` | Prepared five-layer artwork, separated layers, palette and foreground visibility, before/after comparison |
| Mentor bug/fix demonstration | `index.html#mentorExample`, `mentor-demo.js` | Intentional label-only bug, observed result, correction and repeated check. Prepared teaching example |
| Inline course 3D viewer | `index.html`, `program-3d.js` | Optional viewer associated with course cards, linked to full 3D projects; preview must not be described as a full project run |
| 3D Academy stand | `3d-academy.html`, `3d-academy.js` | Four simplified models: cell, physics, device and building; explosion slider and camera. Models have no scientific/engineering scale validation |
| 3D Academy practice | `3d-academy-practice.html`, `3d-academy-practice.js`, `3d-academy-curriculum.json` | Six course plans, 38 lessons/questions, local progress. Quiz answers do not certify external practical projects |
| Spring experiment | `physics-lab.html`, `physics-lab.js` | Mass/stiffness, Hooke-law calculation and chart, four guided steps, target-extension check; idealized model |
| Financial literacy | `finance.html`, `finance.js`, `finance-activities.js`, `finance-content.js` | Age-level lessons/checks, budget and savings exercises, local progress, downloadable plan. All amounts are fictional |
| Goals | `goals.html`, `life-skills.js`, `life-skills-content.js`, `life-skills-storage.js` | Age-level lessons, practice and checks; locally saved/downloadable personal plan |
| Time management | `time-management.html`, same life-skills modules | Age-level lessons, practice and checks; locally saved/downloadable flexible day plan |
| Course catalogs | `journeys.html`, `neural-courses.html`, `neural-networks.html`, `career-research.html`, `vibe-coding/index.html` | Navigation, program choice, plans and linked learning material. Catalog interactions are not execution of the linked ML or research projects |
| Offline courses | `physics-lab-offline.html`, `finance-offline.html`, `goals-offline.html`, `time-management-offline.html` | Generated offline counterparts; regenerate from the maintained sources when they change |
| Test it | `../index.html`, `../course.html`, `../labs.html` and associated scripts | Python training product outside AI PATH's directory, linked from its portfolio |

## External runnable-demo links

These are exact destinations in the local source. External behavior and availability require a live check.

| Project | Demo | Source | Nature stated by AI PATH |
| --- | --- | --- | --- |
| VESPER 01 | https://safal207.github.io/vesper-automotive-concept/ | https://github.com/safal207/vesper-automotive-concept | Fictional car and AI image; color grading, not physical lighting simulation |
| Quiet Hours | https://safal207.github.io/quiet-hours-sanctuary/ | https://github.com/safal207/quiet-hours-sanctuary | Optional Three.js scene and lightweight illustration; adapted ThreeUI Community scene, MIT |
| Layer Lab | https://safal207.github.io/layer-lab-explainer/ | https://github.com/safal207/layer-lab-explainer | Prepared authored SVG layers, palette and export; not automatic photo segmentation |
| Room Control | https://safal207.github.io/room-control-studio/ | https://github.com/safal207/room-control-studio | 2D/3D room settings, local state/JSON; no real device integration, calculated power |
| Virtual villa | https://safal207.github.io/Architectural-AI-Lab/ | https://github.com/safal207/Architectural-AI-Lab | Published architectural portfolio; gallery card uses an interface screenshot |
| Athenaion | https://safal207.github.io/Architectural-AI-Lab/athenaion/?lang=ru | https://github.com/Leonxlnx/athenaion | Gallery and optional 3D; world/render by Leon Lin, MIT, local gallery/control adaptation |
| Test it | https://safal207.github.io/test-it-python/ | https://github.com/safal207/test-it-python | Interactive Python/QA trainer |

## Code prototypes and artifact examples

Do not label a repository or static screenshot as a running browser demo.

| Project / artifact | Exact linked destination | Nature in source |
| --- | --- | --- |
| Agent Arena | https://github.com/safal207/agent-arena | Local game with HTTP bot API; screenshot of built-in scripted bots, not external LLM evidence |
| Garder — The Last Garden | https://github.com/safal207/Garder-2d | Godot 4.2 game prototype; screenshot from a real runtime |
| Пробуждение | https://github.com/safal207/Awakening/tree/e7d816954daf4341710bfc554ca27d49a754a20b | Fixed alpha snapshot, C#/OpenGL; city screenshots, not proof of full story gameplay |
| RustClip Studio | https://github.com/safal207/rustclip-studio | Local video studio source; card contains a demo-video frame, not a studio UI screenshot |
| Живут в папках / Инь и Янка | https://yin-yanka-comics.safalex.chatgpt.site | Comic drafts; world/characters by Yura, AI-assisted continuation for author review |
| Book example | https://www.amazon.com/dp/B0HJ3XHBZ2 | Store listing, not a publishing simulator or evidence of sales |
| LUMA 01 | https://safal207.github.io/safonov-interior-portfolio/cases/luma-01.html | Views of one procedural furniture concept; not manufacturing/engineering validation |

## Research, notebook and submission examples

These links are case material, code or documents. They are not browser-executable demonstrations by virtue of being linked.

| Case | Exact linked destination |
| --- | --- |
| ML learning archive | https://github.com/safal207/students |
| Reproducible NumPy MLP | https://github.com/safal207/students/blob/main/ML/reproducible_mlp_xor_numpy.ipynb |
| NextRole hackathon | https://github.com/safal207/NextRole |
| Liminal Recall | https://github.com/safal207/Causal-Memory-Layer/tree/main/hackathons/liminal-recall |
| AgentProof | https://github.com/safal207/safal207-AgentProof-AI |
| PythiaLabs reviewer path | https://github.com/safal207/pythiaLabs/blob/main/docs/NGI_COMMONS_REVIEWER_PATH.md |
| LiminalDB application | https://github.com/safal207/LiminalDB/blob/main/docs/FEDIVERSITY_REVIEWER_PATH.md |
| LTP grant draft | https://github.com/safal207/L-THREAD-Liminal-Thread-Secure-Protocol-LTP-/blob/main/docs/GRANT_PROPOSAL_20K_50K.md |
| Causal Memory Layer | https://github.com/safal207/Causal-Memory-Layer |
| LiminalOSAI | https://github.com/safal207/LiminalOSAI |
| PythiaLabs | https://github.com/safal207/pythiaLabs |
| ContractGraph-QA | https://github.com/safal207/ContractGraph-QA |

## Presentation contract

For each entry, show: the visitor's concrete task, the available action, an observable result, and the artifact they can inspect or keep. Preserve provenance. Distinguish a running demo, a local prototype requiring setup, a course plan, and a static/reference artifact. Never imply outside adoption, customer use, an LLM run, funding, scientific validation or publication merely from a screenshot, successful HTTP request, repository link or local test.
