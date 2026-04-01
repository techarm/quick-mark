use rusqlite::params;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::db::AppDb;

#[derive(Debug, Serialize)]
pub struct ExportCategory {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub path: String,
    pub icon: String,
    pub color: String,
    pub search_alias: String,
    pub position: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ExportLink {
    pub id: String,
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub favicon_url: Option<String>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub is_temporary: bool,
    pub expires_at: Option<String>,
    pub is_pinned: bool,
    pub visit_count: i64,
    pub last_visited_at: Option<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ExportData {
    pub version: i32,
    pub exported_at: String,
    pub app: String,
    pub categories: Vec<ExportCategory>,
    pub links: Vec<ExportLink>,
}

fn map_export_category(row: &rusqlite::Row) -> rusqlite::Result<ExportCategory> {
    Ok(ExportCategory {
        id: row.get(0)?,
        name: row.get(1)?,
        parent_id: row.get(2)?,
        path: row.get(3)?,
        icon: row.get(4)?,
        color: row.get(5)?,
        search_alias: row.get(6)?,
        position: row.get(7)?,
        created_at: row.get(8)?,
    })
}

fn map_export_link(row: &rusqlite::Row) -> rusqlite::Result<ExportLink> {
    Ok(ExportLink {
        id: row.get(0)?,
        url: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        favicon_url: row.get(4)?,
        category_id: row.get(5)?,
        category_name: row.get(6)?,
        is_temporary: row.get(7)?,
        expires_at: row.get(8)?,
        is_pinned: row.get(9)?,
        visit_count: row.get(10)?,
        last_visited_at: row.get(11)?,
        position: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}

#[tauri::command]
pub fn export_data(
    db: State<'_, Arc<Mutex<AppDb>>>,
    workspace_id: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| format!("Export operation failed: {}", e))?;
    let conn = &db.conn;

    let categories: Vec<ExportCategory> = if let Some(ref ws_id) = workspace_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, parent_id, path, icon, color, search_alias, position, created_at
                 FROM categories WHERE workspace_id = ?1 ORDER BY position, name",
            )
            .map_err(|e| format!("Export operation failed: {}", e))?;
        let result = stmt.query_map(params![ws_id], map_export_category)
            .map_err(|e| format!("Export operation failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();
        result
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, parent_id, path, icon, color, search_alias, position, created_at
                 FROM categories ORDER BY position, name",
            )
            .map_err(|e| format!("Export operation failed: {}", e))?;
        let result = stmt.query_map(params![], map_export_category)
            .map_err(|e| format!("Export operation failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();
        result
    };

    let links: Vec<ExportLink> = if let Some(ref ws_id) = workspace_id {
        let mut stmt = conn
            .prepare(
                "SELECT l.id, l.url, l.title, l.description, l.favicon_url,
                        l.category_id, c.name as category_name,
                        l.is_temporary, l.expires_at, l.is_pinned,
                        l.visit_count, l.last_visited_at, l.position,
                        l.created_at, l.updated_at
                 FROM links l
                 LEFT JOIN categories c ON l.category_id = c.id
                 WHERE l.workspace_id = ?1
                 ORDER BY l.position, l.created_at DESC",
            )
            .map_err(|e| format!("Export operation failed: {}", e))?;
        let result = stmt.query_map(params![ws_id], map_export_link)
            .map_err(|e| format!("Export operation failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();
        result
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT l.id, l.url, l.title, l.description, l.favicon_url,
                        l.category_id, c.name as category_name,
                        l.is_temporary, l.expires_at, l.is_pinned,
                        l.visit_count, l.last_visited_at, l.position,
                        l.created_at, l.updated_at
                 FROM links l
                 LEFT JOIN categories c ON l.category_id = c.id
                 ORDER BY l.position, l.created_at DESC",
            )
            .map_err(|e| format!("Export operation failed: {}", e))?;
        let result = stmt.query_map(params![], map_export_link)
            .map_err(|e| format!("Export operation failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();
        result
    };

    let now: String = conn
        .query_row("SELECT datetime('now')", [], |row| row.get(0))
        .map_err(|e| format!("Export operation failed: {}", e))?;
    let export = ExportData {
        version: 1,
        exported_at: now,
        app: "QuickMark".to_string(),
        categories,
        links,
    };

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}
