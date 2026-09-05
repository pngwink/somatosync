# Focus Cognitive-Load Design

## Design changes

This version makes Focus Mode visibly change the *amount and structure of information* on screen, not just its palette.

### 1. Long text now becomes progressive disclosure
- When Focus enters reduced-density mode, long ordinary body paragraphs are shortened to a small preview.
- A **Show full text / Show less** control keeps the original text available.
- Safety, urgent guidance, alerts, dialogs, forms, and explicitly preserved medical copy are excluded.
- Component-authored task-first summaries still take priority where they already exist.

### 2. Sustained close-viewing + squint can now trigger the stronger reading view
- The existing multi-signal/persistence gates still have to qualify the pattern.
- The pattern remains a nonspecific accessibility signal, not a neurological biomarker.
- Once a sustained close-viewing + squint pattern is accepted/auto-applied, the UI can now reduce density as well as enlarge/space text.
- This makes the demo progression intentional: mild symptom seed -> subtle baseline -> sustained interaction difficulty -> visibly simpler reading view.

### 3. Strong Focus is now a true single-task layout
When `focusReadingLayout + reduceDensity` are active:
- desktop sidebar collapses;
- navigation stays available through the header menu;
- demo banner and nonessential header controls disappear;
- multi-column grids reflow to one column;
- content width narrows to a reading lane;
- long paragraphs use a shorter line measure and greater spacing;
- shadows/decorative chrome are reduced;
- component-marked secondary text and detailed copy stay hidden;
- safety and urgent information remain visible.

### 4. Color no longer implies a concussion-specific hue
- The prior teal/green Focus palette was replaced with neutral, low-intensity stone/graphite palettes.
- Light-sensitivity support still reduces luminance/saturation and media intensity.
- Accent colors remain muted for orientation, but no hue is presented as therapeutic.

## Research rationale

### Concussion-specific guidance
- **Amsterdam 2022 concussion consensus:** relative rather than strict rest; reduced screen use is useful early; return-to-learn should increase cognitive load gradually and use temporary environmental/curricular supports when symptoms interfere with reading, concentration, memory, or screen use.
- **PedsConcussion Living Guideline:** return to school as tolerated with temporary, symptom-based accommodations; accommodations should be monitored and modified as symptoms change.
- **Living Concussion Guidelines:** visual symptoms after concussion can include photosensitivity, fatigue, and difficulty reading, and can be aggravated by bright or overwhelming visual environments.
- **CDC HEADS UP:** symptom-based school supports include reducing work to key tasks, rest breaks, quieter/less bright environments, and other temporary adjustments.

### Accessibility / information-design guidance
- **W3C Cognitive Accessibility:** short blocks of text, small chunks, whitespace, clear hierarchy, reduced unnecessary content, and clear headings help people with cognitive/attention barriers focus and reorient.
- **WCAG visual presentation:** narrower text blocks and adequate line spacing can make text easier to track for users with cognitive or visual disabilities; content should remain operable when spacing changes.

## Safety boundary preserved
Focus remains an experimental accessibility aid. MediaPipe-derived interaction patterns are nonspecific and do not diagnose concussion, measure severity, detect neurological fatigue, or determine readiness. All stronger adaptations remain reversible.
