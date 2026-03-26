use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::commands::browser::extract_domain;
use crate::db::AppDb;

/// URLを検証する。http/httpsスキームのみ許可。
fn validate_url(url: &str) -> Result<(), String> {
    let parsed = url::Url::parse(url)
        .map_err(|_| format!("無効なURLです: {}", url))?;
    match parsed.scheme() {
        "http" | "https" => Ok(()),
        scheme => Err(format!("許可されていないURLスキームです: {}", scheme)),
    }
}

/// 文字列の長さを検証する。
fn validate_length(field: &str, value: &str, max: usize) -> Result<(), String> {
    if value.len() > max {
        Err(format!("{}は{}文字以内にしてください", field, max))
    } else {
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Link {
    pub id: String,
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub favicon_url: Option<String>,
    pub category_id: Option<String>,
    pub is_temporary: bool,
    pub expires_at: Option<String>,
    pub visit_count: i64,
    pub last_visited_at: Option<String>,
    pub is_pinned: bool,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkInput {
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub favicon_url: Option<String>,
    pub category_id: Option<String>,
    pub is_temporary: Option<bool>,
    pub expires_at: Option<String>,
    pub is_pinned: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLinkInput {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub favicon_url: Option<String>,
    pub category_id: Option<String>,
    pub is_temporary: Option<bool>,
    pub expires_at: Option<String>,
    pub is_pinned: Option<bool>,
}

fn row_to_link(row: &rusqlite::Row) -> rusqlite::Result<Link> {
    Ok(Link {
        id: row.get("id")?,
        url: row.get("url")?,
        title: row.get("title")?,
        description: row.get("description")?,
        favicon_url: row.get("favicon_url")?,
        category_id: row.get("category_id")?,
        is_temporary: row.get::<_, i64>("is_temporary")? != 0,
        expires_at: row.get("expires_at")?,
        visit_count: row.get("visit_count")?,
        last_visited_at: row.get("last_visited_at")?,
        is_pinned: row.get::<_, i64>("is_pinned")? != 0,
        position: row.get("position")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

#[tauri::command]
pub fn get_links(
    db: State<'_, Arc<Mutex<AppDb>>>,
    category_id: Option<String>,
    filter: Option<String>,
) -> Result<Vec<Link>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let (sql, filter_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match filter
        .as_deref()
    {
        Some("recent") => (
            "SELECT * FROM links ORDER BY created_at DESC LIMIT 50".to_string(),
            vec![],
        ),
        Some("temporary") => (
            "SELECT * FROM links WHERE is_temporary = 1 ORDER BY expires_at ASC".to_string(),
            vec![],
        ),
        Some("expired") => (
            "SELECT * FROM links WHERE is_temporary = 1 AND expires_at < datetime('now') ORDER BY expires_at DESC"
                .to_string(),
            vec![],
        ),
        Some("pinned") => (
            "SELECT * FROM links WHERE is_pinned = 1 ORDER BY position ASC".to_string(),
            vec![],
        ),
        _ => {
            if let Some(ref cat_id) = category_id {
                (
                    "SELECT * FROM links WHERE category_id = ?1 ORDER BY position ASC, created_at DESC"
                        .to_string(),
                    vec![Box::new(cat_id.clone()) as Box<dyn rusqlite::types::ToSql>],
                )
            } else {
                (
                    "SELECT * FROM links ORDER BY created_at DESC".to_string(),
                    vec![],
                )
            }
        }
    };

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        filter_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare query: {}", e))?;
    let links = stmt
        .query_map(params_refs.as_slice(), row_to_link)
        .map_err(|e| format!("Failed to get links: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(links)
}

pub fn create_link_impl(conn: &Connection, input: CreateLinkInput) -> Result<Link, String> {
    validate_url(&input.url)?;
    validate_length("タイトル", &input.title, 500)?;
    if let Some(ref desc) = input.description {
        validate_length("説明", desc, 2000)?;
    }

    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO links (id, url, title, description, favicon_url, category_id, is_temporary, expires_at, is_pinned)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            input.url,
            input.title,
            input.description.unwrap_or_default(),
            input.favicon_url.unwrap_or_default(),
            input.category_id,
            input.is_temporary.unwrap_or(false) as i64,
            input.expires_at,
            input.is_pinned.unwrap_or(false) as i64,
        ],
    )
    .map_err(|e| format!("Failed to create link: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM links WHERE id = ?1")
        .map_err(|e| format!("Failed to query link: {}", e))?;
    let link = stmt
        .query_row(params![id], row_to_link)
        .map_err(|e| format!("Failed to read created link: {}", e))?;

    Ok(link)
}

#[tauri::command]
pub fn create_link(
    db: State<'_, Arc<Mutex<AppDb>>>,
    input: CreateLinkInput,
) -> Result<Link, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    create_link_impl(&db.conn, input)
}

#[tauri::command]
pub fn update_link(
    db: State<'_, Arc<Mutex<AppDb>>>,
    input: UpdateLinkInput,
) -> Result<Link, String> {
    if let Some(ref url) = input.url {
        validate_url(url)?;
    }
    if let Some(ref title) = input.title {
        validate_length("タイトル", title, 500)?;
    }
    if let Some(ref desc) = input.description {
        validate_length("説明", desc, 2000)?;
    }

    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut sets = vec!["updated_at = datetime('now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];
    let mut idx = 1;

    macro_rules! add_field {
        ($field:expr, $val:expr) => {
            if let Some(v) = $val {
                sets.push(format!("{} = ?{}", $field, idx));
                values.push(Box::new(v));
                idx += 1;
            }
        };
    }

    add_field!("url", input.url);
    add_field!("title", input.title);
    add_field!("description", input.description);
    add_field!("favicon_url", input.favicon_url);
    add_field!("category_id", input.category_id);
    add_field!("is_temporary", input.is_temporary.map(|b| b as i64));
    add_field!("expires_at", input.expires_at);
    add_field!("is_pinned", input.is_pinned.map(|b| b as i64));

    let sql = format!(
        "UPDATE links SET {} WHERE id = ?{}",
        sets.join(", "),
        idx
    );
    values.push(Box::new(input.id.clone()));

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        values.iter().map(|p| p.as_ref()).collect();

    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Failed to update link: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM links WHERE id = ?1")
        .map_err(|e| format!("Failed to query link: {}", e))?;
    let link = stmt
        .query_row(params![input.id], row_to_link)
        .map_err(|e| format!("Failed to read updated link: {}", e))?;

    Ok(link)
}

#[tauri::command]
pub fn delete_link(
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;
    conn.execute("DELETE FROM links WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete link: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn search_links(
    db: State<'_, Arc<Mutex<AppDb>>>,
    query: String,
) -> Result<Vec<Link>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    if query.trim().is_empty() {
        // 空クエリ: ピン留め + 最近アクセス
        let mut pinned_stmt = conn
            .prepare("SELECT * FROM links WHERE is_pinned = 1 ORDER BY position, created_at DESC")
            .map_err(|e| e.to_string())?;
        let mut pinned: Vec<Link> = pinned_stmt
            .query_map([], row_to_link)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut recent_stmt = conn
            .prepare("SELECT * FROM links WHERE is_pinned = 0 ORDER BY last_visited_at DESC, created_at DESC LIMIT 10")
            .map_err(|e| e.to_string())?;
        let recent: Vec<Link> = recent_stmt
            .query_map([], row_to_link)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        pinned.extend(recent);
        return Ok(pinned);
    }

    // FTS5 検索（前方一致） — 失敗時はLIKEにフォールバック
    let fts_query = query
        .split_whitespace()
        .map(|w| format!("{}*", w))
        .collect::<Vec<_>>()
        .join(" ");

    let fts_results: Result<Vec<Link>, String> = (|| {
        let mut stmt = conn
            .prepare(
                "SELECT l.* FROM links_fts fts
                 JOIN links l ON l.rowid = fts.rowid
                 WHERE links_fts MATCH ?1
                 ORDER BY
                    (fts.rank * -1.0) * 0.5 +
                    (CASE WHEN l.visit_count > 0 THEN l.visit_count * 0.15 ELSE 0 END) +
                    (CASE WHEN l.last_visited_at IS NOT NULL
                        THEN (julianday('now') - julianday(l.last_visited_at)) * -0.02
                        ELSE 0 END)
                 DESC
                 LIMIT 20",
            )
            .map_err(|e| e.to_string())?;

        let results: Vec<Link> = stmt
            .query_map(params![fts_query], row_to_link)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        Ok(results)
    })();

    match fts_results {
        Ok(results) if !results.is_empty() => return Ok(results),
        _ => {} // FTS5失敗またはゼロ件 → LIKEフォールバック
    }

    // フォールバック: LIKE検索（カテゴリ名+エイリアスも対象）
    let like_pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT l.* FROM links l
             LEFT JOIN categories c ON l.category_id = c.id
             WHERE l.title LIKE ?1 COLLATE NOCASE
                OR l.url LIKE ?1 COLLATE NOCASE
                OR l.description LIKE ?1 COLLATE NOCASE
                OR c.name LIKE ?1 COLLATE NOCASE
                OR c.search_alias LIKE ?1 COLLATE NOCASE
             ORDER BY l.visit_count DESC, l.last_visited_at DESC
             LIMIT 20",
        )
        .map_err(|e| e.to_string())?;

    let links = stmt
        .query_map(params![like_pattern], row_to_link)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(links)
}

#[tauri::command]
pub fn open_link(
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    // アクセス回数と最終アクセス時刻を更新
    conn.execute(
        "UPDATE links SET visit_count = visit_count + 1, last_visited_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    let url: String = conn
        .query_row("SELECT url FROM links WHERE id = ?1", params![id], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

    Ok(url)
}

#[tauri::command]
pub fn cleanup_expired_links(
    db: State<'_, Arc<Mutex<AppDb>>>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    // 7日以上前に期限切れになったリンクを削除
    let deleted = conn
        .execute(
            "DELETE FROM links WHERE is_temporary = 1 AND expires_at < datetime('now', '-7 days')",
            [],
        )
        .map_err(|e| e.to_string())?;

    Ok(deleted as i64)
}

/// favicon_urlが空のリンクIDリストを取得
#[tauri::command]
pub fn get_links_without_favicon(
    db: State<'_, Arc<Mutex<AppDb>>>,
) -> Result<Vec<(String, String)>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut stmt = conn
        .prepare("SELECT id, url FROM links WHERE favicon_url IS NULL OR favicon_url = ''")
        .map_err(|e| e.to_string())?;

    let links = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(links)
}

/// 1件のリンクのfaviconを取得して更新
#[tauri::command]
pub fn refresh_single_favicon(
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
    favicon_url: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    conn.execute(
        "UPDATE links SET favicon_url = ?1 WHERE id = ?2",
        params![favicon_url, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 後方互換: 簡易版（Google Favicon APIのみ）
#[tauri::command]
pub fn refresh_favicons(
    db: State<'_, Arc<Mutex<AppDb>>>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut stmt = conn
        .prepare("SELECT id, url FROM links WHERE favicon_url IS NULL OR favicon_url = ''")
        .map_err(|e| e.to_string())?;

    let links: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut updated = 0i64;
    for (id, url) in &links {
        let domain = extract_domain(url);
        let favicon_url = format!("https://www.google.com/s2/favicons?domain={}&sz=32", domain);
        conn.execute(
            "UPDATE links SET favicon_url = ?1 WHERE id = ?2",
            params![favicon_url, id],
        )
        .map_err(|e| e.to_string())?;
        updated += 1;
    }

    Ok(updated)
}

/// 複数リンクを別カテゴリに一括移動
#[tauri::command]
pub fn move_links_to_category(
    db: State<'_, Arc<Mutex<AppDb>>>,
    link_ids: Vec<String>,
    category_id: Option<String>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    if link_ids.is_empty() {
        return Ok(0);
    }

    let placeholders: Vec<String> = (0..link_ids.len()).map(|i| format!("?{}", i + 2)).collect();
    let sql = format!(
        "UPDATE links SET category_id = ?1, updated_at = datetime('now') WHERE id IN ({})",
        placeholders.join(", ")
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(category_id)];
    for id in &link_ids {
        param_values.push(Box::new(id.clone()));
    }
    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let moved = conn
        .execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Failed to move links: {}", e))?;

    Ok(moved as i64)
}

/// 複数リンクを一括削除
#[tauri::command]
pub fn bulk_delete_links(
    db: State<'_, Arc<Mutex<AppDb>>>,
    link_ids: Vec<String>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    if link_ids.is_empty() {
        return Ok(0);
    }

    let placeholders: Vec<String> = (0..link_ids.len()).map(|i| format!("?{}", i + 1)).collect();
    let sql = format!(
        "DELETE FROM links WHERE id IN ({})",
        placeholders.join(", ")
    );

    let param_values: Vec<Box<dyn rusqlite::types::ToSql>> =
        link_ids.iter().map(|id| Box::new(id.clone()) as Box<dyn rusqlite::types::ToSql>).collect();
    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let deleted = conn
        .execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Failed to bulk delete links: {}", e))?;

    Ok(deleted as i64)
}

// === 重複URL検知 ===

#[derive(Debug, Serialize)]
pub struct DuplicateInfo {
    pub id: String,
    pub url: String,
    pub title: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
}

pub fn check_duplicate_url_impl(conn: &Connection, url: &str) -> Result<Option<DuplicateInfo>, String> {
    let result = conn.query_row(
        "SELECT l.id, l.url, l.title, l.category_id, c.name
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.url = ?1
         LIMIT 1",
        params![url],
        |row| {
            Ok(DuplicateInfo {
                id: row.get(0)?,
                url: row.get(1)?,
                title: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
            })
        },
    );

    match result {
        Ok(info) => Ok(Some(info)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// 単一URLの重複チェック
#[tauri::command]
pub fn check_duplicate_url(
    db: State<'_, Arc<Mutex<AppDb>>>,
    url: String,
) -> Result<Option<DuplicateInfo>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    check_duplicate_url_impl(&db.conn, &url)
}

/// 複数URLの一括重複チェック（インポート用）
#[tauri::command]
pub fn check_duplicate_urls(
    db: State<'_, Arc<Mutex<AppDb>>>,
    urls: Vec<String>,
) -> Result<Vec<String>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut duplicates = Vec::new();
    let mut stmt = conn
        .prepare("SELECT 1 FROM links WHERE url = ?1 LIMIT 1")
        .map_err(|e| e.to_string())?;

    for url in &urls {
        let exists: bool = stmt
            .query_row(params![url], |_| Ok(true))
            .unwrap_or(false);
        if exists {
            duplicates.push(url.clone());
        }
    }

    Ok(duplicates)
}
