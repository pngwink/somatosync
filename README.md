# SomatoSync - Privacy-first concussion recovery that adapts the interface

SomatoSync is a concussion recovery platform that does more than record symptoms. It connects symptom check-ins, browser-based assessments, recovery planning, adaptive accessibility, on-device AI, and sharing tools in one place.

A major part of SomatoSync is the interface itself. Focus Mode can change how the app looks and behaves based on confirmed symptoms and, if the user chooses, sustained on-device interaction signals. It can reduce visual intensity and motion, enlarge and space reading text, simplify page structure, narrow the reading area, hide secondary information, shorten long body copy behind a **Show full text** control, offer **Plain Language** and **Read Aloud**, and provide a manual **Reading Spotlight**.

SomatoSync is not limited to athletes or students. Recovery paths support school, work, daily life, and sport. The goal is to help people keep using digital tools with temporary, reversible accommodations while tracking what they can tolerate and what seems to help.

## How SomatoSync works

1. **Check in** - Record symptoms through the 22-item PCSS-format tracker or the private Voice Check-In.
2. **Assess** - Track reaction time, learning and delayed recall, and optional camera-based postural movement as separate recovery signals.
3. **Adapt the interface** - Focus Mode starts from the user's confirmed symptom context and can apply temporary accessibility changes across the app.
4. **Learn what helps** - SomatoSync records which supports the user says were helpful and builds a Response Memory over time.
5. **Carry supports outside the app** - SomatoSync Shield can apply the current reading setup to external websites with site-specific consent.
6. **Share useful information** - Recovery Relay and Reports help users communicate selected supports and recovery patterns with other people involved in recovery.

SomatoSync keeps symptoms, cognition, balance, and real-world function separate instead of turning them into one readiness or recovery score.

## Focus Mode - Adaptive accessibility

Focus Mode is a site-wide cognitive and visual support layer.

It begins with confirmed symptoms such as light sensitivity, visual discomfort, headache, or mental fatigue. From that starting point, SomatoSync can adjust:

- reading text size and line spacing
- page luminance and saturation
- motion and moving media
- reading width and information density
- visual hierarchy and secondary content
- **Plain Language**
- **Read Aloud** through browser speech synthesis
- a manual **Reading Spotlight** for following text

In stronger Focus states, long ordinary paragraphs can become short previews with **Show full text / Show less** controls. Multi-column areas can become a single reading lane, and nonessential interface chrome can be reduced while navigation remains available. Safety messages, alerts, forms, dialogs, and protected clinical text are excluded from automatic collapsing.

### Optional on-device signals

Users can also enable MediaPipe Face Landmarker. SomatoSync creates a short same-session reference and looks for sustained changes across signals such as viewing distance, facial tension, blink pattern, head movement, gaze variation, rereading, and extended pauses.

These signals are deliberately treated as non-specific accessibility cues. A single signal does not trigger a medical conclusion. Focus uses tracking-quality checks, sustained windows, multiple signal families, grace periods, and cooldowns before offering stronger changes.

Camera frames and raw facial landmarks are not stored or uploaded.

Focus can also learn from user feedback. After enough confirmed examples, an optional local TensorFlow.js classifier can contribute to personalization. Every interface change remains reversible.

## SomatoSync Shield

SomatoSync Shield is a Chrome extension that carries the user's current display-support profile onto reading-heavy websites.

Depending on the selected profile, Shield can adjust text size, line spacing, article width, motion, media intensity, page chrome, and reading guidance. It does not run concussion detection on external websites and does not send webpage content back to SomatoSync.

Shield is consent-first. A page changes only when the user applies the setup, accepts a suggestion, or has explicitly enabled **Always use on this site** for that hostname. The page can be restored at any time.

## Recovery tracking and guidance

SomatoSync organizes recovery around real-world function instead of a single percentage.

The Recovery area includes:

- **Overview** - Current recovery pattern, what seems to help, recent events, and supporting evidence
- **Trends** - Symptoms plus separate reaction, memory, and experimental camera-movement trends
- **Plan** - Current supports and pathways for return to learning, daily life, and sport
- **Response Memory** - Tracks which accommodations appear helpful across sessions
- **Activity tolerance** - Records what the user attempted, symptom change, and how long it took to return toward baseline

