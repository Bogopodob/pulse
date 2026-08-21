//! Use cases и DTO шаблонов.

mod dto;
mod service;

pub use dto::{CreateTemplateInput, TemplateView, UpdateTemplateInput};
pub use service::TemplateService;