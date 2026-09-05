(() => {
  const marker = () => document.querySelector('meta[name="somatosync-app"][content="recovery-layer-v1"]');
  if (!marker()) return;

  function announce(type) {
    window.postMessage({ source: "somatosync-shield-extension", type }, window.location.origin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== "somatosync-app") return;

    if (data.type === "SOMATOSYNC_SHIELD_PING") {
      announce("SOMATOSYNC_SHIELD_READY");
      return;
    }

    if (data.type === "SOMATOSYNC_SHIELD_PROFILE" && data.payload?.kind === "somatosync-shield-profile") {
      chrome.storage.local.set({
        somatosyncShieldProfile: data.payload,
        somatosyncShieldEnabled: true,
        somatosyncShieldLastSync: new Date().toISOString()
      }, () => announce("SOMATOSYNC_SHIELD_SAVED"));
    }
  });

  announce("SOMATOSYNC_SHIELD_READY");
})();
