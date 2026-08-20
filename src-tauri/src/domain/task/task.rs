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
    /// Валидация атомарна: при ошибке состояние не меняется.
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
        let next_title = match title {
            Some(t) if t.trim().is_empty() => return Err(TaskValidationError::EmptyTitle),
            Some(t) => t,
            None => self.title.clone(),
        };
        let next_period = TimeRange::new(
            start_date.unwrap_or(self.period.start),
            end_date.unwrap_or(self.period.end),
        )?;
        let next_start = match start_minute {
            Some(m) => Minutes::new(m)?,
            None => self.start_minute,
        };
        let next_end = match end_minute {
            Some(m) => Minutes::new(m)?,
            None => self.end_minute,
        };
        let next_progress = match progress {
            Some(p) if !(0.0..=1.0).contains(&p) => return Err(TaskValidationError::InvalidProgress(p)),
            Some(p) => p,
            None => self.progress,
        };

        self.title = next_title;
        self.period = next_period;
        self.start_minute = next_start;
        self.end_minute = next_end;
        self.progress = next_progress;
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

#[cfg(test)]
mod tests {
    use super::*;

    fn valid(id: &str) -> Result<Task, TaskValidationError> {
        Task::new(
            id.to_string(),
            "Задача".to_string(),
            1_700_000_000_000,
            1_700_086_400_000,
            9 * 60,
            18 * 60,
            0.0,
            None,
            vec![],
            vec![],
            1_700_000_000_000,
            1_700_000_000_000,
        )
    }

    #[test]
    fn accepts_valid_task() {
        let t = valid("t1").unwrap();
        assert_eq!(t.title, "Задача");
        assert_eq!(t.progress, 0.0);
    }

    #[test]
    fn rejects_empty_title() {
        let mut t = valid("t2").unwrap();
        let err = t.apply_update(Some("   ".to_string()), None, None, None, None, None, None, None, None);
        assert!(matches!(err, Err(TaskValidationError::EmptyTitle)));
        let err = Task::new(
            "t3".into(), String::new(), 1, 2, 0, 60, 0.0, None, vec![], vec![], 0, 0,
        );
        assert!(matches!(err, Err(TaskValidationError::EmptyTitle)));
        let _ = &mut t;
    }

    #[test]
    fn rejects_inverted_period() {
        let err = Task::new(
            "t4".into(), "Задача".into(), 200, 100, 0, 60, 0.0, None, vec![], vec![], 0, 0,
        );
        assert!(matches!(err, Err(TaskValidationError::InvalidPeriod { .. })));
    }

    #[test]
    fn rejects_out_of_range_minutes() {
        let err = Task::new(
            "t5".into(), "Задача".into(), 100, 200, -5, 60, 0.0, None, vec![], vec![], 0, 0,
        );
        assert!(matches!(err, Err(TaskValidationError::InvalidMinutes(-5))));
        let err = Task::new(
            "t6".into(), "Задача".into(), 100, 200, 0, 1500, 0.0, None, vec![], vec![], 0, 0,
        );
        assert!(matches!(err, Err(TaskValidationError::InvalidMinutes(1500))));
    }

    #[test]
    fn rejects_out_of_range_progress() {
        let err = Task::new(
            "t7".into(), "Задача".into(), 100, 200, 0, 60, 1.5, None, vec![], vec![], 0, 0,
        );
        assert!(matches!(err, Err(TaskValidationError::InvalidProgress(_))));
        let t = valid("t8").unwrap();
        assert!(t.with_progress(-0.1).is_err());
        assert!(t.with_progress(1.1).is_err());
        assert_eq!(t.with_progress(0.5).unwrap().progress, 0.5);
    }

    #[test]
    fn update_keeps_validation() {
        let mut t = valid("t9").unwrap();
        t.apply_update(Some("Новое".into()), Some(500), Some(300), None, None, None, None, None, None)
            .expect_err("inverted period must fail");
        assert_eq!(t.title, "Задача");
        t.apply_update(Some("Новое".into()), Some(300), Some(500), None, None, None, None, None, None)
            .unwrap();
        assert_eq!(t.title, "Новое");
        assert_eq!(t.period.start, 300);
        assert_eq!(t.period.end, 500);
    }
}