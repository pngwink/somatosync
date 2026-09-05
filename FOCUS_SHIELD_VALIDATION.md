# Focus + Shield Validation

## Design invariant
Focus presentation changes are accessibility supports, not diagnostic conclusions. Confirmed symptoms seed the initial presentation; sustained local interaction signals can refine it. Shield never transforms a new external origin without a user click unless that origin has a current explicit `Always use on this site` consent record.

## Adaptation cases tested
- Baseline/no relevant symptoms: no transformation.
- Severe light sensitivity: black + amber photophobia mode, strong media calming, moving media paused.
- Severe visual difficulty: ~1.42x reading typography, ~1.48 line-spacing multiplier, focused reading lane.
- Mental fatigue/rereading: stronger hierarchy, secondary content de-emphasized (not removed), paragraph reading spotlight.
- Dizziness/head-gaze instability: motion frozen, viewport stabilized, moving media paused; text is not enlarged unless visual-strain signals also support it.
- Sustained close-viewing + squint: heavy reading typography + reading lane rather than whole-page zoom.
- Changed blinking + squint with light sensitivity: escalates anti-glare support.

## External-site guardrails tested in Chromium
- A reading-heavy page remains visually unchanged until the user selects `Use on this page`.
- Legacy `always` values from the prior hostname-based permission scheme are ignored.
- Automatic application requires origin-scoped consent with the current consent version.
- A newly synced SomatoSync profile does not silently replace the setup on a one-time-approved page; it asks to update.
- Short/non-reading pages never receive whole-body typography scaling or reading-layout reflow.
- Generic navigation and sidebars are preserved; only obvious ads/promotions/recommendations may be hidden.
- Reading spotlight is confined to the reading surface so navigation remains visible outside it.

## Static validation
- 175 TypeScript/TSX source files parsed with zero syntax diagnostics.
- Shield, bridge, and popup JavaScript pass `node --check`.
- No CSS `zoom:` rule or transform-scale substitute remains in Focus/Shield.
- No Focus/Shield rule hides generic `nav`, `aside`, or sidebar elements.
