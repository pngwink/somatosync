# Scientific basis and product guardrails

This file documents why SomatoSync behaves the way it does. It is a student prototype, not a clinical guideline or medical device.

## Primary rubric sources

1. Amsterdam 2022 international consensus statement on concussion in sport  
   https://bjsm.bmj.com/content/57/11/695
2. Living Concussion Guidelines (Ontario)  
   https://concussionsontario.org/
3. Living Guideline for Pediatric Concussion Care  
   https://pedsconcussion.com/

Supplementary public-health and research sources include CDC HEADS UP, NIH FITBIR’s PCSS data structure, and peer-reviewed balance literature. Source links are exposed inside the Research Assistant and Recovery Guidance screens.

## Product decisions tied to evidence

### Multidomain tracking instead of one readiness score

Symptoms, cognition, balance, sleep, mood, vestibular/ocular function, and activity tolerance can change at different rates. SomatoSync therefore shows PCSS symptoms, reaction time, short-memory recall, camera-measured postural movement, and activity tolerance separately. It does not average them into a 0–100 clearance score.

### Relative rest followed by gradual activity

The app does not recommend prolonged strict rest. Its pathways begin with a brief relative-rest period and then gradually reintroduce safe cognitive and physical activity according to tolerance and reinjury risk.

### Mild brief symptoms are different from significant or prolonged worsening

The activity-response logger separates:

- no meaningful symptom increase;
- a mild, brief increase;
- a significant or prolonged increase.

The coach never advances a stage automatically. Significant or prolonged worsening produces a recommendation to reduce the load and seek appropriate clinical guidance.

### Return to learning, work/daily life, and sport are separate

Concussion is not limited to athletics. SomatoSync includes:

- Return to Learning;
- Return to Work / Daily Life;
- six-step Return to Sport.

Later sport stages that carry head-impact, collision, or fall risk require the user to confirm healthcare-professional authorization. Full return to learning should occur before unrestricted return to sport.

### Follow-up signals instead of an exact recovery prediction

The Recovery Outlook does not output a recovery date or probability. It transparently flags patterns that may justify closer follow-up, including:

- symptoms recorded beyond four weeks;
- limited improvement in repeated symptom totals;
- substantial sleep/fatigue symptoms;
- repeated unfavorable changes across more than one measured domain;
- optional contextual factors associated with recovery variability.

The percentage thresholds used for browser-task changes are explicitly labeled as prototype within-person rules, not validated clinical cutoffs.

### Symptom-specific support

The latest PCSS entry can trigger controlled, prewritten suggestions for visual load, cognitive load, fatigue, sleep, dizziness/balance, noise, mood, and headache. Every suggestion shows why it appeared and links to its evidence source. A generative model is not allowed to invent treatment recommendations.

### Pediatric and adult scope

The optional profile distinguishes child/teen and adult contexts. Pediatric source material is used for school, family, and youth activity guidance; Ontario guidance supports adult work, school, and community reintegration. The app does not assume the user is an athlete or owns a wearable.


## Prototype limitations

- The PCSS-format tracker is not the full SCAT6 or SCOAT6.
- The camera balance feature is not BESS, mBESS, VOMS, force-plate testing, or clinical posturography.
- Reaction and memory tasks are browser-based trend measures, not diagnostic neuropsychological tests.
- The activity pathways are an educational tracking interface, not a prescription or clearance document.
- Risk flags are not a validated prognostic model.
- Danger signs require urgent medical evaluation rather than app guidance.

## Bounded AI and machine-learning roles

SomatoSync separates machine perception, clinical logic, and language generation:

1. **MediaPipe Pose Landmarker** performs on-device ML inference on webcam frames and returns body landmarks. SomatoSync derives experimental within-person movement summaries from shoulder, hip, nose, and ear landmarks. The app does not claim that a consumer webcam reproduces force-plate, BESS/mBESS, or vestibular testing.
2. **Transparent recovery engines** calculate symptom, reaction-time, memory, balance, activity-tolerance, and follow-up patterns. These deterministic rules—not an LLM—control all medical-scope messages and guardrails.
3. **Free on-device language generation** first attempts Chrome's built-in Gemini Nano and then Transformers.js with FLAN-T5 Small. The model receives only controlled evidence summaries and may explain supplied facts, but it cannot diagnose, calculate readiness, grant clearance, invent treatment advice, or predict a personal recovery date.
4. **Deterministic fallback** preserves functionality when a local model cannot start. The UI labels whether wording came from Gemini Nano, Transformers.js, or the evidence-based fallback. No paid cloud endpoint or API key is required.
5. **Local unexpected-change detection** compares a newest result with the user's recent median only after enough comparable sessions exist. It uses robust statistics and conservative gates to prompt a recheck, not to define a medical abnormality or predict recovery.

This architecture uses AI where it adds accessibility and interpretability while keeping medical recommendations traceable to controlled logic and published guidance.

## Neuro-Adaptive Cognitive Pacing Mode

The feature is grounded in guidance supporting cognitive pacing, planned breaks, gradual return to learning/work/daily activity, and individualized accommodations for fatigue, reading difficulty, light sensitivity, and visually overwhelming environments. It does **not** claim that facial behavior is a validated concussion biomarker.

Product guardrails:

- The user's symptom report is the primary input; camera signals never override it.
- The comparison is against a short same-session reference, not a claimed healthy baseline.
- A prompt requires acceptable tracking quality, multiple independent signal families, persistence across several rolling windows, and a cooldown; one blink or look-away is insufficient.
- Signals such as blink timing, brow movement, gaze, and leaning are explicitly described as non-specific. Lighting, dry eyes, stress, glasses, posture, and task difficulty may affect them.
- The user can accept, reject, or undo adaptations and can continue rather than taking a forced break.
- Mild, brief symptom increases are not described as proof of harm or delayed recovery.
- No VOMS, ocular diagnosis, neurological fatigue diagnosis, or clinical clearance claim is made.
- Raw face data is discarded. Only aggregate local settings and session summaries can persist.

Relevant guidance:

- Amsterdam 2022 consensus: relative rather than strict rest, gradual cognitive activity, symptom-limited return to learning, and frequent rest breaks or limited screen time when needed.
- Living Concussion Guidelines: cognitive/physical pacing and planning, distributing activity and breaks, and identifying patterns that contribute to fatigue.
- Living Concussion Guidelines vision section: post-concussion visual symptoms may include photosensitivity, reading difficulty, headache, and fatigue, and require appropriate clinical evaluation when persistent.
- PedsConcussion school accommodations: short breaks, quieter spaces, reduced workload, extended time, and supportive technology such as audiobooks or text-to-speech may be appropriate.

## 2026 assessment audit update

The memory feature now uses three learning trials with one original 10-word list followed by delayed free recall after at least five minutes. This better reflects a learning-and-delayed-recall construct than the earlier one-shot memory game while remaining an original, non-diagnostic task rather than a reproduction of SCAT6 or SCOAT6.

The camera-balance feature remains an optional experimental within-person measure. It is not a substitute for BESS/mBESS, tandem gait, force-plate testing, or clinical examination. See `ASSESSMENT_EVIDENCE_AUDIT.md`.

The interface palette uses warm charcoal dark surfaces and muted rose accents to reduce glare and avoid bright cyan/white combinations. This is an accessibility design choice, not a medical treatment claim: evidence supports reducing brightness and individualized filtering/tints, but does not establish one universal screen color for concussion.
