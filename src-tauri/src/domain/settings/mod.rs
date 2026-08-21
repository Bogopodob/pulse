//! Настройки приложения (key-value). Сервисы/интеграции сюда не входят.

pub mod repository;

pub use repository::{SettingsRepository, SettingsRepositoryError};
