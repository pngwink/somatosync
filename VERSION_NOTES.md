# Version Notes — Version 2: Focus Hybrid Refinement

Building on Version 1, this version makes Focus Mode more tightly connect confirmed symptom context, task response, live interaction signals, and user-controlled personalization.

## Changes from Version 1

- Added a unified symptom context so Focus can use the latest confirmed symptom record regardless of whether it came from manual or voice check-in.
- Allowed recent post-task symptom ratings to refresh only the specific symptoms measured by those tasks; task performance scores do not directly drive interface changes.
- Site-wide Focus now begins with a symptom-matched starting setup before optional camera inference begins.
- Sustained MediaPipe signals refine the starting setup instead of replacing it.
- Strengthened distinct adaptation paths for light sensitivity, close viewing/squinting, motion-related difficulty, and cognitive fatigue.
- Refined the Focus interface so symptom-seeded changes, live refinements, and user controls are easier to distinguish.
- Applied a broad copy/readability pass across the application while preserving technical detail through progressive disclosure.

## Safety and control

Adaptations remain reversible and user-controlled. Camera-derived interaction signals are treated as nonspecific accessibility cues, not diagnostic biomarkers.
