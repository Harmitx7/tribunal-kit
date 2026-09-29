# Tier 3 Reviewer A/B/C Benchmark

## 1. Objective

Test whether the current seven-reviewer Tier 3 backend configuration can be replaced or reduced to a smaller reviewer instruction composition without materially reducing critical review coverage.

## 2. Experimental Setup

The experiment was run using the isolated `tk review` harness. This tool generates prompt instructions exactly as they are composed in the Tribunal-Kit agent execution environment. 15 total prompts were generated (3 configs × 5 fixtures). No production architecture paths were modified.

## 3. Configurations

- **Configuration A — Current Baseline**: Uses the exact current 7-reviewer composition used by `/tribunal-backend`.
- **Configuration B — Consolidated**: Uses only the `backend-security-architect` instruction set.
- **Configuration C — Hybrid**: Uses `backend-security-architect` and `dependency-reviewer`.

## 4. Fixtures

The following 5 standard fixtures were used:

- `mfa-implementation`
- `rbac-modification`
- `schema-migration`
- `authenticated-endpoint`
- `secret-rotation`

## 5. Controlled Variables

Across A, B, and C, the following were identical:

- Target task and diff
- Repository context
- Output format instruction
- Execution environment

_Variables that could not be tested:_ Model, temperature, and API constraints. Since Tribunal Kit has no native LLM client, model-specific conditions require manual external testing.

## 6. Execution Environment

Execution of the generated `.md` prompts is currently awaiting manual operator intervention. The prompts have been generated locally in `.tk-review-runs/`.

## 7. Token Measurements

- **Input Tokens:**
  - Config A instruction sum: 62,730 chars (~15,682 tokens) (MEASURED/ESTIMATE)
  - Config B instruction sum: 5,465 chars (~1,366 tokens) (MEASURED/ESTIMATE)
  - Config C instruction sum: 14,795 chars (~3,698 tokens) (MEASURED/ESTIMATE)
- **Output Tokens:** UNAVAILABLE (Pending live LLM execution)
- **Total Tokens:** UNAVAILABLE (Pending live LLM execution)

## 8. Latency Measurements

UNAVAILABLE (Pending live LLM execution).

## 9. Finding Results

UNAVAILABLE (Pending live LLM execution).

## 10. Critical Finding Recall

UNAVAILABLE (Pending live LLM execution).

## 11. Duplicate Analysis

UNAVAILABLE (Pending live LLM execution).

## 12. Failure Analysis

UNAVAILABLE (Pending live LLM execution).

## 13. Per-Fixture Results

- **MFA implementation**: UNAVAILABLE
- **RBAC modification**: UNAVAILABLE
- **Schema migration**: UNAVAILABLE
- **Authenticated endpoint**: UNAVAILABLE
- **Secret rotation**: UNAVAILABLE

## 14. Aggregate Results

| Metric                   |  A Baseline | B Consolidated |    C Hybrid |
| ------------------------ | ----------: | -------------: | ----------: |
| Runs                     |           5 |              5 |           5 |
| Input tokens             | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Output tokens            | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Total tokens             | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Avg latency              | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Total latency            | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Total findings           | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Unique findings          | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Duplicate rate           | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Overall reference recall | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Critical recall          | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |
| Parse failures           | UNAVAILABLE |    UNAVAILABLE | UNAVAILABLE |

## 15. A vs B

UNAVAILABLE (Pending live LLM execution).

## 16. A vs C

UNAVAILABLE (Pending live LLM execution).

## 17. Limitations

The primary limitation is the lack of a native LLM API integration within the local `tk review` harness. 15 runs require manual prompting, generation, and extraction.

## 18. Evidence Quality

The evidence state is currently **insufficient**. No model execution data exists, making it impossible to perform duplicate rate, parse failure, or finding recall analysis.

## 19. Production Recommendation

### Outcome 4 — Evidence insufficient

Because LLM execution data, finding analysis, and token metadata are unavailable, there is not enough reliable evidence to support a decision regarding consolidation. No production architecture should be changed.

## 20. Raw Run References

All 15 generated prompts reside locally in the `.tk-review-runs/` directory. Operators must populate the respective `*_response.md` and `*_meta.json` files to proceed.
