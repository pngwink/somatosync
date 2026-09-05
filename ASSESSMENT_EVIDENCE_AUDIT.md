# SomatoSync Assessment Evidence Audit

This audit explains why each assessment remains in the prototype, what it can reasonably measure, and what claims the product must avoid.

## Overall design decision

SomatoSync uses a **multidomain trend model**, not a diagnostic composite or readiness percentage. Current concussion guidance supports combining symptom reporting, cognitive measures, balance/gait, neurological examination, vestibular/ocular function, and everyday activity tolerance. Computerized cognitive results should not be used alone for diagnosis or management.

Core sources:

- Amsterdam concussion consensus: https://bjsm.bmj.com/content/57/11/695
- Living Concussion Guidelines — cognition: https://concussionsontario.org/concussion/guideline-section/cognitive-difficulties
- Living Concussion Guidelines — vestibular/vision: https://concussionsontario.org/concussion/guideline-section/vestibular-balance-dizziness-vision-dysfunction
- PedsConcussion living guideline: https://pedsconcussion.com/

## 1. PCSS-format symptom tracking — keep as a core domain

**Why it stays:** Standardized symptom questionnaires are recommended for screening and longitudinal monitoring. Symptoms also provide the context needed to interpret every other task.

**Strength:** Low barrier, repeatable, and relevant to sport and non-sport concussion.

**Limit:** Self-report is non-specific. A high score does not diagnose concussion, and emergency warning signs must remain a separate safety flow.

## 2. Reaction time — keep as an optional cognitive trend

**Why it stays:** Processing speed and reaction time can contribute to a broader cognitive picture. The app uses two practice trials, ten scored trials, median response time, quality checks, and pre/post symptom context.

**Strength:** Simple and objective within the device/session.

**Limit:** Device latency, attention, sleep, caffeine, motor response, practice, and browser performance affect results. It is not a standalone clinical neurocognitive test.

## 3. Learning and delayed recall — upgraded, keep as one cognitive domain

**Previous weakness:** A single presentation followed by immediate and delayed recall was too game-like and did not capture learning across repeated exposure.

**Current structure:**

1. One original neutral 10-word list is presented.
2. Immediate free recall follows.
3. The same list is presented and recalled three times total.
4. Delayed free recall occurs after at least five minutes.
5. Rotating original word banks reduce direct list memorization.

This is closer to the general 10-word immediate-learning and delayed-recall paradigm referenced in modern concussion assessment. It deliberately does **not** copy protected SCAT6/SCOAT6 lists or claim to administer those tools.

**Limit:** Practice effects, list difficulty, age, language, attention, fatigue, sleep, and symptoms affect performance. Delayed recall should be interpreted alongside other domains and clinical evaluation.

## 4. Camera balance and head steadiness — keep as experimental

**Why it stays:** Balance and gait are recognized concussion-assessment domains, and on-device pose landmarks demonstrate accessible computer-vision ML.

**Strength:** Low-cost, local processing, recording-quality checks, and repeatable within-person summaries.

**Limit:** A consumer webcam cannot replace BESS/mBESS, tandem gait, force-plate testing, vestibular examination, or clinician observation. Camera angle, floor, footwear, lighting, and safety conditions affect results.

## 5. Focus Mode — accessibility support, not a concussion test

Focus Mode combines face-landmark changes, interaction behavior, same-session calibration, sustained multi-signal rules, and local user feedback. Its purpose is to offer pacing and lower-stimulation adaptations. Blink or facial behavior is non-specific and must never be presented as proof of neurological fatigue.

## Final product boundary

The strongest evidence comes from the **pattern across domains and real-world function**, not from any single browser task. SomatoSync should continue to:

- avoid diagnosis and medical clearance;
- avoid exact recovery predictions;
- avoid one overall readiness score;
- show recording quality and uncertainty;
- compare users primarily with their own prior sessions;
- keep experimental webcam measures optional;
- escalate persistent or functionally limiting problems to qualified care.
