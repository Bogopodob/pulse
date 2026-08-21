//! Прикладной слой: use cases и DTO. Зависит только от domain.

pub mod task;
pub mod template;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error(transparent)]
    Domain(#[from] crate::domain::task::value_objects::TaskValidationError),
    #[error(transparent)]
    TemplateDomain(#[from] crate::domain::template::rule::TemplateValidationError),
    #[error(transparent)]
    Repository(#[from] crate::domain::task::repository::RepositoryError),
    #[error(transparent)]
    TemplateRepository(#[from] crate::domain::template::repository::TemplateRepositoryError),
    #[error("{0}")]
    NotFound(String),
}