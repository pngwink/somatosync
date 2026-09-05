# SomatoSync — privacy-first concussion recovery prototype

SomatoSync is a privacy-first recovery companion with a separated Maya Chen demo and blank real-user accounts. It is designed for sport and non-sport concussions, including falls, vehicle crashes, workplace incidents, recreation, assault, school, caregiving, and ordinary daily-life recovery. Account and assessment summaries are stored locally in the browser and isolated by account scope. Free on-device language models support evidence-grounded explanations; there is still no production authentication, cloud health-record database, clinical device integration, or medical-clearance engine.

## Getting started

```bash
npm install
npm run dev
npm run build
npm run preview
```

Camera access normally requires `localhost` or an HTTPS deployment.

## Multidomain assessments

- 22-item PCSS-format symptom tracker
  - 0–6 severity per symptom
  - total severity from 0–132
  - physical, sleep, emotional, and cognitive subtotals
- Reaction-time assessment with account-scoped history
- Short Memory Task
  - original rotating 10-word lists
  - immediate and five-minute delayed recall
  - numerical summaries only; typed words are discarded
- Experimental camera balance assessment
  - 15-second eyes-open recording
  - lateral sway RMS, range, and movement path
  - MediaPipe nose/ear-region head-steadiness proxy
  - recording-quality check
  - no stored video, frames, or body-coordinate streams
Results are interpreted against the user’s own earlier sessions and displayed separately. SomatoSync does not collapse symptoms, cognition, and balance into one readiness percentage.

## Personalized Recovery Guidance

Recovery is intentionally split into three calm views instead of one dense dashboard:

1. **Overview** — the current pattern, one “what seems to help” highlight, the latest recovery event, and one expandable evidence/story section.
2. **Trends** — the main symptom graph plus compact reaction, memory, and camera-movement summaries; deeper charts remain available on demand.
3. **Plan** — today’s top supports plus two focused actions: open the recovery pathway workspace or open Recovery Relay sharing.

The detailed pathway screen at `/app/recovery/plan-details` no longer uses nested tabs. It shows one selected pathway, the current step, a focused activity-log dialog, a focused step-change dialog, recent activity response, and a single collapsed “More recovery detail” section for AI explanation, outlook, and sources. Recovery Relay lives on its own focused screen at `/app/recovery/share`.

The optional recovery-context form does not require a sport, wearable, or detailed medical history. Users can choose school, work, daily life, sport, or any combination.

## Recovery schedule

The Check In schedule uses a simple seven-day strip plus **Today**, **Later this week**, and **Weekly progress** sections rather than a dense calendar. Prototype cadence:

- PCSS: daily or when symptoms change
- Reaction time: twice weekly
- Short memory: twice weekly
- Camera balance: twice weekly when standing is safe

Completed, suggested-today, planned, and skipped states are visually distinct. A skipped activity is not a medical warning.

## Research grounding

The recovery guidance explicitly links to:

- Amsterdam 2022 international concussion consensus statement
- Living Concussion Guidelines from Ontario
- Living Guideline for Pediatric Concussion Care from PedsConcussion
- CDC HEADS UP guidance

SomatoSync adapts concepts from these sources for a student prototype. It is not an official digital implementation of SCAT6, SCOAT6, BESS/mBESS, VOMS, or any validated prognostic model.

## Privacy-first research assistant

The Research Assistant uses a hybrid local architecture:

1. A deterministic retrieval engine ranks a curated concussion evidence library.
2. Chrome's built-in Prompt API can use Gemini Nano on-device when available.
3. Otherwise, a user-visible **Prepare free AI** control downloads FLAN-T5 Small through Transformers.js and runs it locally in the browser.
4. If neither model starts, the citation-based evidence response still works and is labeled as a non-AI fallback.

Research questions stay in page memory, are not written to local storage, and cannot read a real user’s assessment records. No API key, AI account, paid endpoint, or server route is required.

## Local unexpected-change check

After at least five comparable sessions in a domain, SomatoSync can compare the newest result with the user's recent median using a robust deviation calculation. It only surfaces a prompt to recheck an unusual within-person change; it does not define a clinical abnormality or predict recovery. Low-quality camera sessions are excluded.

## Privacy controls

- Camera audio is disabled and the video stream stops after testing.
- Raw video, screenshots, frame data, body coordinates, and memory-task words are not saved.
- Only numerical assessment summaries and optional pathway/context records are stored in account-scoped local storage.
- No analytics SDK, advertising tracker, cloud health-record database, background sync, or paid AI endpoint is included. Language-model inference runs locally after a one-time model download.
- The Privacy & Data page lists, exports, and deletes locally stored entries.

## Medical scope

