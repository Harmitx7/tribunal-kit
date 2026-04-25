---
name: platform-engineer
description: Platform Engineering and Internal Developer Portal (IDP) mastery. Golden Paths, self-service infrastructure, cognitive load reduction, GitOps synchronization (ArgoCD/Flux), Terraform/OpenTofu architecture, and standardized service scaffolding. Use when designing system-wide development workflows or standardizing infrastructure processes.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Building internal platforms without talking to developers -> ✅ Platform engineering exists to reduce developer cognitive load; ask them what hurts
- ❌ Creating golden paths that are mandatory -> ✅ Golden paths should be the easiest option, not the only option
- ❌ Over-automating before the process is understood -> ✅ Manual first, then script, then platform; premature automation bakes in bad processes

---


# Platform Engineering — Developer Experience Mastery

---

## 1. The "Golden Path" Architecture

A developer should not have to write a Dockerfile, configure a CI pipeline, request AWS permissions, or setup Prometheus dashboards to launch a new microservice.

The Platform Engineer establishes **Golden Paths**: pre-approved, automated templates that bundle security and infrastructure out-of-the-box.

**Example: Local Service Scaffolding (Backstage / Cookiecutter)**
Instead of cloning complex repos, the developer runs:
`platform create my-service --stack node-express --db postgres`

This command:
1. Generates the standard Node/Express repo.
2. Applies the unified corporate CI/CD GitHub Action.
3. Configures default Datadog/OpenTelemetry observability metrics.
4. Generates a Terraform blueprint to provision the RDS Postgres instance.

---

## 2. GitOps (Declarative State Synchronization)

Platform Engineers do not log into AWS consoles to click buttons. They do not run `kubectl apply` from their laptops.

They push code to Git. A continuous reconciliation loop (e.g., ArgoCD) syncs the live infrastructure to match the Git repository mathematically.

```yaml
# GitOps standard architecture (ArgoCD)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: auth-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/mycorp/infrastructure-ops'
    path: k8s/auth-service
    targetRevision: HEAD # Automatically deploys any merge to main
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: auth-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true # If manual changes occur on cluster, force-reverts back to Git state
```

---

## 3. Infrastructure as Code (IaC) Modules

Platform Engineers build reusable Terraform/Tofu modules, hiding extreme complexity from product developers.

```hcl
# The Platform Engineer writes the complex module (e.g., VPC, Subnets, IAM, KMS Encryptions)
# The Product Developer simply consumes the module cleanly:

module "product_database" {
  source  = "github.com/mycorp/tf-modules/secure-rds"
  version = "v1.2.0"

  app_name      = "checkout-service"
  capacity      = "medium"           # Abstracts complex instance sizing
  needs_replica = true               # Abstracts failover architecture
}
```

---

## 4. Reducing Cognitive Load

DevOps asked product developers to learn Kubernetes, Helm, Terraform, CI/CD, and AWS IAM. The load was too high.
Platform Engineering hides the Kubernetes complexity behind a portal (e.g., Backstage) or a declarative wrapper (e.g., Score).

Ensure your infrastructure proposals abstract away the YAML mechanics. Give the developer a simple SLA: *"Push to the `main` branch, and the platform guarantees deployment, logs, and metrics within 3 minutes."*

---


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
