# Version Notes — Shield Safety and Consent Validation

This snapshot builds on the Focus hybrid refinement with additional validation and guardrails for Focus Mode and SomatoSync Shield, especially when accommodations are applied to external webpages.

## Changes from the previous snapshot

- Strengthened origin-scoped consent so a new external site is not transformed without an explicit user action unless that origin has a current “Always use on this site” permission.
- Prevented newly synced profiles from silently replacing a one-time-approved page setup.
- Preserved general navigation and sidebars while limiting cleanup to clearly secondary or promotional content.
- Confined Reading Spotlight to the reading surface so navigation remains accessible outside the focused region.
- Kept symptom-specific adaptation behavior separate: visual sensitivity can calm media and contrast, close viewing can change typography and reading width, and motion-related difficulty can reduce movement without forcing unrelated text changes.
- Added static validation for TypeScript/TSX syntax and Shield extension JavaScript, along with checks against whole-page zoom and overly broad content hiding.

## Safety and control

Focus and Shield remain accessibility supports rather than diagnostic systems. External-site adaptation is consent-based, visible, and reversible.
