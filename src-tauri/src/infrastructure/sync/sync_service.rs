use std::sync::Arc;

use crate::domain::task::repository::TaskRepository;

#[derive(Debug, thiserror::Error)]
pub enum SyncError {
    #[error("sync not implemented yet: remote repository is not configured")]
    NotConfigured,
    #[error("sync failed: {0}")]
    Failed(String),
}

/// Пока заглушка: держит ссылки на local (и в будущем remote) репозитории.
pub struct SyncService {
    local_tasks: Arc<dyn TaskRepository>,
}

impl SyncService {
    pub fn new(local_tasks: Arc<dyn TaskRepository>) -> Self {
        Self { local_tasks }
    }

    /// Полный цикл синхронизации: push изменений на сервер, pull новых.
    pub async fn sync_all(&self) -> Result<(), SyncError> {
        let _ = &self.local_tasks; // local будет источником правды для push
        log::info!("sync: remote repository is not configured, skipping");
        Err(SyncError::NotConfigured)
    }
}