# Reliability Engineering, SLOs & High-Performance Optimization

> **Authority**: Google Site Reliability Engineering (SRE) & Gil Tene (Coordinated Omission)  
> **Applicable Domains**: Reliability Engineering, Performance Optimization, SRE, SLOs  
> **Status**: Verified Production Specification  

---

## 1. Availability Mathematics & Composite Service Availability

### Availability & Allowed Downtime
$$\text{Availability } A = \frac{\text{Uptime}}{\text{Uptime} + \text{Downtime}}$$

| "Nines" | Availability % | Allowed Downtime / Day | Allowed Downtime / Month | Allowed Downtime / Year |
|:---|:---:|:---:|:---:|:---:|
| **Two Nines** | $99.0\%$ | $14.4\text{ minutes}$ | $7.2\text{ hours}$ | $3.65\text{ days}$ |
| **Three Nines** | $99.9\%$ | $1.44\text{ minutes}$ | $43.8\text{ minutes}$ | $8.76\text{ hours}$ |
| **Three Nines Five** | $99.95\%$ | $43.2\text{ seconds}$ | $21.9\text{ minutes}$ | $4.38\text{ hours}$ |
| **Four Nines** | $99.99\%$ | $8.64\text{ seconds}$ | $4.38\text{ minutes}$ | $52.6\text{ minutes}$ |
| **Five Nines** | $99.999\%$ | $0.86\text{ seconds}$ | $26.3\text{ seconds}$ | $5.26\text{ minutes}$ |

### Composite Availability Rules
1. **Serial Dependencies (All must succeed)**:
   $$A_{\text{total}} = A_1 \times A_2 \times A_3$$
   *Example*: Service ($99.9\%$) calling Database ($99.9\%$) and Auth ($99.9\%$) yields:
   $$0.999 \times 0.999 \times 0.999 = 99.7\% \text{ overall availability}$$
2. **Parallel Redundancy (Active/Active Failover)**:
   $$A_{\text{total}} = 1 - (1 - A_1) \times (1 - A_2)$$
   *Example*: Two $99.0\%$ redundant nodes yields:
   $$1 - (0.01 \times 0.01) = 99.99\% \text{ availability}$$

---

## 2. SLIs, SLOs & Error Budget Governance

- **Service Level Indicator (SLI)**: The quantifiable measurement:
  $$\text{SLI} = \frac{\text{Count of Successful Requests (HTTP status } < 500 \text{ and latency } \le 200\text{ms)}}{\text{Total Valid Requests}} \times 100\%$$
- **Service Level Objective (SLO)**: The target agreed with stakeholders (e.g., $99.95\%$ over rolling 30 days).
- **Service Level Agreement (SLA)**: Legal contract with financial penalties if breached (typically looser than SLO, e.g. $99.9\%$).
- **Error Budget**: The allowed unreliability:
  $$\text{Error Budget} = 100\% - \text{SLO} = 100\% - 99.95\% = 0.05\%$$
  - *Burn Rate Governance*: If $100\%$ of error budget burns in 1 hour (Burn Rate = 14.4x), page on-call immediately; freeze deployments if error budget is exhausted.

---

## 3. Latency Percentiles & Coordinated Omission

### Why Average Latency is Meaningless
In a system of $10,000\text{ requests}$, 9,990 requests return in $1\text{ ms}$, but 10 requests hang for $10\text{ seconds}$.
- $\text{Average Latency} = \frac{(9990 \times 1) + (10 \times 10000)}{10000} \approx 11\text{ ms}$ (Deceptively healthy).
- **$p99.9$ Latency** = **$10,000\text{ ms}$** (Catastrophic user experience).
- *Rule*: Track $p50, p90, p99$, and $p99.9$. High-fanout microservices amplify tail latency: if a page calls 100 microservices, each with $p99 = 1\%$, the probability of a user hitting a tail delay is $1 - (0.99)^{100} \approx 63.4\%$.

### Coordinated Omission (Gil Tene)
Benchmark tools that wait for a response before issuing the next request inadvertently pause during server stalls. They fail to record the thousands of requests that *would* have experienced extreme latency during the pause, drastically underreporting tail percentiles.
- *Remedy*: Use coordinated-omission-aware tools (wrk2, k6, HdrHistogram).

---

## 4. Disaster Recovery: RTO vs RPO

- **Recovery Point Objective (RPO)**: The maximum acceptable data loss measured in time (e.g. "RPO = 5 minutes of transaction data"). Dictates backup frequency and replication latency.
- **Recovery Time Objective (RTO)**: The maximum acceptable downtime before service is restored (e.g. "RTO = 30 minutes"). Dictates automation of failover and infrastructure reconstitution.
