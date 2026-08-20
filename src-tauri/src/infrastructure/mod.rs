//! Инфраструктура: SQLite, sync, файловое хранилище.
//! Единственное место, где есть конкретные технологии.

pub mod database;
pub mod storage;
pub mod sync;