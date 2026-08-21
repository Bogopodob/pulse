//! Порт репозитория настроек. Local — SQLite, Remote — будущий HTTP API.

use async_trait::async_trait;

#[derive(Debug, thiserror::Error)]
pub enum SettingsRepositoryError {
    #[error("database error: {0}")]
    Database(String),
}

#[async_trait]
pub trait SettingsRepository: Send + Sync {
    /// Все настройки парами (ключ, значение).
    async fn list(&self) -> Result<Vec<(String, String)>, SettingsRepositoryError>;

    /// Пакетный upsert: несуществующие ключи создаются, существующие обновляются.
    async fn save(&self, entries: &[(String, String)]) -> Result<(), SettingsRepositoryError>;
}
