# Neuro-Adaptive Mode: technical walkthrough

## Pipeline

```text
Top-bar opt-in and camera consent
        ↓
Optional MediaPipe Face Landmarker + site interaction signals
        ↓
12-second same-session reference
        ↓
20-second rolling feature window
        ↓
Tracking-quality + multi-family + sustained-window filters
        ↓
Transparent rules blended with optional local TensorFlow.js personalization
        ↓
Explainable prompt with user control
        ↓
Reversible UI adaptation / audio / break
        ↓
Local yes/no feedback for future personalization
```

## Transient features

- blink rate change;
- brow and eye-squint blendshape proxy;
- relative face width as a viewing-distance proxy;
- normalized nose-position movement as a head-motion proxy;
- eye-direction blendshape variation;
- scroll-direction reversals;
- extended inactivity.

These features are non-specific and are never described as proof of neurological fatigue.

## Personalization

Initial weights and thresholds are transparent prototype values. One signal can never trigger an alert by itself. The monitor requires acceptable tracking quality, at least two independent signal families, a sustained elevated pattern in at least four of six rolling checks, a grace period after navigation, and a 90-second cooldown.

When the user confirms or rejects prompts, the app first adjusts transparent local weights. After at least six labeled alerts with both positive and negative examples, TensorFlow.js trains a tiny one-layer logistic classifier in the browser. Its probability contributes only 25% of the displayed pattern score; deterministic safeguards remain in control. The project does not claim clinical validation, population-level training, or recovery prediction.

## Saved data

Only aggregate session summaries, interface preferences, and small model weights can be stored under the active account's local namespace. Raw facial and behavioral streams are discarded.
