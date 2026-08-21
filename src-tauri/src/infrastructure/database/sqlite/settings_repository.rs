//! SQLite-реализация порта SettingsRepository (local).

use async_trait::async_trait;
use sqlx::SqlitePool;

use crate::domain::settings::repository::{SettingsRepository, SettingsRepositoryError};

pub struct SqliteSettingsRepository {
    pool: SqlitePool,
}

impl SqliteSettingsRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

fn map_err<E: std::fmt::Display>(e: E) -> SettingsRepositoryError {
    SettingsRepositoryError::Database(e.to_string())
}

#[async_trait]
impl SettingsRepository for SqliteSettingsRepository {
    async fn list(&self) -> Result<Vec<(String, String)>, SettingsRepositoryError> {
        let rows: Vec<(String, String)> =
            sqlx::query_as("SELECT key, value FROM settings ORDER BY key")
                .fetch_all(&self.pool)
                .await
                .map_err(map_err)?;
        Ok(rows)
    }

    async fn save(&self, entries: &[(String, String)]) -> Result<(), SettingsRepositoryError> {
        let mut tx = self.pool.begin().await.map_err(map_err)?;
        for (key, value) in entries {
            sqlx::query(
                "INSERT INTO settings (key, value) VALUES (?, ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            )
            .bind(key)
            .bind(value)
            .execute(&mut *tx)
            .await
            .map_err(map_err)?;
        }
        tx.commit().await.map_err(map_err)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::database::sqlite::SqliteDatabase;

    async fn test_repo() -> SqliteSettingsRepository {
        let dir = std::env::temp_dir().join(format!("pulse-set-{}", uuid::Uuid::new_v4()));
        let db = SqliteDatabase::init(&dir.join("test.db")).await.unwrap();
        SqliteSettingsRepository::new(db.pool.clone())
    }

    #[tokio::test]
    async fn seeded_defaults_present_and_roundtrip_works() {
        let repo = test_repo().await;

        // Миграция 0003 сидирует дефолты — сервисных ключей быть не должно
        let all = repo.list().await.unwrap();
        assert!(all.contains(&("timezone".to_string(), "Europe/Moscow".to_string())));
        assert!(all.iter().all(|(k, _)| k != "services"));

        // Upsert перезаписывает существующий ключ и добавляет новый
        repo.save(&[
            ("timezone".to_string(), "Europe/Berlin".to_string()),
            ("custom_key".to_string(), "42".to_string()),
        ])
        .await
        .unwrap();

        let map: std::collections::HashMap<String, String> = repo.list().await.unwrap().into_iter().collect();
        assert_eq!(map.get("timezone").unwrap(), "Europe/Berlin");
        assert_eq!(map.get("custom_key").unwrap(), "42");
        assert_eq!(map.get("daily_goal_min").unwrap(), "480");
    }
}
