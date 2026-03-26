importScripts("lib/api.js");

// Right-click context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-quickmark",
    title: "Save to Quick Mark",
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-to-quickmark") return;

  const url = info.linkUrl || info.pageUrl;
  const title = info.linkUrl ? info.selectionText || url : tab?.title || url;

  try {
    // Fetch metadata
    let finalTitle = title;
    let description = "";
    let faviconUrl = "";

    try {
      const urlInfo = await apiRequest("POST", "/api/fetch-info", { url });
      finalTitle = urlInfo.title || title;
      description = urlInfo.description || "";
      faviconUrl = urlInfo.favicon_url || "";
    } catch {
      // Use fallback values
    }

    await apiRequest("POST", "/api/links", {
      url,
      title: finalTitle,
      description,
      favicon_url: faviconUrl,
    });

    // Show success badge
    if (tab?.id) {
      chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#22c55e",
        tabId: tab.id,
      });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 3000);
    }
  } catch (e) {
    // Show error badge
    if (tab?.id) {
      chrome.action.setBadgeText({ text: "!", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#ef4444",
        tabId: tab.id,
      });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 3000);
    }
  }
});

// Badge: check if current page is already saved
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  if (!tab.url.startsWith("http")) return;

  try {
    const result = await apiRequest("POST", "/api/check-duplicate", {
      url: tab.url,
    });
    if (result) {
      chrome.action.setBadgeText({ text: "★", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  } catch {
    // Silently ignore - app may not be running
    chrome.action.setBadgeText({ text: "", tabId });
  }
});
