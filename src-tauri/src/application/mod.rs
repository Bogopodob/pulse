//! Прикладной слой: use cases и DTO. Зависит только от domain.

pub mod task;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error(transparent)]
    Domain(#[from] crate::domain::task::value_objects::TaskValidationError),
    #[error(transparent)]
    Repository(#[from] crate::domain::task::repository::RepositoryError),
    #[error("{0}")]
    NotFound(String),
}