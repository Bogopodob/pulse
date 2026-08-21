//! Порт репозитория шаблонов. Local — SQLite, Remote — будущий HTTP API.

use super::template::DayTemplate;
use async_trait::async_trait;

#[derive(Debug, thiserror::Error)]
pub enum TemplateRepositoryError {
    #[error("template not found: {0}")]
    NotFound(String),
    #[error("database error: {0}")]
    Database(String),
}

#[async_trait]
pub trait TemplateRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<DayTemplate>, TemplateRepositoryError>;
    async fn list(&self) -> Result<Vec<DayTemplate>, TemplateRepositoryError>;
    async fn save(&self, tpl: &DayTemplate) -> Result<(), TemplateRepositoryError>;
    async fn delete(&self, id: &str) -> Result<(), TemplateRepositoryError>;
}