# Cloud Infrastructure, Containers & Infrastructure-as-Code

> **Authority**: CNCF Cloud Native Definition & HashiCorp Terraform Architecture  
> **Applicable Domains**: Cloud Infrastructure, Containers, Kubernetes, IaC, Deployment  
> **Status**: Verified Production Specification  

---

## 1. Provider-Neutral Cloud Resource Mapping

| Architectural Tier | Provider-Neutral Concept | AWS Implementation | Google Cloud (GCP) | Microsoft Azure |
|:---|:---|:---|:---|:---|
| **Virtual Network** | Isolated software-defined network | VPC (Virtual Private Cloud) | VPC Network (Global) | VNet (Virtual Network) |
| **Compute (Containers)** | Managed Kubernetes / Container runtime | EKS / ECS Fargate | GKE / Cloud Run | AKS / Azure Container Apps |
| **Serverless Functions** | Event-driven ephemeral FaaS | AWS Lambda | Cloud Functions / Cloud Run | Azure Functions |
| **Object Storage** | Scalable blob storage | Amazon S3 | Google Cloud Storage (GCS) | Azure Blob Storage |
| **Managed Relational** | Automated HA PostgreSQL/MySQL | Amazon RDS / Aurora | Cloud SQL / AlloyDB | Azure Database for PostgreSQL |
| **Managed NoSQL** | Managed key-value / document | DynamoDB / DocumentDB | Cloud Bigtable / Firestore | Cosmos DB |
| **Ingress Routing** | Layer 7 Application Load Balancer | Application Load Balancer (ALB) | Cloud Load Balancing | Azure Application Gateway |

---

## 2. Infrastructure as Code (IaC) & Drift Management

### The 4 Immutability Invariants:
1. **Zero Manual Changes**: ClickOps in cloud consoles is strictly forbidden in production. Any manual change creates invisible configuration drift.
2. **State Locking**: Remote state backend (S3 + DynamoDB lock table or OpenTofu state backend) prevents concurrent execution race conditions.
3. **Module Encapsulation**: Expose clean variables (`vpc_cidr`, `instance_type`); hide provider internal plumbing.
4. **GitOps Single Source of Truth**: All infrastructure changes merge via pull requests; controllers (ArgoCD / Terraform Cloud) reconcile cluster state to Git HEAD continuously.

---

## 3. Production Deployment Strategies Comparison

```
1. Rolling Update:
   [v1] [v1] [v1] ──> [v2] [v1] [v1] ──> [v2] [v2] [v1] ──> [v2] [v2] [v2]
   • Pros: Zero downtime, zero extra infrastructure cost.
   • Cons: v1 and v2 coexist simultaneously; database schema must support BOTH versions concurrently.

2. Blue-Green Deployment:
   Active (Blue):  [v1] [v1] [v1] <── [Load Balancer]
   Staged (Green): [v2] [v2] [v2]
   • Switch router to Green instantly. Instant rollback by switching router back.
   • Cons: Doubles infrastructure compute cost during deployment window.

3. Canary Release:
   [Load Balancer] ─── 95% traffic ───> [v1 Baseline Cluster]
                   └───  5% traffic ───> [v2 Canary Cluster] (Monitored for errors/latency)
   • Pros: Blast radius of bad releases limited to 5% of users.
   • Cons: Complex routing, metric analysis automation required.
```

---

## 4. Multi-Account / Multi-Project Blast Radius Isolation

Never deploy Production and Development workloads inside the same cloud account or VPC:

```
[Master / Billing Account (AWS Organizations / GCP Org)]
  ├── [Identity & Security Account] ──> IAM IdP, Security Hub, Audit Logs, Vault
  ├── [Shared Services Account]     ──> Container Image Registry (ECR/Artifact Registry), CI/CD Runners
  ├── [Development Account]         ──> Developer sandbox, ephemeral branch test environments
  ├── [Staging Account]             ──> Production-mirror environment for integration tests
  └── [Production Account]          ──> Isolated live production workloads (Zero dev write access)
```
