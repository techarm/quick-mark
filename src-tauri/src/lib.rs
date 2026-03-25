mod commands;
mod db;

use std::sync::Mutex;
use tauri::{Manager, RunEvent, WindowEvent};

use commands::browser::*;
use commands::categories::*;
use commands::export::*;
use commands::import::*;
use commands::links::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let db_path = db::get_db_path(&app.handle());
            let app_db = db::init_db(&db_path).expect("Failed to initialize database");
            app.manage(Mutex::new(app_db));
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
        ])
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // メインウィンドウ: 閉じる代わりに非表示（macOSスタイル）
                    if window.label() == "main" {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
                WindowEvent::Focused(focused) => {
                    // 検索ウィンドウ: フォーカスを失ったら自動非表示（Spotlight風）
                    if !focused && window.label() == "search-palette" {
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS: Dockアイコンクリックでメインウィンドウを再表示
            if let RunEvent::Reopen { .. } = event {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
