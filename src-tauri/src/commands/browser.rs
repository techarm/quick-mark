use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct BrowserInfo {
    pub url: String,
    pub title: String,
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
                        -- Firefox does not support AppleScript well
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
