use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::db::AppDb;

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
    db: State<'_, Mutex<AppDb>>,
    category_id: Option<String>,
    filter: Option<String>,
) -> Result<Vec<Link>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
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

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let links = stmt
        .query_map(params_refs.as_slice(), row_to_link)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(links)
}

#[tauri::command]
pub fn create_link(
    db: State<'_, Mutex<AppDb>>,
    input: CreateLinkInput,
) -> Result<Link, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO links (id, url, title, description, category_id, is_temporary, expires_at, is_pinned)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            input.url,
            input.title,
            input.description.unwrap_or_default(),
            input.category_id,
            input.is_temporary.unwrap_or(false) as i64,
            input.expires_at,
            input.is_pinned.unwrap_or(false) as i64,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM links WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let link = stmt
        .query_row(params![id], row_to_link)
        .map_err(|e| e.to_string())?;

    Ok(link)
}

#[tauri::command]
pub fn update_link(
    db: State<'_, Mutex<AppDb>>,
    input: UpdateLinkInput,
) -> Result<Link, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
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
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM links WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let link = stmt
        .query_row(params![input.id], row_to_link)
        .map_err(|e| e.to_string())?;

    Ok(link)
}

#[tauri::command]
pub fn delete_link(
    db: State<'_, Mutex<AppDb>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;
    conn.execute("DELETE FROM links WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_links(
    db: State<'_, Mutex<AppDb>>,
    query: String,
) -> Result<Vec<Link>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;

    if query.trim().is_empty() {
        // 空クエリ: ピン留め + 最近 + 高頻度
        let mut stmt = conn
            .prepare(
                "SELECT * FROM links WHERE is_pinned = 1
                 UNION ALL
                 SELECT * FROM links WHERE is_pinned = 0 ORDER BY last_visited_at DESC LIMIT 10",
            )
            .map_err(|e| e.to_string())?;
        let links = stmt
            .query_map([], row_to_link)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        return Ok(links);
    }

    // FTS5 検索（前方一致）
    let fts_query = query
        .split_whitespace()
        .map(|w| format!("{}*", w))
        .collect::<Vec<_>>()
        .join(" ");

    let mut stmt = conn
        .prepare(
            "SELECT l.* FROM links_fts fts
             JOIN links l ON l.rowid = fts.rowid
             WHERE links_fts MATCH ?1
             ORDER BY
                (fts.rank * -1.0) * 0.5 +
                (CASE WHEN l.visit_count > 0 THEN log(l.visit_count + 1) * 0.3 ELSE 0 END) +
                (CASE WHEN l.last_visited_at IS NOT NULL
                    THEN (julianday('now') - julianday(l.last_visited_at)) * -0.02 * 0.2
                    ELSE 0 END)
             DESC
             LIMIT 20",
        )
        .map_err(|e| e.to_string())?;

    let fts_results: Vec<Link> = stmt
        .query_map(params![fts_query], row_to_link)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if !fts_results.is_empty() {
        return Ok(fts_results);
    }

    // フォールバック: LIKE検索
    let like_pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM links
             WHERE title LIKE ?1 OR url LIKE ?1 OR description LIKE ?1
             ORDER BY visit_count DESC, last_visited_at DESC
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
    db: State<'_, Mutex<AppDb>>,
    id: String,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
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
    db: State<'_, Mutex<AppDb>>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
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