SomatoSync does not diagnose concussion, provide return-to-school/work/driving/sport clearance, prescribe treatment, or replace a qualified healthcare professional. Danger signs require urgent medical evaluation. The app records patterns and supports conversations with clinicians, families, schools, employers, coaches, and other responsible adults.

## Free on-device AI recovery explanation

The Recovery page can generate a plain-language explanation using the same local AI stack as the Research Assistant: Gemini Nano when available, then Transformers.js with FLAN-T5 Small. Transparent code calculates all recovery facts first. The model only rewrites those facts and limitations into simpler language. No API key, server function, or payment is required.

The first Transformers.js use downloads the model and may take time; the browser caches it afterward. If local generation cannot start, SomatoSync shows a clearly labeled evidence-based fallback.

## MediaPipe pose-estimation balance analysis

The balance assessment loads Google MediaPipe Pose Landmarker and its trained lite model, then runs video-frame inference locally in the browser. A live skeleton confirms landmark tracking. SomatoSync derives torso movement from shoulder/hip midpoints and head steadiness from the nose/ear region. Only summary metrics are stored; raw video and landmark streams are discarded. The model assets require a network connection when first loaded unless they are self-hosted in a future deployment.

## Neuro-Adaptive Mode

A top-bar **Focus Mode** control enables an optional site-wide cognitive-pacing layer, while `/app/neuro-adaptive` remains the explanation and guided-test workspace:

- 3-question visual/cognitive tolerance check-in;
- standard, reduced-stimulation, or audio-first interface recommendation;
- optional MediaPipe Face Landmarker inference in the browser;
- 12-second same-session reference rather than a pre-injury baseline;
- explainable blink-pattern, facial-tension, viewing-distance, head-motion, gaze-variation, rereading, and extended-pause signals;
- a multi-signal experimental pattern score with visible reasons;
- site-wide monitoring across supported pages after explicit consent and a 12-second reference;
- false-positive guards requiring tracking quality, multiple independent signal families, sustained windows, route-change grace periods, and alert cooldowns;
- user-controlled interface adaptation, browser text-to-speech, or a two-minute quiet break;
- local confirmation-based tuning plus an optional TensorFlow.js logistic classifier after enough yes/no labels;
- no stored or uploaded video, screenshots, raw landmarks, facial templates, or raw interaction streams.

The mode does not diagnose cognitive fatigue or vision dysfunction. Its purpose is to make recovery content easier to tolerate and to demonstrate privacy-preserving, user-controlled adaptive accessibility.

## Simplified product navigation

The main in-app navigation is intentionally limited to four destinations:

- **Home** — today’s next step, a short recovery snapshot, privacy status, and quick actions.
- **Check In** — Today, History, and Schedule tabs combine symptom entry, assessments, earlier results, and the weekly plan.
- **Recovery** — Overview, Trends, and Plan keep the big picture separate from deeper tools.
- **Focus** — guided adaptive reading plus SomatoSync Shield.

Advanced tools remain available under **More**:

- Assistant
- Reports
- Privacy & Data
- Profile
- Settings

Detailed progress and protocol screens are still available through “Open detailed…” links, so the simplified interface uses progressive disclosure rather than deleting scientific or technical information.


## Finishing-pass functionality

- **Reduce visual intensity** now persists per local account and changes color tokens, contrast, saturation, backgrounds, and camera/media presentation across the application.
- **Notification center** now controls whether the bell is displayed.
- **Assessment reminders** now add the current day’s suggested tasks to the in-app notification menu; no background push notification claim is made.
- **Reports** now read the real account’s latest stored assessment summaries, apply the selected date range, include chosen sections, download raw JSON, and open a printable view that can be saved as PDF by the browser.
- **Prototype Terms and Privacy Policy** are real routes rather than dead links.

## Latest compatibility and interface pass

- Home, Check In, Recovery, Assistant, and the landing page use a mobile-health card hierarchy with one primary action and progressive disclosure.
- Full assessment history, charts, protocol tools, sources, reports, privacy controls, and AI/ML details remain available through tabs and detail links.
- See `WEBGAZER_UI_OVERHAUL.md` for the implementation summary.

## Assessment evidence review

See `ASSESSMENT_EVIDENCE_AUDIT.md` for the rationale, limitations, and claim boundaries for PCSS, reaction time, learning/delayed recall, camera balance and Focus Mode.


## Advanced responsible-AI research pipeline

The Research Assistant now uses BM25 lexical retrieval, local MiniLM embeddings, reciprocal-rank fusion, local cross-encoder reranking, on-device generation, and deterministic claim/safety verification. Emergency, diagnosis, clearance, and exact-timeline requests bypass generative AI. Each answer exposes a state-graph trace and verification result, and the built-in AI Evaluation Lab calculates live Recall@3, MRR, safety-routing accuracy, and latency metrics rather than displaying hardcoded benchmark numbers. See `RESPONSIBLE_AI_PIPELINE.md`.
