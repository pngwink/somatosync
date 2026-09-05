# Focus Accessibility Tools

This version expands Focus Mode accessibility tools while leaving the Check-In and Recovery experiences unchanged.

## What changed

- **Real low-density decluttering:** when Focus selects cognitive-load reduction, only helper descriptions explicitly marked as secondary are omitted. Navigation, sidebars, controls, warnings, cards, metrics, and primary content stay visible.
- **Plain Language:** a reversible local text simplifier swaps a curated set of difficult UI/medical terms for easier wording. It does not rewrite buttons, links, warnings, code, or form controls.
- **Read Aloud:** uses the browser's local Speech Synthesis API with a slower speaking rate and reads only visible page headings/body content.
- **Cleaner Focus page:** one activation card, one compact setup/tools card, and Shield/history/scientific details collapsed by default.
- **Automatic in-app reading ruler disabled:** Focus does not automatically activate line-focus in this build; Shield still offers a user-controlled reading spotlight for external pages.

## Demo path

1. Confirm Maya has meaningful mental fatigue/light sensitivity in the latest check-in.
2. Open Focus and select **Turn on Focus Mode**.
3. Show the symptom-seeded visual change; cognitive-load mode will omit optional helper descriptions.
4. Allow the local camera reference to complete.
5. Sustain close viewing + squinting to demonstrate live refinement.
6. Show **Plain language**, **Read aloud**, **Undo changes**, and **Take a break** as optional user-controlled supports.

## Scope / validation

- UI files outside Focus Mode were not edited.
- 176 TypeScript/TSX source files were syntax-parsed with 0 syntax errors.
- A full Vite build could not be executed in this environment because the source zip does not include installed package dependencies and no npm package cache is available.
