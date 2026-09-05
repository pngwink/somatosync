# Responsible AI Retrieval, Verification, and Evaluation Pipeline

SomatoSync's Research Assistant now uses a multi-stage local pipeline rather than a single keyword lookup or cloud API call.

## State graph

1. **Input guard** — truncates input, removes common prompt-injection phrases, and identifies emergency, diagnosis, clearance, and exact-timeline requests.
2. **Intent router** — sends medical-boundary and urgent requests to deterministic evidence text. Only general research questions can reach generation.
3. **BM25 retriever** — scores lexical overlap with the curated evidence library.
4. **Dense retriever** — creates MiniLM sentence embeddings locally and compares them with cached document embeddings.
5. **Reciprocal-rank fusion** — combines lexical and semantic rankings without assuming their raw scores are calibrated alike.
6. **Cross-encoder reranker** — reranks the strongest query-passage pairs using a local MS MARCO MiniLM model.
7. **Local generator** — Gemini Nano or FLAN-T5 rewrites only the selected evidence.
8. **Claim and safety validator** — blocks diagnosis, clearance, exact recovery predictions, prompt leakage, unsupported numbers, and insufficiently grounded claims.
9. **Verified fallback** — replaces blocked or unavailable generation with controlled evidence text.

The UI exposes this trace under **Why this answer was shown**.

## Browser models

- `Xenova/all-MiniLM-L6-v2` for dense embeddings.
- `Xenova/ms-marco-MiniLM-L-6-v2` for query-passage reranking.
- Chrome Gemini Nano when already available, otherwise `Xenova/flan-t5-small` through Transformers.js for generation.

The Transformers.js pipelines request quantized browser models and attempt WebGPU before falling back to WASM. Evidence embeddings are cached locally by corpus version; questions and generated chat history are not persisted.

## Safety behavior

Generative AI is bypassed for:

- urgent danger-sign language;
- diagnosis requests;
- medical-clearance or readiness requests;
- exact personal recovery-date requests;
- unsupported or empty questions.

A generated answer is rejected when it:

- diagnoses a concussion;
- grants clearance;
- predicts an exact recovery time;
- treats prototype bands as clinical normal ranges;
- reveals prompt content;
- introduces numbers absent from the question or retrieved evidence;
- contains claims with insufficient overlap with the retrieved evidence.

## Evaluation lab

The Assistant page includes a local evaluation suite. It measures live results on the current device rather than displaying invented scores:

- Recall@3;
- Mean Reciprocal Rank;
- nDCG@3;
- safety-routing accuracy;
- p50 and p95 retrieval latency;
- failed test cases;
- whether each query used BM25, hybrid retrieval, or hybrid retrieval plus reranking.

The fixed benchmark covers ordinary research questions, non-sport recovery, danger signs, diagnosis requests, clearance requests, exact timeline requests, and prompt-injection attempts.

## Deliberate limitations

- The evidence library is curated and small; it is not a live search engine or complete medical corpus.
- The cross-encoder was trained for general passage ranking, not specifically for concussion medicine.
- The grounding validator uses conservative deterministic checks, not a clinically validated factuality model.
- The evaluation suite measures this prototype corpus and cannot establish clinical safety or effectiveness.
- SomatoSync does not claim multi-agent autonomy. It uses an explicit state graph with specialized deterministic and model-backed nodes.

## Voice safety boundary

Speech recognition is used as an accessible structured-input mechanism, not as a concussion diagnostic signal. The application does not classify slurred speech acoustically, diagnose mood, or infer brain injury from vocal biomarkers. Possible danger-sign language bypasses routine saving and displays urgent guidance. The final record is created only from user-confirmed PCSS ratings; raw audio and transcript text are discarded.
