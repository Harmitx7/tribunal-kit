# Quantitative System Design & Back-of-the-Envelope Estimation

> **Authority**: Designing Data-Intensive Applications & SRE Capacity Planning  
> **Applicable Domains**: Capacity Planning, Workload Characterization, Quantitative Estimation  
> **Status**: Verified Production Specification  

---

## 1. Orders of Magnitude & Powers of Two

System sizing relies on standard computational constants:

| Power / Units | Exact Value | Standard Approximation | Common Application |
|:---|:---|:---|:---|
| $2^{10}$ | $1,024$ | $1\text{ Thousand } (1\text{ KB})$ | Typical request/response payload |
| $2^{20}$ | $1,048,576$ | $1\text{ Million } (1\text{ MB})$ | Compressed photo / 10s audio |
| $2^{30}$ | $1,073,741,824$ | $1\text{ Billion } (1\text{ GB})$ | In-memory cache shard / DB buffer |
| $2^{40}$ | $1,099,511,627,776$ | $1\text{ Trillion } (1\text{ TB})$ | Modest database disk volume |
| $2^{50}$ | $1,125,899,906,842,624$ | $1\text{ Quadrillion } (1\text{ PB})$ | Multi-tenant video/analytics store |

### Time & Traffic Multipliers
- $1\text{ Day} = 24 \times 3,600 = 86,400\text{ seconds} \approx 10^5\text{ seconds}$ (handy estimation constant)
- $1\text{ Million requests / day} \approx \frac{10^6}{86,400} \approx 11.6\text{ RPS (Average)}$
- **Peak Multiplier Rule**: Peak traffic is typically $2\times$ to $5\times$ average traffic (use $3\times$ as default benchmark).

---

## 2. Core Estimation Formulas

### A. Throughput (Requests Per Second)
$$\text{Average RPS} = \frac{\text{Daily Active Users (DAU)} \times \text{Avg Actions / User / Day}}{86,400}$$
$$\text{Peak RPS} = \text{Average RPS} \times \text{Peak Factor (2.0 - 5.0)}$$

### B. Storage Capacity & Growth
$$\text{Daily Raw Storage} = \text{Daily Writes} \times \text{Avg Payload Size}$$
$$\text{Total Storage (with overhead)} = \text{Daily Raw Storage} \times \text{Days} \times \text{Replication Factor (typically 3)} \times \text{Index/Metadata Overhead (1.3)}$$

### C. Network Bandwidth
$$\text{Ingress Bandwidth (Gbps)} = \frac{\text{Write RPS} \times \text{Avg Write Payload (bytes)} \times 8}{10^9}$$
$$\text{Egress Bandwidth (Gbps)} = \frac{\text{Read RPS} \times \text{Avg Read Payload (bytes)} \times 8}{10^9}$$

### D. Cache Sizing (The 80/20 Pareto Rule)
- $80\%$ of requests target $20\%$ of daily data.
$$\text{Required Cache RAM} = \text{Daily Read Data Volume} \times 0.20 \times \text{Safety Buffer (1.25)}$$

### E. Concurrency & Concurrency Bounds (Little's Law)
$$L = \lambda \times W$$
- $L$ = Average number of concurrent requests in the system.
- $\lambda$ = Arrival rate (Throughput in RPS).
- $W$ = Average response time (Latency in seconds).
- *Example*: System handling $10,000\text{ RPS}$ with average latency of $50\text{ ms } (0.05\text{ s})$ requires $10,000 \times 0.05 = 500\text{ concurrent threads / connections}$.

---

## 3. Typical Latency Numbers (Every Architect Must Know)

| Operation | Latency (Approximate) | Scale Factor Comparison |
|:---|:---|:---|
| L1 cache reference | $0.5\text{ ns}$ | $1\text{ heart beat}$ |
| Branch mispredict | $5\text{ ns}$ | $10\text{ heart beats}$ |
| L2 cache reference | $7\text{ ns}$ | $14\text{ heart beats}$ |
| Mutex lock/unlock | $25\text{ ns}$ | $50\text{ heart beats}$ |
| Main memory reference (RAM) | $100\text{ ns}$ | $200\text{ heart beats}$ |
| Compress 1KB with Snappy | $2,000\text{ ns } (2\text{ µs})$ | $4,000\text{ heart beats}$ |
| Send 2KB over 1 Gbps network | $20,000\text{ ns } (20\text{ µs})$ | $40,000\text{ heart beats}$ |
| Read 1MB sequentially from RAM | $250,000\text{ ns } (250\text{ µs})$ | $500,000\text{ heart beats}$ |
| Read 1MB sequentially from SSD | $1,000,000\text{ ns } (1\text{ ms})$ | $2,000,000\text{ heart beats}$ |
| Disk seek (HDD) | $10,000,000\text{ ns } (10\text{ ms})$ | $20,000,000\text{ heart beats}$ |
| Cross-datacenter round trip (US to EU) | $150,000,000\text{ ns } (150\text{ ms})$ | Months of heart beats |

---

## 4. Worked Calculation Example: URL Shortener

### 1. Inputs & Assumptions
- $100\text{ Million new URLs shortened per month}$.
- Read-to-Write Ratio = $100:1$ (Heavy read dominance).
- URL Record Size: Short Key ($7\text{ bytes}$) + Original URL ($500\text{ bytes}$) + CreatedAt ($8\text{ bytes}$) + UserID ($16\text{ bytes}$) $\approx 550\text{ bytes} \approx 600\text{ bytes}$ with DB overhead.
- Retention: 5 years.

### 2. Execution Calculations
- **Write Throughput**:
  $$\text{Write RPS} = \frac{10^8 \text{ URLs}}{30 \times 86,400\text{ s}} \approx 38.6\text{ writes/s} \approx 40\text{ RPS}$$
  $$\text{Peak Write RPS} = 40 \times 3 = 120\text{ RPS}$$
- **Read Throughput**:
  $$\text{Read RPS} = 40 \times 100 = 4,000\text{ RPS}$$
  $$\text{Peak Read RPS} = 4,000 \times 3 = 12,000\text{ RPS}$$
- **Storage Growth (5 Years)**:
  $$\text{New URLs (5 yrs)} = 100\text{M} \times 12 \times 5 = 6\text{ Billion records}$$
  $$\text{Total Storage} = 6 \times 10^9 \times 600\text{ bytes} = 3.6\text{ TB}$$
  $$\text{With 3x Replication + Indexes} = 3.6 \times 3 \times 1.25 = 13.5\text{ TB}$$
- **Cache Sizing (20% Daily Read Cache)**:
  $$\text{Daily Reads} = 4,000 \times 86,400 \approx 345.6\text{ Million reads/day}$$
  $$\text{Daily Unique Read Data} = 345.6\text{M} \times 600\text{ bytes} \approx 207.36\text{ GB}$$
  $$\text{Cache RAM (20%)} = 207.36 \times 0.20 \approx 41.5\text{ GB} \approx 48\text{ GB (allocating 2x 32GB Redis nodes)}$$
