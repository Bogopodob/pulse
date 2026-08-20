//! Порт репозитория задач. Domain не знает про SQLite/HTTP —
//! реализации живут в infrastructure, а SyncService комбинирует local + remote.

use super::filter::TaskFilter;
use super::task::Task;
use async_trait::async_trait;

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("task not found: {0}")]
    NotFound(String),
    #[error("database error: {0}")]
    Database(String),
}

/// Асинхронный контракт хранилища задач.
/// Local-реализация — SQLite, Remote — будущий HTTP API.
#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<Task>, RepositoryError>;
    async fn list(&self, filter: &TaskFilter) -> Result<Vec<Task>, RepositoryError>;
    async fn save(&self, task: &Task) -> Result<(), RepositoryError>;
    async fn delete(&self, id: &str) -> Result<(), RepositoryError>;
}