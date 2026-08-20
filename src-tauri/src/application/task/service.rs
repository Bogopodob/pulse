//! Use cases задач: create, get, list, update, delete, duplicate.
//! Не знает, откуда приходят данные — local SQLite или remote API.

use std::sync::Arc;

use uuid::Uuid;

use crate::application::ServiceError;
use crate::domain::task::repository::TaskRepository;
use crate::domain::task::task::Task;

use super::dto::{CreateTaskInput, TaskFilterInput, TaskView, UpdateTaskInput};

pub struct TaskService {
    repo: Arc<dyn TaskRepository>,
}

impl TaskService {
    pub fn new(repo: Arc<dyn TaskRepository>) -> Self {
        Self { repo }
    }

    pub async fn create(&self, input: CreateTaskInput) -> Result<TaskView, ServiceError> {
        let now = chrono::Utc::now().timestamp_millis();
        let task = Task::new(
            Uuid::new_v4().to_string(),
            input.title,
            input.start_date,
            input.end_date,
            input.start_minute,
            input.end_minute,
            input.progress.unwrap_or(0.0),
            input.responsible_id,
            input.assignees,
            input.tags,
            now,
            now,
        )?;
        self.repo.save(&task).await?;
        Ok(TaskView::from(&task))
    }

    pub async fn get(&self, id: &str) -> Result<TaskView, ServiceError> {
        let task = self.repo.find_by_id(id).await?;
        match task {
            Some(t) => Ok(TaskView::from(&t)),
            None => Err(ServiceError::NotFound(format!("task {id}"))),
        }
    }

    pub async fn list(&self, filter: TaskFilterInput) -> Result<Vec<TaskView>, ServiceError> {
        let tasks = self.repo.list(&filter.into_domain()).await?;
        Ok(tasks.iter().map(TaskView::from).collect())
    }

    pub async fn update(&self, id: &str, input: UpdateTaskInput) -> Result<TaskView, ServiceError> {
        let task = self.repo.find_by_id(id).await?;
        let mut task = match task {
            Some(t) => t,
            None => return Err(ServiceError::NotFound(format!("task {id}"))),
        };
        task.apply_update(
            input.title,
            input.start_date,
            input.end_date,
            input.start_minute,
            input.end_minute,
            input.progress,
            input.responsible_id,
            input.assignees,
            input.tags,
        )?;
        self.repo.save(&task).await?;
        Ok(TaskView::from(&task))
    }

    pub async fn delete(&self, id: &str) -> Result<(), ServiceError> {
        let task = self.repo.find_by_id(id).await?;
        if task.is_none() {
            return Err(ServiceError::NotFound(format!("task {id}")));
        }
        self.repo.delete(id).await?;
        Ok(())
    }

    pub async fn duplicate(&self, id: &str) -> Result<TaskView, ServiceError> {
        let task = self.repo.find_by_id(id).await?;
        let task = match task {
            Some(t) => t,
            None => return Err(ServiceError::NotFound(format!("task {id}"))),
        };
        let now = chrono::Utc::now().timestamp_millis();
        let copy = Task::new(
            Uuid::new_v4().to_string(),
            task.title,
            task.period.start,
            task.period.end,
            task.start_minute.0,
            task.end_minute.0,
            0.0,
            task.responsible_id,
            task.assignees,
            task.tags,
            now,
            now,
        )?;
        self.repo.save(&copy).await?;
        Ok(TaskView::from(&copy))
    }
}