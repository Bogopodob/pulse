//! Сущность задачи — корень агрегата.

use super::value_objects::{Minutes, TaskValidationError, TimeRange};

#[derive(Debug, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub period: TimeRange,
    pub start_minute: Minutes,
    pub end_minute: Minutes,
    pub progress: f64,
    pub responsible_id: Option<String>,
    pub assignees: Vec<String>,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Task {
    pub fn new(
        id: String,
        title: String,
        start_date: i64,
        end_date: i64,
        start_minute: i32,
        end_minute: i32,
        progress: f64,
        responsible_id: Option<String>,
        assignees: Vec<String>,
        tags: Vec<String>,
        created_at: i64,
        updated_at: i64,
    ) -> Result<Self, TaskValidationError> {
        if title.trim().is_empty() {
            return Err(TaskValidationError::EmptyTitle);
        }
        if !(0.0..=1.0).contains(&progress) {
            return Err(TaskValidationError::InvalidProgress(progress));
        }
        Ok(Self {
            id,
            title,
            period: TimeRange::new(start_date, end_date)?,
            start_minute: Minutes::new(start_minute)?,
            end_minute: Minutes::new(end_minute)?,
            progress,
            responsible_id,
            assignees,
            tags,
            created_at,
            updated_at,
        })
    }

    pub fn with_progress(&self, progress: f64) -> Result<Self, TaskValidationError> {
        if !(0.0..=1.0).contains(&progress) {
            return Err(TaskValidationError::InvalidProgress(progress));
        }
        let mut task = self.clone();
        task.progress = progress;
        task.updated_at = now_ms();
        Ok(task)
    }

    /// Частичное обновление из use case (application-слой собирает поля, валидация здесь).
    pub fn apply_update(
        &mut self,
        title: Option<String>,
        start_date: Option<i64>,
        end_date: Option<i64>,
        start_minute: Option<i32>,
        end_minute: Option<i32>,
        progress: Option<f64>,
        responsible_id: Option<Option<String>>,
        assignees: Option<Vec<String>>,
        tags: Option<Vec<String>>,
    ) -> Result<(), TaskValidationError> {
        if let Some(title) = title {
            if title.trim().is_empty() {
                return Err(TaskValidationError::EmptyTitle);
            }
            self.title = title;
        }
        let start = start_date.unwrap_or(self.period.start);
        let end = end_date.unwrap_or(self.period.end);
        self.period = TimeRange::new(start, end)?;
        if let Some(m) = start_minute {
            self.start_minute = Minutes::new(m)?;
        }
        if let Some(m) = end_minute {
            self.end_minute = Minutes::new(m)?;
        }
        if let Some(p) = progress {
            if !(0.0..=1.0).contains(&p) {
                return Err(TaskValidationError::InvalidProgress(p));
            }
            self.progress = p;
        }
        if let Some(r) = responsible_id {
            self.responsible_id = r;
        }
        if let Some(a) = assignees {
            self.assignees = a;
        }
        if let Some(t) = tags {
            self.tags = t;
        }
        self.updated_at = now_ms();
        Ok(())
    }
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}