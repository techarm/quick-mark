use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::Manager;

pub struct AppDb {
    pub conn: Connection,
}

pub fn get_db_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("quickmark.db"))
}

pub fn init_db(db_path: &PathBuf) -> Result<AppDb> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    run_migrations(&conn)?;

    Ok(AppDb { conn })
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
            path TEXT NOT NULL DEFAULT '',
            icon TEXT DEFAULT 'folder',
            color TEXT DEFAULT '#E25050',
            search_alias TEXT DEFAULT '',
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS links (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            description TEXT DEFAULT '',
            favicon_url TEXT DEFAULT '',
            category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
            is_temporary INTEGER NOT NULL DEFAULT 0,
            expires_at TEXT DEFAULT NULL,
            visit_count INTEGER NOT NULL DEFAULT 0,
            last_visited_at TEXT DEFAULT NULL,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            color TEXT DEFAULT '#E25050'
        );

        CREATE TABLE IF NOT EXISTS link_tags (
            link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (link_id, tag_id)
        );

        CREATE INDEX IF NOT EXISTS idx_links_category ON links(category_id);
        CREATE INDEX IF NOT EXISTS idx_links_expires ON links(is_temporary, expires_at)
            WHERE is_temporary = 1;
        CREATE INDEX IF NOT EXISTS idx_links_visited ON links(last_visited_at DESC);
        CREATE INDEX IF NOT EXISTS idx_links_pinned ON links(is_pinned) WHERE is_pinned = 1;
        CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
        CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
        CREATE INDEX IF NOT EXISTS idx_links_url ON links(url);
        CREATE INDEX IF NOT EXISTS idx_links_created ON links(created_at DESC);

        CREATE TABLE IF NOT EXISTS credentials (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            username TEXT NOT NULL DEFAULT '',
            password_encoded TEXT NOT NULL DEFAULT '',
            note TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )?;

    // FTS5 仮想テーブル
    conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS links_fts USING fts5(
            title,
            url,
            description,
            tags_text,
            content='links',
            content_rowid='rowid',
            tokenize='unicode61 remove_diacritics 2'
        );
        ",
    )?;

    // マイグレーション: search_aliasカラム追加（既存DB対応）
    let _ = conn.execute_batch(
        "ALTER TABLE categories ADD COLUMN search_alias TEXT DEFAULT ''",
    );

    // マイグレーション: credentials に使用頻度カラム追加（既存DB対応）
    let _ = conn.execute_batch(
        "ALTER TABLE credentials ADD COLUMN use_count INTEGER NOT NULL DEFAULT 0",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE credentials ADD COLUMN last_used_at TEXT DEFAULT NULL",
    );

    // マイグレーション: workspacesテーブル追加
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT DEFAULT 'briefcase',
            color TEXT DEFAULT '#6366F1',
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;

    // マイグレーション: workspace_idカラム追加（既存DB対応）
    let _ = conn.execute_batch(
        "ALTER TABLE categories ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE links ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE credentials ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)",
    );

    conn.execute_batch(
        "
        CREATE INDEX IF NOT EXISTS idx_categories_workspace ON categories(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_links_workspace ON links(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_credentials_workspace ON credentials(workspace_id);
        ",
    )?;

    // ワークスペースのシードデータ（初回のみ）
    let workspace_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
        .unwrap_or(0);

    if workspace_count == 0 {
        let default_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO workspaces (id, name, icon, color, position) VALUES (?1, 'デフォルト', 'briefcase', '#6366F1', 0)",
            rusqlite::params![default_id],
        )?;
        conn.execute(
            "UPDATE categories SET workspace_id = ?1 WHERE workspace_id IS NULL",
            rusqlite::params![default_id],
        )?;
        conn.execute(
            "UPDATE links SET workspace_id = ?1 WHERE workspace_id IS NULL",
            rusqlite::params![default_id],
        )?;
        conn.execute(
            "UPDATE credentials SET workspace_id = ?1 WHERE workspace_id IS NULL",
            rusqlite::params![default_id],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_workspace_id', ?1)",
            rusqlite::params![default_id],
        )?;
    }

    // FTS同期トリガー
    conn.execute_batch(
        "
        CREATE TRIGGER IF NOT EXISTS links_ai AFTER INSERT ON links BEGIN
            INSERT INTO links_fts(rowid, title, url, description, tags_text)
            VALUES (new.rowid, new.title, new.url, new.description, '');
        END;

        CREATE TRIGGER IF NOT EXISTS links_ad AFTER DELETE ON links BEGIN
            INSERT INTO links_fts(links_fts, rowid, title, url, description, tags_text)
            VALUES ('delete', old.rowid, old.title, old.url, old.description, '');
        END;

        CREATE TRIGGER IF NOT EXISTS links_au AFTER UPDATE ON links BEGIN
            INSERT INTO links_fts(links_fts, rowid, title, url, description, tags_text)
            VALUES ('delete', old.rowid, old.title, old.url, old.description, '');
            INSERT INTO links_fts(rowid, title, url, description, tags_text)
            VALUES (new.rowid, new.title, new.url, new.description, '');
        END;
        ",
    )?;

    Ok(())
}
