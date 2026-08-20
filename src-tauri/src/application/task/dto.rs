//! DTO — граница между фронтендом (Tauri commands) и use cases.
//! Даты передаются как unix-миллисекунды (UTC).

use crate::domain::task::filter::TaskFilter;
use crate::domain::task::task::Task;
use crate::domain::task::value_objects::TimeRange;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub start_date: i64,
    pub end_date: i64,
    pub start_minute: i32,
    pub end_minute: i32,
    #[serde(default)]
    pub progress: Option<f64>,
    #[serde(default)]
    pub responsible_id: Option<String>,
    #[serde(default)]
    pub assignees: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub start_date: Option<i64>,
    pub end_date: Option<i64>,
    pub start_minute: Option<i32>,
    pub end_minute: Option<i32>,
    pub progress: Option<f64>,
    /// Some(None) — сбросить ответственного.
    pub responsible_id: Option<Option<String>>,
    pub assignees: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Default)]
pub struct TaskFilterInput {
    pub start_after: Option<i64>,
    pub start_before: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub assignees: Option<Vec<String>>,
    pub updated_after: Option<i64>,
}

impl TaskFilterInput {
    pub fn into_domain(self) -> TaskFilter {
        TaskFilter {
            period: match (self.start_after, self.start_before) {
                (Some(s), Some(e)) => TimeRange::new(s, e).ok(),
                (Some(s), None) => TimeRange::new(s, i64::MAX).ok(),
                (None, Some(e)) => TimeRange::new(i64::MIN, e).ok(),
                (None, None) => None,
            },
            tags: self.tags,
            assignees: self.assignees,
            updated_after: self.updated_after,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct TaskView {
    pub id: String,
    pub title: String,
    pub start_date: i64,
    pub end_date: i64,
    pub start_minute: i32,
    pub end_minute: i32,
    pub progress: f64,
    pub responsible_id: Option<String>,
    pub assignees: Vec<String>,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<&Task> for TaskView {
    fn from(t: &Task) -> Self {
        Self {
            id: t.id.clone(),
            title: t.title.clone(),
            start_date: t.period.start,
            end_date: t.period.end,
            start_minute: t.start_minute.0,
            end_minute: t.end_minute.0,
            progress: t.progress,
            responsible_id: t.responsible_id.clone(),
            assignees: t.assignees.clone(),
            tags: t.tags.clone(),
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}