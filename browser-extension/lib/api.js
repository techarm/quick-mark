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
    throw new Error("APIトークンが設定されていません。設定画面で入力してください。");
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

  // Try current port first
  try {
    return await doRequest(config.port);
  } catch {
    // Port may have changed, rediscover
    const newPort = await discoverPort();
    if (newPort && newPort !== config.port) {
      return await doRequest(newPort);
    }
    throw new Error("Quick Markアプリに接続できません。アプリが起動しているか確認してください。");
  }
}
