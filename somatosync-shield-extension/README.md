# SomatoSync Shield

SomatoSync Shield is the browser-extension companion to SomatoSync. It carries a small display-support profile from the app onto reading-heavy websites. It does not run concussion detection on external sites and it does not send the site's page content back to SomatoSync.

## What can change

The synced profile can independently control:

- text scale and line spacing
- a narrower, centered reading surface
- a more legible system typeface
- warmer / lower-intensity page colors when visual calming is active
- calmer image and video intensity
- reduced animation, transitions, autoplay video and moving sticky chrome
- reduced sidebars, recommendations, promotional blocks and other secondary page chrome
- a paragraph reading guide when lower cognitive load is useful

The exact combination comes from the current or learned SomatoSync setup. The extension does not apply every change to every user.

## When Shield changes a website

Shield is **consent-first by default**. Merely having SomatoSync or the extension enabled does not silently transform every website. On a normal reading-heavy page, the user can apply a setup manually from the extension or accept the small preflight suggestion. Automatic application is reserved for a hostname where the user explicitly enabled **Always use on this site**.

If SomatoSync syncs a newer setup while an already-adapted page is open, Shield asks whether to **Update page** or **Keep current**. An explicitly approved Always-use site can update automatically.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `somatosync-shield-extension` folder.
5. Open or refresh SomatoSync so the profile can sync.

## Test

1. In SomatoSync, open **Focus → SomatoSync Shield**.
2. Confirm the extension shows **Connected** and sync the setup if needed.
3. Open `/shield-demo.html` or a reading-heavy site such as Wikipedia.
4. Use the preflight prompt or the extension popup to apply the learned/current setup.
5. Once applied, use the small **SomatoSync Shield active** control directly on the webpage to turn calm colors, calm images, focus article, reading guide, or reduced motion on/off.
6. Optionally enable **Always use on this site**.
7. Use **Restore** to return the page presentation to normal.

## Privacy boundary

The extension stores the small SomatoSync display profile in Chrome extension storage. It does not upload the external webpage text, browsing content, camera frames, symptom history, or assessment results.
