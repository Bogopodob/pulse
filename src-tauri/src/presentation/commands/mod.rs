//! Tauri-команды: тонкие обработчики — принимают DTO, зовут use case,
//! отдают сериализованный результат. Никакой бизнес-логики здесь.

pub mod settings_commands;
pub mod task_commands;
pub mod template_commands;