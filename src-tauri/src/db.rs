use sqlx::{migrate::MigrateDatabase, sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub db: Pool<Sqlite>,
}

pub async fn init_db(app_handle: &AppHandle) -> Result<AppState, String> {
    let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
    
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let db_path: PathBuf = app_dir.join("emlak.db");
    let db_url = format!("sqlite://{}", db_path.to_string_lossy());

    if !Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        Sqlite::create_database(&db_url).await.map_err(|e| e.to_string())?;
    }

    let db = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| e.to_string())?;

    // Auto-Migration: Check if 'dues' has the new 'period' column.
    // If not (e.g. old schema or table missing), drop it so it can be recreated correctly.
    // We check by trying to select the specific column.
    let check_schema = sqlx::query("SELECT period FROM dues LIMIT 1")
        .fetch_optional(&db)
        .await;

    if check_schema.is_err() {
        // Error implies table missing OR column missing. 
        // We drop the table to ensure a clean slate for the CREATE statement below.
        let _ = sqlx::query("DROP TABLE IF EXISTS dues").execute(&db).await;
    }

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tc_number TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            phone_1 TEXT NOT NULL,
            phone_2 TEXT,
            registration_date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS cooperatives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS cooperative_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coop_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            entry_date TEXT NOT NULL,
            FOREIGN KEY(coop_id) REFERENCES cooperatives(id),
            FOREIGN KEY(member_id) REFERENCES members(id)
        );
        CREATE TABLE IF NOT EXISTS dues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coop_member_id INTEGER NOT NULL,
            period TEXT NOT NULL,
            amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'unpaid',
            payment_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(coop_member_id) REFERENCES cooperative_members(id)
        );"
    )
    .execute(&db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(AppState { db })
}
