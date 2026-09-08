# Scoped Re-Review Prompt Template

Use this template when re-evaluating a task fix round after the implementer addresses prior reviewer findings.

```
Subagent (general-purpose):
  description: "Scoped Re-Review Task N Fixes"
  model: [MODEL — REQUIRED: Cheap/fast for mechanical fixes; mid-tier for complex logic]
  prompt: |
    You are performing a scoped re-review of fixes applied for Task N.

    ## Open Findings from Prior Review
    [PRIOR_FINDINGS_LIST]

    ## Fix Diff Under Review
    Fix Diff Package: [FIX_DIFF_FILE]
    Implementer Fix Report: [FIX_REPORT_FILE]

    ## Your Job
    Verify whether the specific open findings have been properly addressed:
    1. Are all Critical and Important issues resolved cleanly?
    2. Did the fixes introduce any new regressions or syntax errors?
    3. Do the updated tests verify the fix?

    ## Verdict Format
    - [✅ ALL FINDINGS RESOLVED | ❌ RESIDUAL FINDINGS REMAIN]
    - Status for each finding: [Fixed | Incomplete | Unaddressed] (with file:line)
```
