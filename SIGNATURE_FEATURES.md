# SomatoSync signature features

## 1. Adaptive Focus Mode

SomatoSync treats accessibility as an active recovery tool rather than a static settings screen. After explicit consent and a same-session reference, local face-landmark and interaction signals are combined with quality, persistence, signal-family, grace-period, and cooldown gates. The system can remain suggestion-only or apply a reversible lower-stimulation view when confidence is high. The user can undo every change, take a break, confirm that the intervention helped, or label it a false alarm.

Applied changes include larger text, wider spacing, less motion, softer contrast, lower information density, and optional audio-first presentation. The intervention banner states why it appeared. A small TensorFlow.js classifier personalizes signal weighting locally after enough mixed feedback; it contributes only part of the estimate and cannot independently trigger an intervention.

## 2. Conversational symptom check-in

The check-in uses local Whisper inference through Transformers.js instead of a cloud speech API. A user can describe symptoms and activity context naturally. SomatoSync extracts PCSS concepts, recognizes negation and activity context, proposes tentative 0–6 ratings from descriptive intensity and functional impact, explains every proposal, and requires a final review before storing anything.

The feature is designed as accessible structured input, not voice diagnosis. It does not classify slurred speech or infer concussion from vocal biomarkers. Possible emergency language routes to urgent guidance. Audio and transcript text are discarded; only confirmed symptom ratings and broad activity-context tags are retained locally.
