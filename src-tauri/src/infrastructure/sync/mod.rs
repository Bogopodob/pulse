//! Синхронизация local ↔ remote. Пока каркас: trait-контракт + заглушка.
//! Когда появится сервер, здесь появится Remote-реализация репозиториев
//! и настоящая логика слияния (updated_after / updated_at).

mod sync_service;

pub use sync_service::SyncService;