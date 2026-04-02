use rusqlite::params;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::db::AppDb;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportItem {
    pub url: String,
    pub title: String,
    pub folder: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub imported: i64,
    pub skipped: i64,
    pub categories_created: i64,
}

/// JSONファイルの内容を解析してインポートアイテムを返す
/// 対応形式:
/// 1. [{ "url": "...", "title": "...", "folder": "..." }, ...]
/// 2. [{ "url": "...", "name": "...", "category": "..." }, ...]
/// 3. [{ "link": "...", "title": "..." }, ...]
#[tauri::command]
pub fn parse_json_links(content: String) -> Result<Vec<ImportItem>, String> {
    let parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON解析エラー: {}", e))?;

    let arr = parsed
        .as_array()
        .ok_or("JSONはリンクの配列である必要があります")?;

    let mut items = Vec::new();

    for (i, item) in arr.iter().enumerate() {
        let obj = item
            .as_object()
            .ok_or(format!("{}番目の要素がオブジェクトではありません", i + 1))?;

        // URL: "url" or "link" or "href"
        let url = obj
            .get("url")
            .or_else(|| obj.get("link"))
            .or_else(|| obj.get("href"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if url.is_empty() || !url.starts_with("http") {
            continue;
        }

        // タイトル: "title" or "name" or "label"（なければURLをタイトルに）
        let title = obj
            .get("title")
            .or_else(|| obj.get("name"))
            .or_else(|| obj.get("label"))
            .and_then(|v| v.as_str())
            .unwrap_or(&url)
            .to_string();

        // フォルダ: "folder" or "category" or "group"
        let folder = obj
            .get("folder")
            .or_else(|| obj.get("category"))
            .or_else(|| obj.get("group"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        items.push(ImportItem {
            url,
            title,
            folder,
        });
    }

    if items.is_empty() {
        return Err("有効なリンクが見つかりませんでした".to_string());
    }

    Ok(items)
}

/// ブックマークHTMLファイルの内容を解析してインポートアイテムを返す
#[tauri::command]
pub fn parse_bookmarks_html(content: String) -> Result<Vec<ImportItem>, String> {
    let document = Html::parse_document(&content);
    let a_selector = Selector::parse("a").map_err(|e| format!("Selector error: {:?}", e))?;

    let mut items = Vec::new();

    // DT > H3 でフォルダ名を取得し、その下のリンクにフォルダ名を付与
    // シンプルなアプローチ: すべての<a>タグからリンクを抽出
    for element in document.select(&a_selector) {
        let url = element.value().attr("href").unwrap_or("").to_string();
        if url.is_empty() || !url.starts_with("http") {
            continue;
        }

        let title = element.text().collect::<String>().trim().to_string();
        if title.is_empty() {
            continue;
        }

        // 親のフォルダ名を取得（最も近い<DT>の前にある<H3>）
        let folder = element
            .parent()
            .and_then(|parent| {
                parent.prev_siblings().find_map(|sibling| {
                    let node = scraper::ElementRef::wrap(sibling)?;
                    if node.value().name() == "h3" {
                        Some(node.text().collect::<String>().trim().to_string())
                    } else {
                        None
                    }
                })
            })
            .or_else(|| {
                // フォルダ名が見つからない場合、直接の親DL内のH3を探す
                element.parent().and_then(|p| {
                    p.parent().and_then(|dl| {
                        dl.prev_siblings().find_map(|s| {
                            let node = scraper::ElementRef::wrap(s)?;
                            if node.value().name() == "h3" {
                                Some(node.text().collect::<String>().trim().to_string())
                            } else {
                                None
                            }
                        })
                    })
                })
            });

        items.push(ImportItem {
            url,
            title,
            folder,
        });
    }

    Ok(items)
}

/// インポートアイテムをデータベースに保存（トランザクション使用）
#[tauri::command]
pub fn import_bookmarks(
    db: State<'_, Arc<Mutex<AppDb>>>,
    items: Vec<ImportItem>,
    workspace_id: Option<String>,
) -> Result<ImportResult, String> {
    let mut db = db.lock().map_err(|e| format!("Import operation failed: {}", e))?;
    let tx = db.conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut imported = 0i64;
    let mut skipped = 0i64;
    let mut categories_created = 0i64;

    // フォルダ名→カテゴリIDのキャッシュ
    let mut folder_cache: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    // 重複チェック用のprepared statement（ワークスペーススコープ）
    let mut dup_stmt = if workspace_id.is_some() {
        tx.prepare("SELECT 1 FROM links WHERE url = ?1 AND workspace_id = ?2 LIMIT 1")
            .map_err(|e| format!("Import operation failed: {}", e))?
    } else {
        tx.prepare("SELECT 1 FROM links WHERE url = ?1 LIMIT 1")
            .map_err(|e| format!("Import operation failed: {}", e))?
    };

    for item in &items {
        // URLバリデーション（http/httpsのみ許可）
        if let Ok(parsed) = url::Url::parse(&item.url) {
            if parsed.scheme() != "http" && parsed.scheme() != "https" {
                skipped += 1;
                continue;
            }
        } else {
            skipped += 1;
            continue;
        }

        // URLの重複チェック（ワークスペーススコープ）
        let exists: bool = if let Some(ref ws_id) = workspace_id {
            dup_stmt
                .query_row(params![item.url, ws_id], |_| Ok(true))
                .unwrap_or(false)
        } else {
            dup_stmt
                .query_row(params![item.url], |_| Ok(true))
                .unwrap_or(false)
        };

        if exists {
            skipped += 1;
            continue;
        }

        // フォルダがある場合、カテゴリを取得または作成
        let category_id = if let Some(ref folder_name) = item.folder {
            if let Some(cached_id) = folder_cache.get(folder_name) {
                Some(cached_id.clone())
            } else {
                // 既存カテゴリを検索（ワークスペーススコープ）
                let existing: Option<String> = if let Some(ref ws_id) = workspace_id {
                    tx.query_row(
                        "SELECT id FROM categories WHERE name = ?1 AND workspace_id = ?2",
                        params![folder_name, ws_id],
                        |row| row.get(0),
                    )
                    .ok()
                } else {
                    tx.query_row(
                        "SELECT id FROM categories WHERE name = ?1",
                        params![folder_name],
                        |row| row.get(0),
                    )
                    .ok()
                };

                if let Some(id) = existing {
                    folder_cache.insert(folder_name.clone(), id.clone());
                    Some(id)
                } else {
                    // 新規カテゴリ作成
                    let id = uuid::Uuid::new_v4().to_string();
                    let path = format!("/{}", id);
                    tx.execute(
                        "INSERT INTO categories (id, name, path, workspace_id) VALUES (?1, ?2, ?3, ?4)",
                        params![id, folder_name, path, workspace_id],
                    )
                    .map_err(|e| format!("Import operation failed: {}", e))?;
                    folder_cache.insert(folder_name.clone(), id.clone());
                    categories_created += 1;
                    Some(id)
                }
            }
        } else {
            None
        };

        // リンクを作成
        let link_id = uuid::Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO links (id, url, title, category_id, workspace_id) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![link_id, item.url, item.title, category_id, workspace_id],
        )
        .map_err(|e| format!("Import operation failed: {}", e))?;

        imported += 1;
    }

    // prepared statementをdropしてからcommit
    drop(dup_stmt);
    tx.commit().map_err(|e| format!("Failed to commit import: {}", e))?;

    Ok(ImportResult {
        imported,
        skipped,
        categories_created,
    })
}
