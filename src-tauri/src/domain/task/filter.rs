//! Фильтр списка задач — контракт между application и repository.

use super::value_objects::TimeRange;

#[derive(Debug, Clone, Default)]
pub struct TaskFilter {
    /// Пересечение с периодом (по start_date/end_date).
    pub period: Option<TimeRange>,
    pub tags: Option<Vec<String>>,
    pub assignees: Option<Vec<String>>,
    /// Задачи, изменённые после метки (для будущего sync).
    pub updated_after: Option<i64>,
}