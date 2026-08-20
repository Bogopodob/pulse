//! Use cases и DTO задач. Здесь живёт оркестрация:
//! валидация через domain, сохранение через порт репозитория.

mod dto;
mod service;

pub use dto::{CreateTaskInput, TaskFilterInput, TaskView, UpdateTaskInput};
pub use service::TaskService;