chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "citesnap-clip",
    title: "CiteSnap: Clip Quote & Deep Link (Alt+X)",
    contexts: ["selection"]
  });
});

async function sendToActiveTab(tabId, type) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
      await chrome.tabs.sendMessage(tabId, { type });
    } catch (err) {
      console.error("CiteSnap skipped restricted page:", err);
    }
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "citesnap-clip" && tab?.id) {
    sendToActiveTab(tab.id, "CITESNAP_CLIP");
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "clip-quote") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) sendToActiveTab(tab.id, "CITESNAP_CLIP");
  }
});
