use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::db::AppDb;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Credential {
    pub id: String,
    pub name: String,
    pub username: String,
    pub password_encoded: String,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCredentialInput {
    pub name: String,
    pub username: String,
    pub password: String,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCredentialInput {
    pub id: String,
    pub name: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub note: Option<String>,
}

fn row_to_credential(row: &rusqlite::Row) -> rusqlite::Result<Credential> {
    Ok(Credential {
        id: row.get("id")?,
        name: row.get("name")?,
        username: row.get("username")?,
        password_encoded: row.get("password_encoded")?,
        note: row.get("note")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn validate_length(field: &str, value: &str, max: usize) -> Result<(), String> {
    if value.len() > max {
        Err(format!("{}は{}文字以内にしてください", field, max))
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn get_credentials(db: State<'_, Arc<Mutex<AppDb>>>) -> Result<Vec<Credential>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let mut stmt = conn
        .prepare("SELECT * FROM credentials ORDER BY name ASC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let credentials = stmt
        .query_map([], row_to_credential)
        .map_err(|e| format!("Failed to get credentials: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(credentials)
}

#[tauri::command]
pub fn create_credential(
    db: State<'_, Arc<Mutex<AppDb>>>,
    input: CreateCredentialInput,
) -> Result<Credential, String> {
    validate_length("サービス名", &input.name, 200)?;
    validate_length("ユーザー名", &input.username, 500)?;
    validate_length("パスワード", &input.password, 1000)?;
    if let Some(ref note) = input.note {
        validate_length("メモ", note, 2000)?;
    }

    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;
    let id = uuid::Uuid::new_v4().to_string();
    let password_encoded = STANDARD.encode(input.password.as_bytes());

    conn.execute(
        "INSERT INTO credentials (id, name, username, password_encoded, note)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            id,
            input.name,
            input.username,
            password_encoded,
            input.note.unwrap_or_default(),
        ],
    )
    .map_err(|e| format!("Failed to create credential: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM credentials WHERE id = ?1")
        .map_err(|e| format!("Failed to query credential: {}", e))?;
    let credential = stmt
        .query_row(params![id], row_to_credential)
        .map_err(|e| format!("Failed to read created credential: {}", e))?;

    Ok(credential)
}

#[tauri::command]
pub fn update_credential(
    db: State<'_, Arc<Mutex<AppDb>>>,
    input: UpdateCredentialInput,
) -> Result<Credential, String> {
    if let Some(ref name) = input.name {
        validate_length("サービス名", name, 200)?;
    }
    if let Some(ref username) = input.username {
        validate_length("ユーザー名", username, 500)?;
    }
    if let Some(ref password) = input.password {
        validate_length("パスワード", password, 1000)?;
    }
    if let Some(ref note) = input.note {
        validate_length("メモ", note, 2000)?;
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

    add_field!("name", input.name);
    add_field!("username", input.username);

    if let Some(password) = input.password {
        let encoded = STANDARD.encode(password.as_bytes());
        sets.push(format!("password_encoded = ?{}", idx));
        values.push(Box::new(encoded));
        idx += 1;
    }

    add_field!("note", input.note);

    let sql = format!(
        "UPDATE credentials SET {} WHERE id = ?{}",
        sets.join(", "),
        idx
    );
    values.push(Box::new(input.id.clone()));

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        values.iter().map(|p| p.as_ref()).collect();

    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Failed to update credential: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM credentials WHERE id = ?1")
        .map_err(|e| format!("Failed to query credential: {}", e))?;
    let credential = stmt
        .query_row(params![input.id], row_to_credential)
        .map_err(|e| format!("Failed to read updated credential: {}", e))?;

    Ok(credential)
}

#[tauri::command]
pub fn delete_credential(db: State<'_, Arc<Mutex<AppDb>>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;
    conn.execute("DELETE FROM credentials WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete credential: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn search_credentials(
    db: State<'_, Arc<Mutex<AppDb>>>,
    query: String,
) -> Result<Vec<Credential>, String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    if query.trim().is_empty() {
        let mut stmt = conn
            .prepare("SELECT * FROM credentials ORDER BY name ASC")
            .map_err(|e| e.to_string())?;
        let credentials = stmt
            .query_map([], row_to_credential)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        return Ok(credentials);
    }

    let like_pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM credentials
             WHERE name LIKE ?1 COLLATE NOCASE
                OR username LIKE ?1 COLLATE NOCASE
             ORDER BY name ASC
             LIMIT 20",
        )
        .map_err(|e| e.to_string())?;

    let credentials = stmt
        .query_map(params![like_pattern], row_to_credential)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(credentials)
}

#[tauri::command]
pub fn copy_credential_password(
    app: AppHandle,
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
) -> Result<(), String> {
    let password = {
        let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
        let conn = &db.conn;
        let encoded: String = conn
            .query_row(
                "SELECT password_encoded FROM credentials WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to get credential: {}", e))?;

        let decoded = STANDARD
            .decode(encoded.as_bytes())
            .map_err(|e| format!("Failed to decode password: {}", e))?;
        String::from_utf8(decoded).map_err(|e| format!("Invalid UTF-8: {}", e))?
    };

    app.clipboard()
        .write_text(&password)
        .map_err(|e| format!("Failed to write to clipboard: {}", e))?;

    let _ = app.emit("credential:password-copied", ());

    // 30秒後にクリップボードをクリア
    let app_clone = app.clone();
    let password_clone = password.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(30));

        // クリア前にクリップボード内容を確認
        if let Ok(current) = app_clone.clipboard().read_text() {
            if current == password_clone {
                let _ = app_clone.clipboard().write_text("");
                let _ = app_clone.emit("credential:clipboard-cleared", ());
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn copy_credential_field(
    app: AppHandle,
    db: State<'_, Arc<Mutex<AppDb>>>,
    id: String,
    field: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("DB lock failed: {}", e))?;
    let conn = &db.conn;

    let value: String = match field.as_str() {
        "username" => conn
            .query_row(
                "SELECT username FROM credentials WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to get credential: {}", e))?,
        "password" => {
            let encoded: String = conn
                .query_row(
                    "SELECT password_encoded FROM credentials WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to get credential: {}", e))?;
            let decoded = STANDARD
                .decode(encoded.as_bytes())
                .map_err(|e| format!("Failed to decode password: {}", e))?;
            String::from_utf8(decoded).map_err(|e| format!("Invalid UTF-8: {}", e))?
        }
        _ => return Err(format!("Unknown field: {}", field)),
    };

    app.clipboard()
        .write_text(&value)
        .map_err(|e| format!("Failed to write to clipboard: {}", e))?;

    // パスワードの場合のみ30秒後にクリア
    if field == "password" {
        let app_clone = app.clone();
        let value_clone = value.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(30));
            if let Ok(current) = app_clone.clipboard().read_text() {
                if current == value_clone {
                    let _ = app_clone.clipboard().write_text("");
                    let _ = app_clone.emit("credential:clipboard-cleared", ());
                }
            }
        });
    }

    Ok(())
}

#[tauri::command]
pub fn clear_clipboard(app: AppHandle) -> Result<(), String> {
    app.clipboard()
        .write_text("")
        .map_err(|e| format!("Failed to clear clipboard: {}", e))?;
    Ok(())
}
