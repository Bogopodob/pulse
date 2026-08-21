//! Доменный слой: сущности, value objects и бизнес-правила.
//! Не зависит от SQLite, HTTP, Tauri и фронтенда — только чистая логика.

pub mod settings;
pub mod task;
pub mod team;
pub mod template;