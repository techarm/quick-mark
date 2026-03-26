const $ = (id) => document.getElementById(id);

let currentUrl = "";
let currentTitle = "";
let isDuplicate = false;
let categoriesLoaded = false;

async function init() {
  const config = await chrome.storage.local.get(["apiToken"]);
  if (!config.apiToken) {
    $("loading").hidden = true;
    $("not-configured").hidden = false;
    $("open-options").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab.url.startsWith("http")) {
    $("loading").hidden = true;
    $("error").hidden = false;
    $("error").textContent = "このページは保存できません";
    return;
  }

  currentUrl = tab.url;
  currentTitle = tab.title || tab.url;

  $("page-title").textContent = currentTitle;
  $("page-url").textContent = currentUrl;
  $("edit-url").textContent = currentUrl;
  $("edit-title").value = currentTitle;

  // Check duplicate
  try {
    const result = await apiRequest("POST", "/api/check-duplicate", {
      url: currentUrl,
    });

    $("loading").hidden = true;
    $("content").hidden = false;

    if (result) {
      isDuplicate = true;
      $("duplicate-info").hidden = false;
      $("actions").hidden = true;
      if (result.category_name) {
        $("duplicate-category").textContent = result.category_name;
      }
    }
  } catch (e) {
    $("loading").hidden = true;
    $("error").hidden = false;
    $("error").textContent = e.message;
  }

  // Event listeners
  $("save-btn").addEventListener("click", handleSave);
  $("save-expanded-btn").addEventListener("click", handleSaveExpanded);
  $("expand-btn").addEventListener("click", async () => {
    $("simple-mode").hidden = true;
    $("expanded-mode").hidden = false;
    $("edit-title").focus();
    if (!categoriesLoaded) {
      categoriesLoaded = true;
      try {
        const categories = await apiRequest("GET", "/api/categories");
        const select = $("edit-category");
        for (const cat of categories) {
          const opt = document.createElement("option");
          opt.value = cat.id;
          opt.textContent = cat.name;
          select.appendChild(opt);
        }
      } catch {
        // カテゴリ取得失敗は無視（「なし」のまま保存可能）
      }
    }
  });
  $("collapse-btn").addEventListener("click", () => {
    $("expanded-mode").hidden = true;
    $("simple-mode").hidden = false;
  });
}

async function handleSave() {
  if (isDuplicate) return;

  $("save-btn").disabled = true;
  $("save-btn").textContent = "保存中...";

  try {
    // Fetch metadata
    let title = currentTitle;
    let description = "";
    let faviconUrl = "";

    try {
      const info = await apiRequest("POST", "/api/fetch-info", {
        url: currentUrl,
      });
      title = info.title || currentTitle;
      description = info.description || "";
      faviconUrl = info.favicon_url || "";
    } catch {
      // Use tab info as fallback
    }

    await apiRequest("POST", "/api/links", {
      url: currentUrl,
      title,
      description,
      favicon_url: faviconUrl,
    });

    $("simple-mode").hidden = true;
    $("save-success").hidden = false;

    // Notify service worker to update tab status
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.runtime.sendMessage({ type: "refresh-tab-status", tabId: tab.id, url: currentUrl });
    }
  } catch (e) {
    $("save-btn").disabled = false;
    $("save-btn").textContent = "保存";
    $("error").hidden = false;
    $("error").textContent = e.message;
  }
}

async function handleSaveExpanded() {
  if (isDuplicate) return;

  const title = $("edit-title").value.trim();
  if (!title) {
    $("edit-title").focus();
    return;
  }

  $("save-expanded-btn").disabled = true;
  $("save-expanded-btn").textContent = "保存中...";

  try {
    // Fetch metadata for favicon/description
    let description = "";
    let faviconUrl = "";

    try {
      const info = await apiRequest("POST", "/api/fetch-info", {
        url: currentUrl,
      });
      description = info.description || "";
      faviconUrl = info.favicon_url || "";
    } catch {
      // proceed without metadata
    }

    const categoryId = $("edit-category").value || undefined;
    await apiRequest("POST", "/api/links", {
      url: currentUrl,
      title,
      description,
      favicon_url: faviconUrl,
      category_id: categoryId,
    });

    $("expanded-mode").hidden = true;
    $("save-success").hidden = false;

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.runtime.sendMessage({ type: "refresh-tab-status", tabId: tab.id, url: currentUrl });
    }
  } catch (e) {
    $("save-expanded-btn").disabled = false;
    $("save-expanded-btn").textContent = "保存";
    $("error").hidden = false;
    $("error").textContent = e.message;
  }
}

init();
