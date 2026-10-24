# Security Architecture, Threat Modeling & Tenant Isolation

> **Authority**: NIST SP 800-207 (Zero Trust Architecture) & OWASP ASVS v4.0.3  
> **Applicable Domains**: Security Architecture, Threat Modeling, Identity, Tenant Isolation  
> **Status**: Verified Production Specification  

---

## 1. STRIDE Threat Modeling Framework

Evaluate every data flow and component boundary against the 6 threat categories:

| Threat | Security Property Violated | Definition | Architectural Mitigation |
|:---|:---|:---|:---|
| **Spoofing** | Authentication | Impersonating another user, service, or device | Strong authentication (mTLS, OIDC, WebAuthn, FIDO2) |
| **Tampering** | Integrity | Unauthorized modification of data in transit or rest | HMAC signatures, TLS 1.3, DB checksums, append-only logs |
| **Repudiation** | Non-Repudiation | Denying an action took place without audit proof | Write-ahead audit trails, immutable logging (WORM storage) |
| **Information Disclosure** | Confidentiality | Exposing sensitive data to unauthorized parties | Envelope encryption, column-level masking, strict RBAC/ABAC |
| **Denial of Service** | Availability | Exhausting resources to prevent legitimate access | Rate limiting, admission control, load shedding, CDN WAF |
| **Elevation of Privilege** | Authorization | Gaining capabilities beyond assigned privileges | Least privilege, ABAC, cryptographic capability tokens |

---

## 2. Zero-Trust Architecture (NIST SP 800-207)

**Prime Rule**: *Never trust, always verify.* Network locality (being inside the internal VPC) does NOT grant trust.

```
[Untrusted Client] ──HTTPS/TLS1.3──> [API Gateway / Policy Enforcement Point]
                                                    │
                      ┌─────────────────────────────┴─────────────────────────────┐
                      ▼ mTLS (SPIFFE/SPIRE)                                       ▼ mTLS
             [Order Service] ──mTLS/Zero-Trust──> [Payment Service] ──mTLS──> [Auth Vault]
```

### Core Tenets:
1. **Explicit Identity for Workloads**: All service-to-service communication requires mutual TLS (mTLS) with short-lived X.509 certificates (e.g. issued via SPIRE or HashiCorp Vault).
2. **Dynamic Context-Aware Authorization**: Validate authorization on every individual RPC call based on caller identity, tenant context, and resource ownership.
3. **Micro-Segmentation**: Strict firewall / security group policies allowing only explicit ingress ports per service.

---

## 3. Multi-Tenant Isolation Strategies

| Isolation Model | Architecture | Isolation Guarantee | Cost / Resource Efficiency | Operational Complexity |
|:---|:---|:---|:---|:---|
| **Silo (Separate DB)** | Dedicated database instance per tenant | Extreme: Physical data separation; zero noisy-neighbor | Poor: Over-provisioned resources; costly for thousands of tenants | High: Migrations must run $N$ times |
| **Bridge (Separate Schema)** | Single DB cluster; dedicated schema per tenant | Strong: Schema-level ACLs | Moderate: Connection pooling overhead per schema | Moderate: Cross-tenant migrations |
| **Pool (Shared DB & Schema)** | Single tables; filtered by `tenant_id` | Logical only: Risk of catastrophic data leak on missing `WHERE` clause | Optimal: Maximum resource utilization | Low infrastructure, high code discipline |

### Hardening the Pool Model with PostgreSQL Row-Level Security (RLS)
Eliminate human error by enforcing isolation directly in the database engine:

```sql
-- Step 1: Enable RLS on multi-tenant table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 2: Define tenant context policy
CREATE POLICY tenant_isolation_policy ON documents
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Step 3: Application connection sets session variable on checkout from pool
SET LOCAL app.current_tenant_id = '018d45e2-7634-789a-bcde-123456789abc';
SELECT * FROM documents; -- Database engine guarantees ONLY this tenant's rows are returned
```

---

## 4. Cryptographic Key Management & Envelope Encryption

Never encrypt data directly with a single Master Key (KMS):
1. **Data Encryption Key (DEK)**: Application generates an ephemeral symmetric key (AES-256-GCM) locally.
2. **Local Encryption**: Application encrypts payload with DEK.
3. **KMS Wrapping**: KMS encrypts the DEK using a Master Key (Key Encryption Key - KEK).
4. **Storage**: The encrypted payload is stored alongside the *encrypted DEK*. The plaintext DEK is immediately wiped from memory.
