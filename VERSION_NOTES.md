# Version Notes — Version 6: Focus Accessibility Tools

Building on Version 5, this version adds practical reading supports and makes cognitive-load reduction more concrete while preserving important information and user control.

## Changes in this version

- Added Plain Language, a reversible local simplifier for a curated set of difficult UI and medical terms; controls, links, warnings, code, and form elements are excluded.
- Expanded the earlier Read Aloud support into a sitewide Focus tool that uses the browser's local Speech Synthesis API for visible headings and body content.
- Added true low-density decluttering: only helper text explicitly marked as secondary can be hidden, while navigation, controls, warnings, cards, metrics, and primary content remain visible.
- Added the new reading-tool state to Focus settings/storage so these supports can be turned on and restored cleanly.
- Simplified the Focus page into a clearer activation/setup/tools flow and collapsed secondary technical details by default.
- Disabled automatic in-app reading-ruler behavior so Focus relies on spacing, typography, selective decluttering, Plain Language, and Read Aloud; Shield retains a user-controlled reading spotlight for external pages.

## Safety / scope

These are reversible accessibility supports, not treatment or diagnostic features. The build preserves safety-critical and primary information while allowing the user to restore original wording or turn Focus off.
