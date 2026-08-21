//! SQLite: пул, миграции и реализации репозиториев.

pub mod task_repository;
pub mod template_repository;

use std::path::Path;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

#[derive(Debug)]
pub struct SqliteDatabase {
    pub pool: SqlitePool,
}

impl SqliteDatabase {
    /// Открывает (создаёт при отсутствии) БД и накатывает миграции.
    pub async fn init(db_path: &Path) -> Result<Self, sqlx::Error> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                sqlx::Error::Io(std::io::Error::new(e.kind(), format!("create db dir: {e}")))
            })?;
        }
        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .foreign_keys(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;
        sqlx::migrate!("./migrations").run(&pool).await?;
        Ok(Self { pool })
    }
}