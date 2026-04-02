use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::db::AppDb;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub position: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkspaceInput {
    pub id: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub position: Option<i64>,
}

fn row_to_workspace(row: &rusqlite::Row) -> rusqlite::Result<Workspace> {
    Ok(Workspace {
        id: row.get("id")?,
        name: row.get("name")?,
        icon: row.get("icon")?,
        color: row.get("color")?,
        position: row.get("position")?,
        created_at: row.get("created_at")?,
    })
}

pub fn get_active_workspace_id_impl(conn: &Connection) -> Result<String, String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = 'active_workspace_id'",
        [],
        |row| row.get(0),
    )
    .map_err(|e| format!("Failed to get active workspace: {}", e))
}

#[tauri::command]
pub fn get_workspaces(
    db: State<'_, Arc<Mutex<AppDb>>>,
) -> Result<Vec<Workspace>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut stmt = conn
        .prepare("SELECT * FROM workspaces ORDER BY position ASC, created_at ASC")
        .map_err(|e| format!("Failed to get workspaces: {}", e))?;

    let workspaces = stmt
        .query_map([], row_to_workspace)
        .map_err(|e| format!("Failed to get workspaces: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(workspaces)
}

#[tauri::command]
pub fn create_workspace(
    db: State<'_, Arc<Mutex<AppDb>>>,
    input: CreateWorkspaceInput,
) -> Result<Workspace, String> {
    if input.name.trim().is_empty() {
        return Err("ワークスペース名は必須です".to_string());
    }
    if input.name.len() > 100 {
        return Err("ワークスペース名は100文字以内にしてください".to_string());
    }

    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;
    let id = uuid::Uuid::new_v4().to_string();

    let max_pos: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM workspaces",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO workspaces (id, name, icon, color, position) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            id,
            input.name,
            input.icon.unwrap_or_else(|| "briefcase".to_string()),
            input.color.unwrap_or_else(|| "#6366F1".to_string()),
            max_pos + 1,
        ],
    )
    .map_err(|e| format!("Failed to create workspace: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM workspaces WHERE id = ?1")
        .map_err(|e| format!("Failed to query workspace: {}", e))?;
    let workspace = stmt
        .query_row(params![id], row_to_workspace)
        .map_err(|e| format!("Failed to read created workspace: {}", e))?;

    Ok(workspace)
}

#[tauri::command]
pub fn update_workspace(
    db: State<'_, Arc<Mutex<AppDb>>>,
    input: UpdateWorkspaceInput,
) -> Result<Workspace, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut sets = vec![];
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

    add_field!("name", input.name);
    add_field!("icon", input.icon);
    add_field!("color", input.color);
    add_field!("position", input.position);

    if !sets.is_empty() {
        let sql = format!(
            "UPDATE workspaces SET {} WHERE id = ?{}",
            sets.join(", "),
            idx
        );
        values.push(Box::new(input.id.clone()));
        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            values.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())
            .map_err(|e| format!("Failed to update workspace: {}", e))?;
    }

    let mut stmt = conn
        .prepare("SELECT * FROM workspaces WHERE id = ?1")
        .map_err(|e| format!("Failed to query workspace: {}", e))?;
    let workspace = stmt
        .query_row(params![input.id], row_to_workspace)
        .map_err(|e| format!("Failed to read updated workspace: {}", e))?;

    Ok(workspace)
}

#[tauri::command]
pub fn delete_workspace(
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    // 最後の1つは削除不可
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
        .map_err(|e| format!("DB error: {}", e))?;

    if count <= 1 {
        return Err("最後のワークスペースは削除できません".to_string());
    }

    // ワークスペース内のデータを削除
    conn.execute("DELETE FROM links WHERE workspace_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete workspace links: {}", e))?;
    conn.execute("DELETE FROM categories WHERE workspace_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete workspace categories: {}", e))?;
    conn.execute("DELETE FROM credentials WHERE workspace_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete workspace credentials: {}", e))?;
    conn.execute("DELETE FROM workspaces WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete workspace: {}", e))?;

    // アクティブワークスペースが削除された場合、最初のワークスペースに切り替え
    let active_id = get_active_workspace_id_impl(conn).unwrap_or_default();
    if active_id == id {
        let first_id: String = conn
            .query_row(
                "SELECT id FROM workspaces ORDER BY position ASC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to get fallback workspace: {}", e))?;

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_workspace_id', ?1)",
            params![first_id],
        )
        .map_err(|e| format!("Failed to update active workspace: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_active_workspace_id(
    db: State<'_, Arc<Mutex<AppDb>>>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    get_active_workspace_id_impl(&db.conn)
}

#[tauri::command]
pub fn set_active_workspace_id(
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    // ワークスペースが存在するか確認
    let exists: bool = conn
        .query_row(
            "SELECT 1 FROM workspaces WHERE id = ?1",
            params![id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !exists {
        return Err("指定されたワークスペースが見つかりません".to_string());
    }

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_workspace_id', ?1)",
        params![id],
    )
    .map_err(|e| format!("Failed to set active workspace: {}", e))?;

    Ok(())
}
