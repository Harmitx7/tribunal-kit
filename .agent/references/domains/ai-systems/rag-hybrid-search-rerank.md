# Hybrid Search, Reciprocal Rank Fusion & Re-ranking in RAG

> **Authority**: Modern Information Retrieval Standards & Dense/Sparse Hybrid Retrieval Architectures  
> **Applicable Domains**: AI Systems, Vector Databases, Context Retrieval Pipelines  
> **Status**: Verified Production Specification  

---

## 1. Hybrid Search Architecture (Dense + Sparse)

Single-vector dense search fails on exact keyword matching, IDs, codes, and acronyms. Production RAG pipelines must merge **Dense Vector Search** (semantic context) and **Sparse BM25 Search** (exact term frequency):

```
User Query
    ├──> Dense Retriever (Embedding Model)  ──> Vector Distance Ranking (Top-K)  ──┐
    └──> Sparse Retriever (BM25 / Full-Text) ──> Lexical BM25 Ranking (Top-K)    ──┴──> RRF Combiner
                                                                                            │
                                                                                    Top-N Candidates
                                                                                            │
                                                                                   Cross-Encoder Reranker
                                                                                            │
                                                                                   Top-P Prompt Context
```

---

## 2. Reciprocal Rank Fusion (RRF) Implementation

RRF normalizes ranks from distinct retrieval systems without requiring raw score calibration:

$$RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

Where $k$ is a smoothing constant (standard: 60) and $r_m(d)$ is the 1-based rank of document $d$ in system $m$:

```python
from typing import Dict, List, Any

def reciprocal_rank_fusion(
    dense_results: List[Dict[str, Any]], 
    sparse_results: List[Dict[str, Any]], 
    k: int = 60
) -> List[Dict[str, Any]]:
    scores: Dict[str, float] = {}
    doc_lookup: Dict[str, Dict[str, Any]] = {}

    for rank, doc in enumerate(dense_results, start=1):
        doc_id = doc["id"]
        doc_lookup[doc_id] = doc
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))

    for rank, doc in enumerate(sparse_results, start=1):
        doc_id = doc["id"]
        doc_lookup[doc_id] = doc
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))

    sorted_docs = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [doc_lookup[doc_id] for doc_id, _ in sorted_docs]
```

---

## 3. Two-Stage Retrieval with Cross-Encoder Re-ranking

Bi-encoders generate embeddings independently for query and passage (fast, but loses fine-grained token-level cross-attention). A **Cross-Encoder** evaluates query and document pairs jointly to compute true relevance scores:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-large")

def rerank_passages(query: str, candidate_chunks: List[str], top_n: int = 5) -> List[str]:
    pairs = [[query, chunk] for chunk in candidate_chunks]
    scores = reranker.predict(pairs)
    ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    return [candidate_chunks[i] for i in ranked_indices[:top_n]]
```

---

## 4. Chunking Strategies & Context Packing

- **Chunk Size**: Target 300–500 tokens with 10–20% token overlap to preserve sentence boundaries.
- **Hierarchical/Parent-Child Chunking**: Retrieve granular small chunks for high search precision, but inject the parent section into LLM context.
- **Context Lost-in-the-Middle Mitigation**: Place the highest scoring re-ranked chunks at the very beginning and very end of the prompt context, placing lower-priority context in the center.

---

## 5. Production RAG Architecture Checklist

- [ ] Hybrid search active (both vector similarity and BM25 full-text indexing enabled).
- [ ] Reciprocal Rank Fusion applied with $k=60$.
- [ ] Cross-encoder re-ranking stage limits context passed to LLM to top 3–5 items.
- [ ] Document metadata filtered *before* vector distance calculation (pre-filtering via SQL/HNSW index).
- [ ] System handles empty retrieval gracefully with fallback responses without hallucinatory generation.
