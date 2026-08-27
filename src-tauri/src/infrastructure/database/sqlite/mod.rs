//! SQLite: пул, миграции и реализации репозиториев.

pub mod settings_repository;
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
    /// Если в БД уже применена миграция, которой нет в собранном бинарнике
    /// (частый кейс при откате ветки / рассинхроне `cargo` кэша),
    /// вместо паники `setup hook` делаем самовосстановление: удаляем
    /// запись о «призрачной» миграции и пробуем снова. Для dev-сборок
    /// это безопасно — 0004 всего лишь `INSERT OR IGNORE`.
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
        let migrator = sqlx::migrate!("./migrations");
        match migrator.run(&pool).await {
            Ok(_) => Ok(Self { pool }),
            Err(e) => {
                let msg = e.to_string();
                // "migration X was previously applied but is missing in the resolved migrations"
                if msg.contains("was previously applied but is missing") {
                    log::warn!("sqlx migrate mismatch ({}), attempting auto-repair", msg);
                    // Удаляем все записи о миграциях, которых нет в `migrator`
                    // и пробуем снова. Для 0004 это просто `system_notifications`.
                    let _ = sqlx::query("DELETE FROM _sqlx_migrations WHERE version NOT IN (SELECT version FROM (SELECT 1 as version UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4))")
                        .execute(&pool)
                        .await;
                    // Более агрессивно: если выше не помогло, дропаем таблицу миграций и накатываем заново
                    // (данные templates/tasks/settings при этом сохранятся — дропается только служебная таблица)
                    if migrator.run(&pool).await.is_err() {
                        log::warn!("retry still failed, resetting _sqlx_migrations");
                        let _ = sqlx::query("DROP TABLE IF EXISTS _sqlx_migrations").execute(&pool).await;
                        migrator.run(&pool).await.map_err(|er| sqlx::Error::Migrate(Box::new(er)))?;
                    }
                    Ok(Self { pool })
                } else {
                    Err(sqlx::Error::Migrate(Box::new(e)))
                }
            }
        }
    }
}