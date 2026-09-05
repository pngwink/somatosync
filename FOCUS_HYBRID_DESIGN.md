# Focus Hybrid Design

## Design summary

- Focus now builds a unified current symptom context from the latest confirmed PCSS record regardless of manual vs Voice Check-In source.
- More recent post-task symptom ratings from Reaction, Memory, or Balance can refresh the specific symptoms those tasks measured; task performance scores never directly change the UI.
- Turning on site-wide Focus now seeds a symptom-matched starting setup before camera inference begins.
- Live MediaPipe signals refine that setup instead of replacing it.
- TensorFlow.js personalization remains available for confirmed Focus patterns.

## Distinct adaptation modes

- Light / visual sensitivity: strong low-glare warm palette + substantially calmer media.
- Squint / closer viewing: focused reading lane + reading-surface text growth + increased spacing + clearer hierarchy.
- Head / gaze instability or motion-related symptoms: motion reduction + stable viewport + reduced sticky/moving UI.
- Cognitive fatigue / rereading / long pauses: secondary-content reduction + stronger hierarchy + focused reading width.
- Higher combined load: optional read-aloud support and break recommendation remain available.

## UX changes

- The Focus page now presents site-wide adaptive Focus as the primary experience.
- The guided paragraph session is explicitly optional for calibration/testing.
- Focus controls preview the symptom-seeded changes and show why they were selected.
- The overlay distinguishes a symptom-seeded starting view from a later live refinement.
- Typography changes target reading surfaces instead of behaving like browser zoom.

## Validation performed here

- JavaScript syntax check passed for the Shield extension.
- TypeScript/TSX parse scan across `src/` found no syntax-class errors.
- Static checks on edited adaptive files found no non-module semantic errors in the dependency-free parse pass.
- Full `npm run build` could not complete in this environment because the project dependencies/type packages are not installed here.
