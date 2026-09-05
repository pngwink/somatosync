# SomatoSync Science, Safety, and Cognitive-Accessibility Design

## Product direction

This version establishes a more function-first concussion-recovery support environment built around:

**Understand → Adapt → Function → Gradually Restore**

SomatoSync remains an educational and tracking tool. It does not diagnose concussion, predict a recovery date, create a single recovery/readiness percentage, or medically clear school, work, driving, exercise, or sport.

## Major changes

- Added an Acute Mode for the first ~24–48 hours with intentionally minimal screen interaction and no pressure to complete every assessment.
- Reframed early recovery around relative rest followed by gradual return to low-risk cognitive and physical activity.
- Reworked activity-tolerance logging to capture baseline symptoms, peak symptoms, and time to return near baseline.
- Rebuilt return-to-sport progression so forward movement is sequential; time in stage is displayed but never treated as medical clearance.
- Added return-to-learning gating before unrestricted sport and clinician-authorization boundaries for higher-risk stages.
- Reworked recovery summaries toward function: learning, reading, daily-life/activity tolerance, resumed activities, breaks, and accommodations.
- Added persistent-symptom educational follow-up patterns without diagnosing vestibular, cervical, migraine, autonomic, or post-concussion conditions.
- Added driving/transportation educational guidance and explicit guardrails preventing reaction-time data from declaring driving safety.
- Relabeled reaction time, delayed recall, camera postural movement, and interaction signals as experimental / trend-only where surfaced.
- Tightened deterministic AI safety routing for diagnosis, clearance, driving safety, recovery-date prediction, and misuse of experimental metrics.
- Improved Response Memory language so it records user-reported associations and dislikes without claiming treatment effects.

## Focus Mode

Focus is now a cognitive-accessibility layer, not only a visual theme.

- Content density: Standard / Reduced / Minimal
- Reading Spotlight: optional and manual; uses pointer, keyboard focus, viewport, and interaction context rather than claiming eye tracking
- Motion: Standard / Reduced
- Text: Standard / Large / Extra Large
- Audio-first assistance: optional
- Plain Language and Read Aloud remain user-controlled
- Low-density mode can hide only content explicitly marked as secondary; safety content is preserved
- Key surfaces can provide task-first simplified content with detailed content progressively disclosed
- Camera monitoring is optional; Focus remains usable without camera permission
- Camera/behavior language refers to nonspecific interaction-difficulty patterns, never neurological fatigue or concussion severity
- Gradual restoration can be offered after manageable sessions, but never forced or automatically applied

## Safety precedence

Focus simplification and Reading Spotlight explicitly preserve safety-marked content, alerts, and assertive emergency information.

## Validation performed in this environment

- TypeScript/TSX parser: **179 files, 0 syntax errors**
- `git diff --check`: passed
- Shield extension JavaScript: `node --check` passed
- JSON parse checks for package and extension manifest: passed
- Targeted activity-tolerance and Acute Mode logic checks: passed
- Targeted AI medical guardrail checks: passed
- Targeted sequential return-to-sport progression checks: passed

### Environment limitation

A full `npm test`, `npm run lint`, and `npm run build` could not be completed in this environment because the source snapshot did not contain a complete installed dependency tree and the npm registry was unreachable (`EAI_AGAIN`) when dependency restoration was attempted. The package therefore should still receive a normal `npm ci && npm test && npm run lint && npm run build` run in an environment with npm registry access before deployment.
