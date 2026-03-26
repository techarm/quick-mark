// === API Client (inline to avoid importScripts issues in MV3) ===

const PORT_START = 21579;
const PORT_END = 21589;

async function getConfig() {
  const result = await chrome.storage.local.get(["apiToken", "apiPort"]);
  return {
    token: result.apiToken || "",
    port: result.apiPort || PORT_START,
  };
}

async function savePort(port) {
  await chrome.storage.local.set({ apiPort: port });
}

async function discoverPort() {
  for (let port = PORT_START; port <= PORT_END; port++) {
    try {
      const resp = await fetch(`http://localhost:${port}/api/ping`, {
        signal: AbortSignal.timeout(1000),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.data?.app === "QuickMark") {
          await savePort(port);
          return port;
        }
      }
    } catch {
      // try next port
    }
  }
  return null;
}

async function apiRequest(method, path, body = null) {
  const config = await getConfig();
  if (!config.token) {
    throw new Error("APIトークンが設定されていません");
  }

  const doRequest = async (port) => {
    const url = `http://localhost:${port}${path}`;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      signal: AbortSignal.timeout(15000),
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const resp = await fetch(url, options);
    const data = await resp.json();
    if (!data.success) {
      throw new Error(data.error || "API error");
    }
    return data.data;
  };

  try {
    return await doRequest(config.port);
  } catch {
    const newPort = await discoverPort();
    if (newPort && newPort !== config.port) {
      return await doRequest(newPort);
    }
    throw new Error("Quick Markアプリに接続できません");
  }
}

// === Icon & Menu state ===

const ICON_DEFAULT = {
  "16": chrome.runtime.getURL("icons/icon16.png"),
  "32": chrome.runtime.getURL("icons/icon32.png"),
  "48": chrome.runtime.getURL("icons/icon48.png"),
  "128": chrome.runtime.getURL("icons/icon128.png"),
};

const ICON_SAVED = {
  "16": chrome.runtime.getURL("icons/icon16_saved.png"),
  "32": chrome.runtime.getURL("icons/icon32_saved.png"),
  "48": chrome.runtime.getURL("icons/icon48_saved.png"),
  "128": chrome.runtime.getURL("icons/icon128_saved.png"),
};

async function updateTabStatus(tabId, url) {
  if (!url || !url.startsWith("http")) {
    await chrome.action.setIcon({ path: ICON_DEFAULT, tabId });
    chrome.contextMenus.update("save-to-quickmark", {
      title: chrome.i18n.getMessage("contextMenuSave"),
      enabled: true,
    });
    return;
  }

  try {
    const result = await apiRequest("POST", "/api/check-duplicate", { url });
    if (result) {
      await chrome.action.setIcon({ path: ICON_SAVED, tabId });
      chrome.contextMenus.update("save-to-quickmark", {
        title: chrome.i18n.getMessage("contextMenuSaved"),
        enabled: false,
      });
    } else {
      await chrome.action.setIcon({ path: ICON_DEFAULT, tabId });
      chrome.contextMenus.update("save-to-quickmark", {
        title: chrome.i18n.getMessage("contextMenuSave"),
        enabled: true,
      });
    }
  } catch (e) {
    console.error("[QuickMark] updateTabStatus error:", e);
    await chrome.action.setIcon({ path: ICON_DEFAULT, tabId });
  }
}

// === Context Menu ===

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-quickmark",
    title: chrome.i18n.getMessage("contextMenuSave"),
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-to-quickmark") return;

  const url = info.linkUrl || info.pageUrl;
  const title = info.linkUrl ? info.selectionText || url : tab?.title || url;

  try {
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

    // Update icon to saved state
    if (tab?.id) {
      updateTabStatus(tab.id, info.pageUrl);
    }
  } catch {
    if (tab?.id) {
      chrome.action.setBadgeText({ text: "!", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 3000);
    }
  }
});

// === Auto-detect saved status on tab change ===

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  updateTabStatus(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateTabStatus(activeInfo.tabId, tab.url);
});
