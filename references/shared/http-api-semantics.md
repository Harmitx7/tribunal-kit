# RFC 9110 HTTP API Semantics & Status Reference

> **Authority**: Internet Engineering Task Force (IETF RFC 9110 / RFC 7231)  
> **Applicable Domains**: API Architecture, Backend Engineering, Microservices  
> **Status**: Verified RFC Standard  

---

## 1. Canonical Status Code Decision Matrix

| Status Code | Canonical Name | When to Use | Body Expected? |
|:---:|:---|:---|:---:|
| **200** | `OK` | Successful GET, PUT, or PATCH operation returning payload | Yes |
| **201** | `Created` | Successful POST creating a new resource (return `Location` header) | Yes |
| **204** | `No Content` | Successful DELETE or action with no response body | No (Strictly empty) |
| **400** | `Bad Request` | Malformed JSON syntax or missing mandatory top-level structure | Yes (Error details) |
| **401** | `Unauthorized` | Missing or invalid authentication credentials (`WWW-Authenticate`) | Yes |
| **403** | `Forbidden` | Authenticated, but user lacks permission to access target resource | Yes |
| **404** | `Not Found` | Resource ID does not exist or hidden for security | Yes |
| **409** | `Conflict` | State conflict (e.g. duplicate unique key, version mismatch) | Yes |
| **422** | `Unprocessable Entity` | Valid JSON syntax, but semantic validation failed (e.g. invalid email) | Yes (Field errors) |
| **429** | `Too Many Requests` | Rate limit exceeded (include `Retry-After` header) | Yes |
| **500** | `Internal Server Error`| Unhandled server crash (do NOT leak stack traces to client) | Yes (Generic message) |
| **503** | `Service Unavailable` | Maintenance mode, downstream database outage, or circuit open | Yes |

---

## 2. Idempotency Key Specification

For payment operations or non-idempotent state mutations (POST requests), clients should transmit an `Idempotency-Key` header with a unique UUID v7.

### Server Lifecycle:
1. Extract `Idempotency-Key` from request headers.
2. Check cache (Redis):
   - **Key exists with status `COMPLETE`**: Return cached HTTP status and response payload immediately.
   - **Key exists with status `PROCESSING`**: Return `409 Conflict` (Concurrent request in progress).
   - **Key does not exist**: Store key with status `PROCESSING` (TTL: 120s), execute business transaction, then update key with status `COMPLETE` and response body (TTL: 24h).

---

## 3. Safe Caching Headers

- **Dynamic Authenticated APIs**:
  ```http
  Cache-Control: no-store, no-cache, must-revalidate, private
  ```
- **Static Immutable Assets (Content-Hashed Bundles)**:
  ```http
  Cache-Control: public, max-age=31536000, immutable
  ```