For the first 24 to 48 hours after a recorded injury date, SomatoSync can show an Acute Mode focused on relative rest, light manageable activity, and clear safety guidance. Later stages support gradual return rather than prolonged complete rest.

Return-to-learning, daily-life, and sport pathways remain separate. SomatoSync never grants medical clearance.

## Multidomain assessments

SomatoSync includes several browser-based recovery measures:

- **PCSS-format symptom tracking** - 22 symptoms rated from 0 to 6 with physical, sleep, emotional, and cognitive groupings
- **Reaction time** - 2 practice trials and 10 scored trials with within-person history
- **Learning and delayed recall** - The same original 10-word list is presented and recalled across 3 learning trials, followed by delayed recall after at least 5 minutes in real-user mode
- **Experimental camera balance** - MediaPipe Pose Landmarker estimates postural movement and head steadiness from a short eyes-open recording

These measures are displayed separately and compared mainly with the user's own earlier sessions. The camera task is experimental and is not a replacement for clinical balance testing.

## Voice Check-In

Voice Check-In uses Whisper Tiny through Transformers.js to transcribe speech locally in the browser. SomatoSync then maps the transcript into possible PCSS symptoms and asks the user to review the suggested ratings before anything is saved.

Speech is used as an input method, not as a diagnostic signal. Raw audio and transcript text are discarded after the confirmed symptom record is created. Possible danger-sign language is routed to urgent guidance instead of being treated as a routine check-in.

## Research Assistant and on-device AI

The Research Assistant retrieves from a built-in concussion evidence library instead of searching the live web.

Its local pipeline combines:

- BM25 lexical retrieval
- MiniLM semantic embeddings
- reciprocal-rank fusion
- MiniLM cross-encoder reranking
- Gemini Nano when Chrome's built-in model is available
- FLAN-T5 Small through Transformers.js as the local fallback
- deterministic safety and grounding checks before an answer is shown

Requests for diagnosis, medical clearance, exact personal recovery dates, or urgent danger-sign guidance are routed away from generative AI.

The Recovery page uses the same local generation stack only to rewrite already-calculated recovery facts into plainer language.

## Sharing and reports

**Recovery Relay** lets a user choose specific accommodations and share them through a temporary QR or link with a teacher, parent, or coach. Feedback can be brought back into Response Memory so SomatoSync can learn whether the support seemed useful.

**Reports** create a one-page recovery handoff using selected assessment summaries, activity tolerance, pathway progress, accommodations, and limitations. Reports can be printed or saved as PDF and are meant to support conversations with professionals, not replace them.

## Privacy

SomatoSync is designed around local processing and user control.

- Account and assessment data are stored in account-scoped browser storage
- Camera audio is disabled during camera assessments
- Raw video, screenshots, face landmarks, pose streams, and typed memory-task words are not saved
- Voice transcription runs locally after the model is loaded
- Research questions and generated chat history are not persisted
- No paid AI endpoint, analytics SDK, advertising tracker, or cloud health-record database is included
- The Privacy and Data page can list, export, and delete locally stored information

The prototype does not include production authentication or clinical device integration.

## Research grounding and medical scope

SomatoSync draws from:

- Amsterdam 2022 international concussion consensus statement
- Living Concussion Guidelines
- Living Guideline for Pediatric Concussion Care
- CDC HEADS UP guidance

The project uses these sources to guide relative rest, gradual return to activity, temporary accommodations, multidomain tracking, and medical boundaries.

SomatoSync does not diagnose concussion, predict an exact recovery date, prescribe treatment, or provide return-to-school, work, driving, exercise, or sport clearance. Danger signs require urgent medical evaluation.

For more detail, see:

- `SCIENTIFIC_BASIS.md`
- `SCIENCE_SAFETY_DESIGN.md`
- `ASSESSMENT_EVIDENCE_AUDIT.md`
- `FOCUS_COGNITIVE_LOAD.md`
- `RESPONSIBLE_AI_PIPELINE.md`

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- MediaPipe Face Landmarker
- MediaPipe Pose Landmarker
- TensorFlow.js
- Transformers.js
- Chrome Extension APIs
- browser Speech Synthesis
- local browser storage

## Getting started

```bash
npm install
npm run dev
