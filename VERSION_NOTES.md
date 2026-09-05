# Version Notes — Version 8: Focus Undo and Re-trigger Reliability

Building on Version 7, this version fixes how Focus behaves after a user undoes a live adaptation.

## Changes in this version

- Undo now restores the interface state from immediately before the latest live adaptation without turning Focus Mode off.
- Clears buffered trigger samples after Undo so the same stale interaction pattern cannot immediately reapply the change.
- Adds a short five-second re-arm grace period before a fresh sustained multi-signal pattern can trigger another refinement.
- Allows that fresh re-trigger path without forcing the normal 90-second prompt cooldown, while preserving the usual cooldown for ordinary repeated prompts.
- Keeps camera monitoring, the calibration reference, and the symptom-seeded starting setup active unless the user explicitly turns Focus off.

## Safety / scope

Undo remains a user-control feature rather than a medical interpretation. Fresh adaptations still require sustained interaction evidence; turning Focus off remains the action that stops monitoring and restores the original interface.
