//! Composition root: сервисы, доступные командам через managed state.

use std::sync::Arc;

use crate::application::task::TaskService;
use crate::application::template::TemplateService;
use crate::infrastructure::sync::SyncService;

pub struct AppState {
    pub tasks: TaskService,
    pub templates: TemplateService,
    pub sync: SyncService,
    pub _db: Arc<sqlx::SqlitePool>,
}