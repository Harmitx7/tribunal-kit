$ErrorActionPreference = "Stop"

$skillsDir = "c:\Users\sunrise\Desktop\pfojects\cli project\tribunal-kit\.agent\skills"

$vbcBlock = @"

### `u{1F6D1} Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- `u{274C} **Forbidden:** Declaring a task complete because the output "looks correct."
- `u{2705} **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
"@

$preFlightBlock = @"

### `u{2705} Pre-Flight Self-Audit

``````
`u{2705} Did I rely ONLY on real, verified tools and methods?
`u{2705} Is this solution appropriately scoped to the user's constraints?
`u{2705} Did I handle potential failure modes and edge cases?
`u{2705} Have I avoided generic boilerplate that doesn't add value?
``````
"@

$failingSkills = @(
    "12-principles-of-animation",
    "60fps-animation",
    "accessible-animation",
    "adapt",
    "animation-on-scroll",
    "animation-systems",
    "antfu-conventions",
    "audit-and-fix",
    "bolder",
    "build-primitive",
    "clarify",
    "cobejs",
    "codebase-design",
    "colorize",
    "compact-landing",
    "company-logos",
    "critique",
    "delight",
    "design-lab",
    "diagnosing-bugs",
    "distill",
    "domain-modeling",
    "fixing-metadata",
    "gpt-taste",
    "harden",
    "impeccable",
    "improve-codebase-architecture",
    "landing-page",
    "local-first-architecture",
    "lottie-animation",
    "marquee-loop",
    "masked-reveal",
    "micro-interaction",
    "morphing-icons",
    "page-transition-animation",
    "polish",
    "pricing-page",
    "progressive-blur",
    "quieter",
    "react-doctor",
    "redesign-skill",
    "shape",
    "soft-skill",
    "sounds-on-the-web",
    "svg-animation",
    "swiss-design",
    "taste-skill",
    "tdd-workflow",
    "thermo-nuclear-code-quality-review",
    "to-spring-or-not-to-spring",
    "transitions-dev",
    "typeset",
    "web-quality-audit"
)

$fixedCount = 0
$errorCount = 0

foreach ($skill in $failingSkills) {
    $filePath = Join-Path $skillsDir "$skill\SKILL.md"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  SKIP: $skill/SKILL.md not found" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $filePath -Raw
    $appendText = ""
    
    $hasPreFlight = ($content -match "Pre-Flight Checklist") -or ($content -match "Pre-Flight")
    $hasVBC = ($content -match "VBC Protocol") -or ($content -match "VBC")
    
    if (-not $hasPreFlight) {
        $appendText += $preFlightBlock
        Write-Host "  FIX: $skill/SKILL.md - adding Pre-Flight" -ForegroundColor Cyan
    }
    
    if (-not $hasVBC) {
        $appendText += $vbcBlock
        Write-Host "  FIX: $skill/SKILL.md - adding VBC Protocol" -ForegroundColor Cyan
    }
    
    if ($appendText -ne "") {
        Add-Content -Path $filePath -Value $appendText -NoNewline
        $fixedCount++
        Write-Host "  DONE: $skill/SKILL.md" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Fixed: $fixedCount files" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor Red
