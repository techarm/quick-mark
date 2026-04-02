mod commands;
mod db;
mod server;

use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{Manager, RunEvent, WindowEvent};
#[cfg(target_os = "macos")]
use std::time::Duration;

use commands::browser::*;
use commands::categories::*;
use commands::credentials::*;
use commands::export::*;
use commands::import::*;
use commands::links::*;
use commands::workspaces::*;

fn ensure_api_token(app_data_dir: &std::path::Path) -> Result<String, String> {
    let token_path = app_data_dir.join("api_token");
    if token_path.exists() {
        std::fs::read_to_string(&token_path)
            .map(|s| s.trim().to_string())
            .map_err(|e| format!("Failed to read API token: {}", e))
    } else {
        let token = uuid::Uuid::new_v4().to_string();
        std::fs::write(&token_path, &token)
            .map_err(|e| format!("Failed to write API token: {}", e))?;
        Ok(token)
    }
}

#[tauri::command]
fn get_api_token(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    ensure_api_token(&app_data_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 検索ウィンドウ非表示時刻を記録（Reopenイベントの誤発火防止用）
    let search_hidden_at: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));
    let search_hidden_at_for_event = Arc::clone(&search_hidden_at);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            let db_path = db::get_db_path(&app.handle())
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;
            let app_db = db::init_db(&db_path)
                .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;

            let app_data_dir = app
                .handle()
                .path()
                .app_data_dir()
                .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;

            let db = Arc::new(Mutex::new(app_db));

            // APIトークン生成/読み込み
            let token = ensure_api_token(&app_data_dir)
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;

            // HTTPサーバーを作成・起動（シャットダウンチャネル付き）
            let (shutdown_tx, shutdown_rx) = mpsc::channel();
            app.manage(shutdown_tx);

            if let Some(http_server) = server::create_server(&app_data_dir) {
                let server_db = Arc::clone(&db);
                let server_app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    server::run_server(&http_server, server_db, token, server_app_handle, shutdown_rx);
                });
            }

            app.manage(db);

            // Windows: ネイティブタイトルバーを無効化（カスタムタイトルバーを使用）
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_decorations(false);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // リンク
            get_links,
            create_link,
            update_link,
            delete_link,
            search_links,
            open_link,
            cleanup_expired_links,
            get_link_counts,
            get_links_without_favicon,
            refresh_single_favicon,
            move_links_to_category,
            bulk_delete_links,
            // ブラウザ
            get_active_browser_url,
            fetch_url_info,
            // Favicon一括更新
            refresh_favicons,
            // インポート
            parse_bookmarks_html,
            parse_json_links,
            import_bookmarks,
            // カテゴリ
            get_categories,
            create_category,
            update_category,
            delete_category,
            // エクスポート
            export_data,
            // 重複チェック
            check_duplicate_url,
            check_duplicate_urls,
            // 認証情報
            get_credentials,
            create_credential,
            update_credential,
            delete_credential,
            search_credentials,
            copy_credential_password,
            copy_credential_field,
            clear_clipboard,
            // ワークスペース
            get_workspaces,
            create_workspace,
            update_workspace,
            delete_workspace,
            get_active_workspace_id,
            set_active_workspace_id,
            // 設定
            get_api_token,
        ])
        .on_window_event(move |window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // macOS: メインウィンドウは閉じる代わりに非表示（Dockから再表示可能）
                    #[cfg(target_os = "macos")]
                    if window.label() == "main" {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    // Windows: メインウィンドウ閉鎖時にsearch-paletteも閉じる
                    #[cfg(not(target_os = "macos"))]
                    {
                        let _ = api;
                        if window.label() == "main" {
                            if let Some(search) = window.app_handle().get_webview_window("search-palette") {
                                let _ = search.destroy();
                            }
                        }
                    }
                }
                WindowEvent::Focused(focused) => {
                    // 検索ウィンドウ: フォーカスを失ったら自動非表示（Spotlight風）
                    if !focused && window.label() == "search-palette" {
                        let _ = window.hide();
                        *search_hidden_at_for_event.lock().unwrap() = Some(Instant::now());
                    }
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app, _event| {
            // macOS: Dockアイコンクリックでメインウィンドウを再表示
            #[cfg(target_os = "macos")]
            if let RunEvent::Reopen { .. } = _event {
                // 検索ウィンドウ非表示から500ms以内は無視（フォーカス移動による誤発火防止）
                let skip = search_hidden_at
                    .lock()
                    .unwrap()
                    .map(|t| t.elapsed() < Duration::from_millis(500))
                    .unwrap_or(false);
                if !skip {
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }

            // 全ウィンドウ閉鎖後、HTTPサーバーにシャットダウンシグナルを送信
            if matches!(_event, RunEvent::ExitRequested { .. }) {
                if let Some(tx) = _app.try_state::<mpsc::Sender<()>>() {
                    let _ = tx.send(());
                }
            }
        });
}
