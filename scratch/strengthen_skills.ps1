$appendContent = @"

---

## 🚨 LLM Trap Table

|Pattern|What AI Does Wrong|What Is Actually Correct|
|:---|:---|:---|
|[domain-specific trap 1]|[hallucination]|[correct behavior]|
|[domain-specific trap 2]|[hallucination]|[correct behavior]|
|[domain-specific trap 3]|[hallucination]|[correct behavior]|

---

## ✅ Pre-Flight Self-Audit

Before producing any output, verify:
````
✅ Did I read the actual files before making claims about them?
✅ Did I verify all method names against official documentation?
✅ Did I add // VERIFY: on any uncertain API calls?
✅ Are all imports from packages that actually exist in package.json?
✅ Did I test my logic with edge cases (null, empty, 0, max)?
✅ Did I avoid generating code for more than one module at a time?
✅ Am I working from evidence, not assumption?
````

---

## 🔁 VBC Protocol (Verify → Build → Confirm)

````
VERIFY:  Read the actual codebase before writing anything
BUILD:   Generate the smallest meaningful unit of code
CONFIRM: Verify the output is correct before presenting
````
"@

$files = Get-ChildItem -Path .agent\skills -Recurse -Filter SKILL.md
$hardened = @()
$skipped = @()

foreach ($file in $files) {
    # Read raw to avoid messing up encoding or line endings
    $content = Get-Content $file.FullName -Raw
    if ($content -notmatch "🚨 LLM Trap Table") {
        Add-Content -Path $file.FullName -Value $appendContent -Encoding UTF8
        $hardened += $file.FullName
    } else {
        $skipped += $file.FullName
    }
}

Write-Host "━━━ Skill Strengthening Report ━━━━━━━━━━━━"
Write-Host "`nTotal skills found:     $($files.Count)"
Write-Host "Already have guardrails: $($skipped.Count) (skipped)"
Write-Host "Guardrails added:       $($hardened.Count)"
Write-Host "`n━━━ Strengthened Skills (First 10) ━━━━━━"
$hardened | select -First 10 | foreach { Write-Host "✅ $("$_".Replace((Get-Location).Path + "\.agent\skills\", ""))" }
