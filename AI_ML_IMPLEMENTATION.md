# SomatoSync AI and Machine-Learning Implementation

This document separates genuine AI/ML features from deterministic health-support logic. SomatoSync does not use a paid cloud AI API.

## 1. Advanced free on-device Research Assistant

**Locations:** `src/features/research/`, `src/features/ai/onDeviceTextGeneration.ts`, and `src/pages/ResearchAssistantPage.tsx`

1. An input guard removes common prompt-injection language and routes urgent, diagnostic, clearance, and exact-timeline requests to deterministic evidence.
2. BM25 lexical search and MiniLM dense embeddings retrieve candidate evidence locally.
3. Reciprocal-rank fusion combines lexical and semantic ranks.
4. A local MS MARCO MiniLM cross-encoder reranks the strongest passages.
5. Gemini Nano or Transformers.js with FLAN-T5 generates a short answer from only the selected evidence.
6. A deterministic validator blocks diagnosis, clearance, exact recovery predictions, prompt leakage, unsupported numbers, and insufficiently grounded claims.
7. Any blocked or unavailable generation is replaced with controlled evidence text.
8. The UI exposes the pipeline trace, retrieval mode, latency, evidence topics, and verification result.
9. A local evaluation lab calculates retrieval, safety-routing, and latency metrics from a fixed benchmark on the user's device.

No API key, account, server, or per-request payment is required. The embedding, reranking, and language models require a network connection for their first download and are then cached by the browser. See `RESPONSIBLE_AI_PIPELINE.md`.

## 2. Free on-device Recovery Explanation

**Locations:** `src/features/recovery/AiRecoveryExplanationPanel.tsx`, `src/features/recovery/aiRecoveryExplanation.ts`, and `src/features/ai/onDeviceTextGeneration.ts`

- Transparent code calculates symptom, reaction, memory, balance, visual, activity-tolerance, Focus Mode, follow-up, and unexpected-change facts first.
- Gemini Nano or Transformers.js converts only those precomputed facts into a short plain-language explanation.
- The model cannot calculate a readiness score, predict an exact recovery date, diagnose concussion, grant clearance, or invent treatment.
- If local generation is unavailable, SomatoSync uses the same facts to produce an evidence-based deterministic summary.

The language model receives no name, email, raw camera data, facial landmarks, typed memory words, or full symptom-response object.

## 3. MediaPipe Pose Machine Learning

**Locations:** `src/features/assessments/balance/poseLandmarker.ts` and `BalanceAssessmentPage.tsx`

- MediaPipe Pose Landmarker performs local webcam inference.
- SomatoSync derives shoulder/hip center movement and a head-steadiness proxy.
- Raw video and landmark streams are discarded; only summary values and recording quality are stored.
- This is an experimental within-person camera proxy, not BESS, mBESS, VOMS, a force-plate test, diagnosis, or clearance.

## 4. Site-wide Focus Mode

**Location:** `src/features/adaptive/`

- MediaPipe Face Landmarker extracts transient blink, brow/squint, viewing-distance, head-position, and gaze-direction proxies.
- The first 12 seconds create a same-session reference.
- A transparent fusion engine combines face changes with rereading and inactivity signals.
- False-positive protection requires acceptable camera quality, multiple independent signal groups, persistence across windows, route-change grace periods, and an alert cooldown.
- The user can adapt the interface, take a break, continue, or mark an alert as a false alarm.
- After enough mixed yes/no feedback, TensorFlow.js trains a small local logistic classifier. Its output contributes only 25% of the score; rules continue to control safety gates.

This is experimental accessibility personalization, not a validated neurofatigue detector.

## 5. Local unexpected-change detection

**Location:** `src/features/recovery/changeDetection.ts`

- The newest result is compared with the user's recent median after at least five comparable sessions exist.
- A robust median-absolute-deviation calculation reduces sensitivity to one unusual prior value.
- Conservative absolute and relative-change gates are also required.
- Low-quality camera sessions are excluded.
- The system only flags an unexpected within-person change to recheck. It does not label the value medically abnormal, predict recovery, or diagnose deterioration.

## 6. Deterministic health-support logic

The following intentionally remain transparent rules rather than generative AI:

- PCSS scoring
- reaction-time and memory statistics
- balance summary calculations
- symptom-triggered accommodations
- Return-to-Learn, Work/Daily Life, and Sport pathways
- activity-response coaching
- emergency danger-sign guidance
- recovery-outlook follow-up signals
- result interpretation bands

This boundary keeps medical guidance explainable and prevents a language model from inventing thresholds or treatment decisions.

## Conversational symptom check-in

The check-in uses a Whisper Tiny English automatic-speech-recognition model through Transformers.js. The microphone recording is decoded and resampled to 16 kHz in the browser, then transcribed locally with WebGPU when available and a WASM fallback. A deterministic medical-language layer performs PCSS concept matching, simple negation handling, severity extraction, activity-context tagging, and danger-sign routing. Missing severities are collected conversationally, and the user must review and confirm all structured values before saving. Audio and transcript text are not retained.

## Adaptive Focus Mode intervention loop

Focus Mode now supports both suggestion-only and high-confidence auto-adaptation. A sustained multi-signal event can apply larger text, increased spacing, reduced motion, softened contrast, reduced secondary detail, and optional page text-to-speech. A persistent banner explains the trigger signals and offers Undo, break, and feedback controls. False-alarm feedback reverses an automatic adaptation and remains part of the local TensorFlow.js personalization dataset.
