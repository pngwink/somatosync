# Voice Check-In and Adaptive Focus Testing

## Conversational symptom check-in

1. Run the app on `localhost` in current Chrome or Edge with internet available for the first model download.
2. Open **Check In** and choose **Talk through check-in**.
3. Select **Prepare private voice AI**. The first download may take several minutes; later sessions use the browser cache.
4. Allow microphone permission, then say something like:
   - “My headache was a four after math class. Bright lights bothered me, and I felt tired during homework. I was not dizzy.”
5. Stop the recording. Confirm that SomatoSync identifies headache, light sensitivity, fatigue, and school/homework context while excluding dizziness.
6. Confirm that the detected symptoms already have tentative scores, confidence labels, quoted evidence, and a short explanation of why each score was proposed.
7. Adjust a proposed score with the plus/minus control when it does not match. Open only the remaining symptom groups that apply; unmentioned symptoms start at zero.
8. Optionally expand and edit the transcript, then confirm the ratings and save.
9. Confirm the result appears in Check In history and Recovery. Verify that the recording and transcript are not present in local storage or export data.

### Safety route

Record or type a phrase containing a clear danger sign, such as “I had a seizure.” The result must block routine saving and display urgent guidance. This test is only for verifying routing; do not use the app instead of emergency care.

## Adaptive Focus Mode 2.0

1. Select **Focus Mode** in the global top bar.
2. Choose either **Suggest changes only** or enable **Auto-apply lower-stimulation view**.
3. Allow camera access and remain comfortable and still for the 12-second same-session reference.
4. After calibration and the route-change grace period, sustain multiple changes for about 25–35 seconds:
   - move closer to the screen;
   - squint or furrow the brow;
   - increase head/gaze variation;
   - repeatedly scroll backward and forward.
5. Confirm that one isolated blink or quick look-away does not trigger an alert.
6. When a sustained alert appears, verify that the reasons are shown.
7. In suggest-only mode, choose **Adapt interface**. In automatic mode, verify that the page changes without an extra click.
8. Confirm the intervention can:
   - enlarge text;
   - increase line spacing;
   - reduce motion;
   - soften contrast;
   - collapse secondary descriptions/details;
   - enable read-aloud support for audio-first mode.
9. Select **Undo changes** and verify the previous appearance returns across the site.
10. Label the alert **This helped** or **False alarm** and confirm the response remains account-scoped in local storage.

## Browser limitations

- Use `localhost` or HTTPS for microphone/camera permissions.
- The first Whisper model download requires internet access and can be slow on CPU-only devices.
- WebGPU is attempted first; browser CPU/WASM is the fallback.
- No raw audio, transcript, camera frame, or landmark stream should be persisted.
