const enabled = document.getElementById("enabled");
const preflight = document.getElementById("preflight");
const status = document.getElementById("sync-status");
const learned = document.getElementById("learned");
const chips = document.getElementById("chips");
const pageStatus = document.getElementById("page-status");
const pageChanges = document.getElementById("page-changes");
const recommended = document.getElementById("recommended");
const current = document.getElementById("current");
const restore = document.getElementById("restore");

function fillChips(container, values) {
  container.replaceChildren(...values.map((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    return span;
  }));
}

function activeTabMessage(type, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type }, (response) => {
      if (chrome.runtime.lastError) return;
      callback?.(response);
    });
  });
}

function refreshPageStatus() {
  activeTabMessage("SOMATOSYNC_SHIELD_STATUS", (response) => {
    if (!response) return;
    if (response.pageApplied) {
      pageStatus.textContent = "Shield is adapting this page.";
      const changes = Array.isArray(response.changes) ? response.changes : [];
      pageChanges.hidden = changes.length === 0;
      fillChips(pageChanges, changes.slice(0, 6));
    } else {
      pageStatus.textContent = response.hasProfile ? "Your setup is ready to apply." : "Open SomatoSync once to sync a setup.";
      pageChanges.hidden = true;
    }
  });
}

chrome.storage.local.get({
  somatosyncShieldEnabled: true,
  somatosyncShieldAutoPreflight: true,
  somatosyncShieldProfile: null,
  somatosyncShieldLastSync: null
}, (stored) => {
  enabled.checked = stored.somatosyncShieldEnabled;
  preflight.checked = stored.somatosyncShieldAutoPreflight;
  const profile = stored.somatosyncShieldProfile;
  recommended.disabled = !profile?.recommended;
  current.disabled = !profile;
  if (profile) {
    const when = stored.somatosyncShieldLastSync ? new Date(stored.somatosyncShieldLastSync).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "recently";
    status.textContent = `Setup synced ${when}.`;
    const supports = Array.isArray(profile.learnedSupports) ? profile.learnedSupports : [];
    if (supports.length) {
      learned.hidden = false;
      fillChips(chips, supports);
    }
  }
  refreshPageStatus();
});

enabled.addEventListener("change", () => chrome.storage.local.set({ somatosyncShieldEnabled: enabled.checked }));
preflight.addEventListener("change", () => chrome.storage.local.set({ somatosyncShieldAutoPreflight: preflight.checked }));
recommended.addEventListener("click", () => activeTabMessage("SOMATOSYNC_SHIELD_APPLY_RECOMMENDED", refreshPageStatus));
current.addEventListener("click", () => activeTabMessage("SOMATOSYNC_SHIELD_APPLY_CURRENT", refreshPageStatus));
restore.addEventListener("click", () => activeTabMessage("SOMATOSYNC_SHIELD_RESTORE", refreshPageStatus));
