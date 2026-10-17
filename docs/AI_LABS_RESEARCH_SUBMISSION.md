# AI Lab Research Submission Playbook · 18 October 2026

**Purpose:** prepare an honest, reviewable open-source submission, application or research collaboration proposal. **Not** a directory of guaranteed contacts. A public GitHub repo, a fellowship application, an API-credit application and a security disclosure are different pathways.

## Evidence-first project shortlist

| Public project | Honest current claim | Potential research question | First deliverable |
| --- | --- | --- | --- |
| [Causal Memory Layer](https://github.com/safal207/Causal-Memory-Layer) | Open-source audit and evidence lineage for AI-agent decisions. Historical tests and CI are scoped to declared fixtures. | Can an independent reviewer distinguish authorization from verified outcome after an agent restart? | Minimal reproduction fixture + baseline comparison + test matrix |
| [LiminalOSAI](https://github.com/safal207/LiminalOSAI) | Experimental Python/C11 agent-control research and runtime reference. Not production-grade sandbox protection. | Under which process failure and restart conditions do STOP and permission boundaries remain effective? | One failing and one corrected reproduction; reproducible container/software boundary |
| [PythiaLabs](https://github.com/safal207/pythiaLabs) | Evidence-gate prototypes for allow/block/escalate decisions with traceable local demos. | Does a deterministic pre-action verifier detect false success or stale authorization that prompt-only review misses? | Public replayable fixture and evaluator protocol |
| [ContractGraph-QA](https://github.com/safal207/ContractGraph-QA) | Financial transition failure-path testing; synthetic and scoped evidence. | Can a verifier block duplicate payment retries when the first outcome is unknown? | Synthetic state machine + negative tests; no real-money claims |
| [students](https://github.com/safal207/students) | 65 historical educational notebooks plus one reproducible NumPy baseline. Not a peer-reviewed ML paper. | What reproducibility pitfalls and leakage risks appear across legacy notebooks? | Audit summary; one re-run experiment with pinned dependencies |

**Scope:** these are candidate research *questions*, not established new discoveries or independently confirmed gains.

## Official paths — verify terms and geography each time

| Organization | Actual pathway | What it is / is not |
| --- | --- | --- |
| **OpenAI** | [Researcher Access Program](https://openai.com/form/researcher-access-program/) and [FAQ](https://help.openai.com/en/articles/10139500-researcher-access-program-faq) | Opportunity to request subsidized **API credits** for qualifying research, not a general submission portal for any GitHub project. Current FAQ requires eligible research affiliation and an API-supported country. Do not assume eligibility based on a personal repo. |
| **Anthropic** | [AI Safety Fellows](https://alignment.anthropic.com/2025/anthropic-fellows-program-2026/) | Individual research fellowship with selective admission, focused on AI safety, control and evaluation. Current announcement describes rolling applications with cohort-specific cutoffs. A public memo is not an application. |
| **Anthropic** | [Economic Futures](https://www.anthropic.com/economic-futures/program) | Economics-focused research/policy track; an older awards page explicitly says it is **not currently accepting** applications. Confirm new calls before preparing a targeted empirical labor-market proposal. |
| **Google DeepMind** | [Student Researcher Program](https://deepmind.google/student-researcher-program/) | Paid research internships for those **already enrolled** in Bachelor's, Master's or PhD programs, with in-person work. Not an open mailbox for unsolicited product proposals. |
| **Hugging Face** | [Spaces](https://huggingface.co/docs/hub/en/spaces-overview) | Public (or restricted) open-source demonstration/discovery channel, not a grant or lab endorsement. Check the current plan limits, licensing and data policy. |

**Submission-time verification is mandatory:** as of October 2026, individual openings, dates, forms and country restrictions may change; current requirements should be checked again on the organization's own site. Never route a sensitive security report through a general public discussion or expose private test data.

## From repository to reviewer-ready packet

1. **One claim only.** Name a falsifiable hypothesis and the exact code revision/commit.
2. **Ground truth.** Separate observed actions, expected outcome, agent claims and independently verified state.
3. **Minimal reproduction.** A clean-room runner requiring no privileged access or unpublished secrets.
4. **Baselines.** At least a naive/previous-policy comparison, with the same test set and clear metrics.
5. **Honest negative cases.** One deliberately failing, one safely blocked and one expected-allowed fixture.
6. **Reviewer path.** Three commands maximum to reproduce the core result, expected outputs, SHA for artifacts, and known non-claims.
7. **Rights & licensing.** State reused upstream code, approved data sources, permissions and disclosure boundaries.
8. **Channel fit.** Follow the target's real eligibility, deadline, geography, language and application format.
9. **Human approval.** Send only after the author has reviewed the exact text, destination, disclosure and attachments.

### Draft English research memo: bounded AI-agent action verification

**Working title:** *Beyond successful API responses: verifying AI-agent authorization and observed outcomes.*

**Research question:** When an AI agent reports success after a tool call, can a small deterministic verification layer detect false success, stale authorization and duplicate side effects more reliably than a response-only baseline?

**Existing assets:** [PythiaLabs](https://github.com/safal207/pythiaLabs) and [Causal Memory Layer](https://github.com/safal207/Causal-Memory-Layer) contain public scoped prototypes and documentation. The exact benchmark to submit should be frozen at a specific Git commit; measured comparative results are **not claimed in this draft**.

**Proposed study:** Run a public, synthetic fixture suite covering authorization freshness, execution identity, observed state transition and retries. Compare a prompt-only/HTTP-status baseline with a deterministic verifier. Report true positives, false positives, false negatives, review burden and replay stability with clear confidence limitations.

**Limits:** Synthetic outcomes are not production evidence; this is not a claim of universal containment, AGI safety, cryptographic certification or a fully integrated production security service.

**Request:** Independent feedback on the evaluation methodology and, when a fitting official research call exists, consideration under that **specific** application route. The recipient is not assumed to offer sponsorship or review.

## Readiness checklist

- [ ] This is my own project or I can document contribution and licensed upstream work.
- [ ] I have frozen the exact commit, dependencies and demo environment.
- [ ] I can demonstrate a positive test and a negative test.
- [ ] Metrics and scope are reproduced by scripts rather than copied from filenames.
- [ ] README, English one-pager, diagrams and short screen recording agree.
- [ ] Any security finding uses a permitted disclosure path.
- [ ] Target is accepting this *type* of submission and my residency/affiliation is eligible.
- [ ] I have explicitly approved the final text and recipient before sending.

## Practical recommendation

Begin with **one small evaluation case** from PythiaLabs/CML and an open Hugging Face or GitHub demo so reviewers can verify it independently. Treat fellowship applications and funding requests as separate workstreams. Do not mass-mail the same generic proposal to several research laboratories.
