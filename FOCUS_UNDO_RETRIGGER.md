# Focus Undo and Re-trigger Behavior

- `Undo changes` restores the interface state that existed immediately before the latest live adaptation.
- Undo does **not** stop Focus Mode, the camera stream, calibration reference, or interaction monitoring.
- After Undo, buffered live-trigger samples are cleared so the same stale pattern cannot instantly reapply the change.
- A short 5-second re-arm grace period is used; after that, a fresh sustained multi-signal pattern may trigger another Focus refinement.
- Undo bypasses the normal 90-second prompt cooldown only for this fresh re-arm path; the usual cooldown still applies to normal repeated prompts.
- Turning Focus on still reads the latest confirmed daily PCSS/voice check-in through `getCurrentAdaptiveCheckIn()` and immediately seeds the starting interface through `planAdaptiveIntervention()` before camera inference begins.
- Live MediaPipe/TensorFlow-assisted signals refine the symptom-seeded setup rather than replacing it.
- Turning Focus off remains the only action that stops monitoring and restores the full original interface.
