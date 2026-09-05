# Version Notes — Version 9: Reading Spotlight Refinement

Building on Version 8, this version makes the manual Reading Spotlight more stable, precise, and usable for longer reading sections.

## Changes in this version

- Refined spotlight targeting to combine pointer position, keyboard focus, and viewport position without claiming eye tracking.
- Added short preference windows for pointer and keyboard input so the active section does not jump unexpectedly between signals.
- Added hysteresis when switching reading blocks to reduce flicker and unnecessary movement.
- Long paragraphs can now spotlight a smaller multi-line window instead of lifting the entire paragraph.
- Added a visible spotlight frame while keeping headings and orientation content readable around the active section.
- Added keyboard movement between reading blocks with Alt + Up/Down.
- Updated the Focus settings description so the control clearly explains how Reading Spotlight chooses the current section.

## Safety / scope

Reading Spotlight remains manual and reversible. It does not infer gaze, neurological state, concussion severity, or what the user is medically ready to do.
