const $ = (id) => document.getElementById(id);

function renderTokenPathHint() {
  const container = $("token-path-hint");
  container.textContent = "トークンはQuick Markアプリの設定画面から確認できます";
}

async function init() {
  renderTokenPathHint();

  const config = await chrome.storage.local.get(["apiToken", "apiPort"]);
  $("api-token").value = config.apiToken || "";
  $("api-port").value = config.apiPort || 21579;

  $("toggle-token").addEventListener("click", () => {
    const input = $("api-token");
    input.type = input.type === "password" ? "text" : "password";
  });

  $("discover-port").addEventListener("click", async () => {
    $("discover-port").textContent = "検出中...";
    $("discover-port").disabled = true;

    const port = await discoverPort();
    if (port) {
      $("api-port").value = port;
      showStatus("success", `ポート ${port} を検出しました`);
    } else {
      showStatus("error", "Quick Markアプリが見つかりません");
    }

    $("discover-port").textContent = "自動検出";
    $("discover-port").disabled = false;
  });

  $("save-btn").addEventListener("click", async () => {
    const token = $("api-token").value.trim();
    const port = parseInt($("api-port").value, 10) || 21579;

    await chrome.storage.local.set({ apiToken: token, apiPort: port });
    showStatus("success", "設定を保存しました");
  });

  $("test-btn").addEventListener("click", async () => {
    $("test-btn").textContent = "テスト中...";
    $("test-btn").disabled = true;

    // Save first
    const token = $("api-token").value.trim();
    const port = parseInt($("api-port").value, 10) || 21579;
    await chrome.storage.local.set({ apiToken: token, apiPort: port });

    try {
      // Ping (no auth needed)
      const resp = await fetch(`http://localhost:${port}/api/ping`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await resp.json();
      if (data.success) {
        showStatus("success", "接続成功！ Quick Markと通信できます");
      } else {
        showStatus("error", "接続できますが、Quick Markの応答ではありません");
      }
    } catch {
      showStatus("error", "接続に失敗しました。アプリが起動しているか確認してください");
    }

    $("test-btn").textContent = "接続テスト";
    $("test-btn").disabled = false;
  });
}

function showStatus(type, message) {
  const el = $("status");
  el.hidden = false;
  el.className = `status ${type}`;
  el.textContent = message;
  setTimeout(() => {
    el.hidden = true;
  }, 5000);
}

init();
