//! Composition root: сервисы, доступные командам через managed state.

use std::sync::Arc;

use crate::application::task::TaskService;
use crate::infrastructure::sync::SyncService;

pub struct AppState {
    pub tasks: TaskService,
    pub sync: SyncService,
    pub _db: Arc<sqlx::SqlitePool>,
}