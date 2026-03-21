use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::db::AppDb;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub path: String,
    pub icon: String,
    pub color: String,
    pub position: i64,
    pub created_at: String,
    pub link_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryInput {
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryInput {
    pub id: String,
    pub name: Option<String>,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub position: Option<i64>,
}

fn row_to_category(row: &rusqlite::Row) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get("id")?,
        name: row.get("name")?,
        parent_id: row.get("parent_id")?,
        path: row.get("path")?,
        icon: row.get("icon")?,
        color: row.get("color")?,
        position: row.get("position")?,
        created_at: row.get("created_at")?,
        link_count: row.get("link_count")?,
    })
}

#[tauri::command]
pub fn get_categories(
    db: State<'_, Mutex<AppDb>>,
) -> Result<Vec<Category>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;

    let mut stmt = conn
        .prepare(
            "SELECT c.*, COALESCE(
                (SELECT COUNT(*) FROM links l WHERE l.category_id = c.id), 0
             ) AS link_count
             FROM categories c
             ORDER BY c.position ASC, c.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], row_to_category)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(categories)
}

#[tauri::command]
pub fn create_category(
    db: State<'_, Mutex<AppDb>>,
    input: CreateCategoryInput,
) -> Result<Category, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;
    let id = uuid::Uuid::new_v4().to_string();

    // 親のパスを取得して物化パスを構築
    let parent_path = if let Some(ref parent_id) = input.parent_id {
        let path: String = conn
            .query_row(
                "SELECT path FROM categories WHERE id = ?1",
                params![parent_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        path
    } else {
        String::new()
    };

    let path = if parent_path.is_empty() {
        format!("/{}", id)
    } else {
        format!("{}/{}", parent_path, id)
    };

    // 同じ親の中での最大positionを取得
    let max_pos: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) FROM categories WHERE parent_id IS ?1",
            params![input.parent_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO categories (id, name, parent_id, path, icon, color, position)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.name,
            input.parent_id,
            path,
            input.icon.unwrap_or_else(|| "folder".to_string()),
            input.color.unwrap_or_else(|| "#E25050".to_string()),
            max_pos + 1,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT c.*, 0 AS link_count FROM categories c WHERE c.id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let category = stmt
        .query_row(params![id], row_to_category)
        .map_err(|e| e.to_string())?;

    Ok(category)
}

#[tauri::command]
pub fn update_category(
    db: State<'_, Mutex<AppDb>>,
    input: UpdateCategoryInput,
) -> Result<Category, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
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

    // parent_id の変更は物化パスの更新が必要（将来のタスクとして簡略化）
    if let Some(ref parent_id) = input.parent_id {
        sets.push(format!("parent_id = ?{}", idx));
        values.push(Box::new(parent_id.clone()));
        idx += 1;
    }

    if sets.is_empty() {
        // 更新なし
    } else {
        let sql = format!(
            "UPDATE categories SET {} WHERE id = ?{}",
            sets.join(", "),
            idx
        );
        values.push(Box::new(input.id.clone()));
        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            values.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())
            .map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare(
            "SELECT c.*, COALESCE(
                (SELECT COUNT(*) FROM links l WHERE l.category_id = c.id), 0
             ) AS link_count
             FROM categories c WHERE c.id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let category = stmt
        .query_row(params![input.id], row_to_category)
        .map_err(|e| e.to_string())?;

    Ok(category)
}

#[tauri::command]
pub fn delete_category(
    db: State<'_, Mutex<AppDb>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = &db.conn;

    // カテゴリ内のリンクのcategory_idをNULLに
    conn.execute(
        "UPDATE links SET category_id = NULL WHERE category_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
