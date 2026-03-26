use scraper::{Html, Selector};
use serde::Serialize;
#[cfg(target_os = "macos")]
use std::process::Command;
use std::time::Duration;

#[derive(Debug, Serialize)]
pub struct BrowserInfo {
    pub url: String,
    pub title: String,
}

#[derive(Debug, Serialize)]
pub struct UrlInfo {
    pub title: String,
    pub description: String,
    pub favicon_url: String,
}

pub fn fetch_url_info_impl(url: String) -> Result<UrlInfo, String> {
    let domain = extract_domain(&url);
    let base_url = extract_base_url(&url);

    let client = build_client();

    // ページHTMLを取得
    let (title, description, page_favicon) = match fetch_page_meta(&client, &url) {
        Some(meta) => meta,
        None => (domain.clone(), String::new(), None),
    };

    // favicon取得: 多段フォールバック
    let favicon_url = resolve_favicon(&client, page_favicon, &base_url, &domain);

    Ok(UrlInfo {
        title,
        description,
        favicon_url,
    })
}

/// URLからタイトル・説明・faviconを取得
#[tauri::command]
pub fn fetch_url_info(url: String) -> Result<UrlInfo, String> {
    fetch_url_info_impl(url)
}

/// HTTPクライアントを構築
fn build_client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(5))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .unwrap_or_else(|_| reqwest::blocking::Client::new())
}

/// ページHTMLからtitle, description, favicon linkを抽出
fn fetch_page_meta(
    client: &reqwest::blocking::Client,
    url: &str,
) -> Option<(String, String, Option<String>)> {
    let resp = client.get(url).send().ok()?;
    let html = resp.text().ok()?;
    let doc = Html::parse_document(&html);

    // <title>
    let title = Selector::parse("title")
        .ok()
        .and_then(|sel| doc.select(&sel).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|t| !t.is_empty())
        .unwrap_or_default();

    // <meta name="description">
    let description = Selector::parse(r#"meta[name="description"]"#)
        .ok()
        .and_then(|sel| doc.select(&sel).next())
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    // favicon: <link rel="icon"> or <link rel="shortcut icon"> or <link rel="apple-touch-icon">
    let favicon = extract_favicon_from_html(&doc, url);

    Some((
        if title.is_empty() { extract_domain(url) } else { title },
        description,
        favicon,
    ))
}

/// HTMLからfavicon URLを抽出
fn extract_favicon_from_html(doc: &Html, page_url: &str) -> Option<String> {
    // 優先順位: icon > shortcut icon > apple-touch-icon
    let selectors = [
        r#"link[rel="icon"]"#,
        r#"link[rel="shortcut icon"]"#,
        r#"link[rel="apple-touch-icon"]"#,
    ];

    for selector_str in &selectors {
        if let Ok(sel) = Selector::parse(selector_str) {
            if let Some(el) = doc.select(&sel).next() {
                if let Some(href) = el.value().attr("href") {
                    let href = href.trim();
                    if !href.is_empty() {
                        return Some(resolve_url(href, page_url));
                    }
                }
            }
        }
    }
    None
}

/// favicon URLの多段フォールバック解決
fn resolve_favicon(
    client: &reqwest::blocking::Client,
    page_favicon: Option<String>,
    base_url: &str,
    domain: &str,
) -> String {
    // 1. Google Favicon API（最速・高カバレッジ）
    let google_favicon = format!(
        "https://www.google.com/s2/favicons?domain={}&sz=32",
        domain
    );
    if url_is_reachable(client, &google_favicon) {
        return google_favicon;
    }

    // 2. ページHTMLのメタデータから取得したfavicon
    if let Some(ref favicon) = page_favicon {
        if url_is_reachable(client, favicon) {
            return favicon.clone();
        }
    }

    // 3. ドメインルートの /favicon.ico
    let root_favicon = format!("{}/favicon.ico", base_url);
    if url_is_reachable(client, &root_favicon) {
        return root_favicon;
    }

    // 4. ドメインルートHTMLからfavicon取得
    if let Some(meta) = fetch_page_meta(client, base_url) {
        if let Some(favicon) = meta.2 {
            if url_is_reachable(client, &favicon) {
                return favicon;
            }
        }
    }

    // 5. 取得不可 → 空文字（フロントでデフォルトSVGアイコン表示）
    String::new()
}

/// URLがアクセス可能かチェック（HEAD → 200系）
fn url_is_reachable(client: &reqwest::blocking::Client, url: &str) -> bool {
    client
        .head(url)
        .timeout(Duration::from_secs(3))
        .send()
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// 相対URLを絶対URLに変換
fn resolve_url(href: &str, page_url: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        return href.to_string();
    }
    if href.starts_with("//") {
        return format!("https:{}", href);
    }
    let base = extract_base_url(page_url);
    if href.starts_with('/') {
        format!("{}{}", base, href)
    } else {
        format!("{}/{}", base, href)
    }
}

pub fn extract_domain(url: &str) -> String {
    url.split("//")
        .nth(1)
        .unwrap_or(url)
        .split('/')
        .next()
        .unwrap_or(url)
        .split(':')
        .next()
        .unwrap_or(url)
        .to_string()
}

fn extract_base_url(url: &str) -> String {
    if let Some(idx) = url.find("//") {
        let after = &url[idx + 2..];
        if let Some(slash) = after.find('/') {
            return url[..idx + 2 + slash].to_string();
        }
    }
    url.to_string()
}

#[tauri::command]
pub fn get_active_browser_url() -> Result<Option<BrowserInfo>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
            end tell
            if frontApp is "Google Chrome" or frontApp is "Google Chrome Canary" then
                tell application frontApp
                    set tabURL to URL of active tab of front window
                    set tabTitle to title of active tab of front window
                    return tabURL & "||" & tabTitle
                end tell
            else if frontApp is "Safari" then
                tell application "Safari"
                    set tabURL to URL of current tab of front window
                    set tabTitle to name of current tab of front window
                    return tabURL & "||" & tabTitle
                end tell
            else if frontApp is "Arc" then
                tell application "Arc"
                    set tabURL to URL of active tab of front window
                    set tabTitle to title of active tab of front window
                    return tabURL & "||" & tabTitle
                end tell
            else if frontApp is "Firefox" then
                tell application "System Events"
                    tell process "Firefox"
                        return "NONE"
                    end tell
                end tell
            else
                return "NONE"
            end if
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if result == "NONE" || result.is_empty() {
                return Ok(None);
            }
            if let Some((url, title)) = result.split_once("||") {
                return Ok(Some(BrowserInfo {
                    url: url.to_string(),
                    title: title.to_string(),
                }));
            }
        }

        Ok(None)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(None)
    }
}
