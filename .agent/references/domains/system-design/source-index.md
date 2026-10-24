# Authoritative Source Catalog & Verification Index

> **Authority**: System Design Engineering Literature, RFCs & Cloud Specifications  
> **Applicable Domains**: Source Index, Research Engine, Provenance & Verification  
> **Status**: Verified Production Specification  

---

## 1. Verified Primary Reference Catalog

Every technical claim in the System Design ecosystem derives from verified primary specifications and authoritative engineering publications:

| Reference Title | Canonical URL | Source Organization | Verification State | Consuming Skills |
|:---|:---|:---|:---:|:---|
| **AWS Well-Architected Framework** | `https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html` | Amazon Web Services | **VERIFIED** | `system-design-pro`, `cloud-architect` |
| **Google Cloud Architecture Framework** | `https://cloud.google.com/architecture/framework` | Google Cloud | **VERIFIED** | `system-design-pro`, `architecture` |
| **Microsoft Azure Well-Architected** | `https://learn.microsoft.com/en-us/azure/well-architected/` | Microsoft | **VERIFIED** | `system-design-pro`, `cloud-architect` |
| **The C4 Model for Visualizing Architecture** | `https://c4model.com/` | Simon Brown | **VERIFIED** | `system-design-pro`, `architecture` |
| **Martin Fowler Architecture Catalog** | `https://martinfowler.com/architecture/` | Martin Fowler / Thoughtworks | **VERIFIED** | `system-design-pro`, `architecture` |
| **Designing Data-Intensive Applications** | `https://dataintensive.net/` | Martin Kleppmann (O'Reilly) | **VERIFIED** | `system-design-pro`, `database-design` |
| **Apache Kafka Documentation** | `https://kafka.apache.org/documentation/` | Apache Software Foundation | **VERIFIED** | `system-design-pro`, `realtime-patterns` |
| **PostgreSQL 16/17 Core Documentation** | `https://www.postgresql.org/docs/` | PostgreSQL Global Dev Group | **VERIFIED** | `system-design-pro`, `database-design`, `sql-pro` |
| **Redis Core Architecture & Use Cases** | `https://redis.io/docs/latest/` | Redis Ltd. | **VERIFIED** | `system-design-pro`, `backend-redis` |
| **Kubernetes Architecture Documentation** | `https://kubernetes.io/docs/concepts/architecture/` | Cloud Native Computing Foundation (CNCF) | **VERIFIED** | `system-design-pro`, `containerization-pro` |
| **IETF RFC 9110 (HTTP Semantics)** | `https://www.rfc-editor.org/rfc/rfc9110.html` | IETF | **VERIFIED** | `system-design-pro`, `api-patterns` |
| **IETF RFC 9562 (UUID Version 7)** | `https://www.rfc-editor.org/rfc/rfc9562.html` | IETF | **VERIFIED** | `system-design-pro`, `database-design` |
| **OWASP Application Security Verification Standard** | `https://owasp.org/www-project-application-security-verification-standard/` | OWASP Foundation | **VERIFIED** | `system-design-pro`, `security-auditor` |
| **OWASP Cheat Sheet Series** | `https://cheatsheetseries.owasp.org/` | OWASP Foundation | **VERIFIED** | `system-design-pro`, `clean-code` |
| **NIST SP 800-207 (Zero Trust Architecture)** | `https://csrc.nist.gov/publications/detail/sp/800-207/final` | National Institute of Standards (NIST) | **VERIFIED** | `system-design-pro`, `security-auditor` |
| **Google Site Reliability Engineering (SRE) Books** | `https://sre.google/books/` | Google SRE Team | **VERIFIED** | `system-design-pro`, `error-resilience` |
| **OpenAPI Specification v3.1** | `https://spec.openapis.org/oas/latest.html` | OpenAPI Initiative | **VERIFIED** | `system-design-pro`, `api-patterns` |
| **GraphQL Specification** | `https://spec.graphql.org/` | GraphQL Foundation | **VERIFIED** | `system-design-pro`, `api-patterns` |
| **gRPC Documentation** | `https://grpc.io/docs/` | CNCF / Google | **VERIFIED** | `system-design-pro`, `api-patterns` |
| **OpenTelemetry Semantic Conventions** | `https://opentelemetry.io/docs/specs/semconv/` | Cloud Native Computing Foundation (CNCF) | **VERIFIED** | `system-design-pro`, `opentelemetry-observability` |
| **FinOps Foundation Framework** | `https://www.finops.org/framework/` | FinOps Foundation (Linux Foundation) | **VERIFIED** | `system-design-pro`, `cloud-architect` |

---

## 2. Verification State Definitions

- **`VERIFIED`**: Source was directly accessed, validated, and its technical recommendations verified against current industry practice.
- **`PARTIALLY_VERIFIED`**: Source was accessed, but certain vendor-specific pricing or version details remain subject to cloud provider fluctuation.
- **`UNVERIFIED`**: External document or citation has not been independently verified; treated as a hypothesis.
- **`UNAVAILABLE`**: Source was unreachable or network was offline during inspection; flagged for subsequent verification sweep.
