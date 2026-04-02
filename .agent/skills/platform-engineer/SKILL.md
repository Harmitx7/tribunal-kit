---
name: platform-engineer
description: Platform Engineering and Internal Developer Portal (IDP) mastery. Golden Paths, self-service infrastructure, cognitive load reduction, GitOps synchronization (ArgoCD/Flux), Terraform/OpenTofu architecture, and standardized service scaffolding. Use when designing system-wide development workflows or standardizing infrastructure processes.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Platform Engineering — Developer Experience Mastery

> DevOps is a culture. Platform Engineering is a product.
> The product's customer is the internal software engineer. The goal is removing friction and standardizing security.

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

## 🤖 LLM-Specific Traps (Platform Engineering)

1. **The Scripting Fallacy:** Handing product engineers a 4,000-line bash script to deploy their app instead of building a declarative CI/CD Golden Path framework.
2. **Console Operations:** Recommending manual AWS/GCP console click permutations to configure a database. The entire infrastructure structure must be defined via formal IaC representations (Terraform/Pulumi).
3. **Leaking Ops Complexity:** Generating a Helm Chart for an application developer that exposes 300 variables regarding node-affinity and tolerations. Hide ops mechanics; expose only application variables (CPU target, replica count).
4. **Push-Based CD Risks:** Generating CI pipelines that use `kubectl apply` directly from GitHub Actions (Push-based) rather than deploying a Pull-based GitOps operator like ArgoCD, exposing production cluster credentials to the CI runner.
5. **Non-Standardized Monitoring:** Failing to inject unified OpenTelemetry/Prometheus sidecars automatically into the standard deployment templates, forcing developers to reinvent telemetry for every microservice.
6. **TicketOps Generation:** Building architectures where a developer must open a Jira ticket for an infrastructure admin to manually provision an S3 bucket. Emphasize self-service terraform modules.
7. **Neglecting Ephemeral Environments:** Generating environments targeting *only* Staging and Production. Platform architecture must support spinning up isolated, ephemeral AWS/K8s environments instantly per-Pull-Request to isolate testing.
8. **Hardcoding IAM Roles:** AI writes IaC where resources are given generic `AdminAccess` rather than aggressively enforcing the Principle of Least Privilege via OIDC (OpenID Connect) trust policies.
9. **Missing the "Paved Road":** Ignoring the socio-technical aspect of the job. Forbidding developers from using experimental tech outright, instead of explaining the "Paved Road" (Supported) vs "Dirt Road" (You build it, you run it) philosophy.
10. **State File Chaos:** Failing to explicitly define S3/GCS backend locking architecture for Terraform state, opening the company up to catastrophic infrastructure corruption when two developers run `terraform apply` concurrently.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are infrastructural patterns provided as automated, self-service "Golden Path" templates?
✅ Has infrastructure been codified securely in declarative formats (Terraform, Tofu, Pulumi)?
✅ Is the CI/CD pipeline architected specifically around Pull-based GitOps (e.g., ArgoCD/Flux)?
✅ Were the complexities of Kubernetes/AWS deliberately abstracted away from the product developers?
✅ Does the architectural plan integrate telemetry (logs/metrics) seamlessly by default?
✅ Was the IaC environment actively secured by enforcing an S3/Remote backend state locking mechanism?
✅ Are IAM and trust boundaries scoped to absolute Least Privilege methodologies?
✅ Did I reject manual UI configuration (ClickOps) in favor of automated procedural representations?
✅ Is the pipeline resilient enough to generate ephemeral environments isolated to specific Pull Requests?
✅ Has the "Platform as a Product" mindset been established, prioritizing high developer UX?
```
