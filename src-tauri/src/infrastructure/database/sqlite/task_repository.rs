//! SQLite-реализация порта TaskRepository (local).

use std::collections::HashMap;

use async_trait::async_trait;
use sqlx::{Row, SqlitePool};

use crate::domain::task::filter::TaskFilter;
use crate::domain::task::repository::{RepositoryError, TaskRepository};
use crate::domain::task::task::Task;

pub struct SqliteTaskRepository {
    pool: SqlitePool,
}

impl SqliteTaskRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    fn row_to_task(row: &sqlx::sqlite::SqliteRow) -> Result<Task, RepositoryError> {
        let id: String = row.try_get("id").map_err(map_err)?;
        let start_date: i64 = row.try_get("start_date").map_err(map_err)?;
        let end_date: i64 = row.try_get("end_date").map_err(map_err)?;
        let assignees: Vec<String> = row
            .try_get::<String, _>("assignees")
            .map_err(map_err)
            .and_then(|s| serde_json::from_str(&s).map_err(map_err))?;
        Task::new(
            id,
            row.try_get("title").map_err(map_err)?,
            start_date,
            end_date,
            row.try_get("start_minute").map_err(map_err)?,
            row.try_get("end_minute").map_err(map_err)?,
            row.try_get("progress").map_err(map_err)?,
            row.try_get("responsible_id").map_err(map_err)?,
            assignees,
            Vec::new(),
            row.try_get("created_at").map_err(map_err)?,
            row.try_get("updated_at").map_err(map_err)?,
        )
        .map_err(|e| RepositoryError::Database(e.to_string()))
    }

    async fn load_tags(&self, ids: &[String]) -> Result<HashMap<String, Vec<String>>, RepositoryError> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        use sqlx::QueryBuilder;
        let mut qb: QueryBuilder<sqlx::Sqlite> =
            QueryBuilder::new("SELECT task_id, tag FROM task_tags WHERE task_id IN (");
        let mut separated = qb.separated(", ");
        for id in ids {
            separated.push_bind(id);
        }
        qb.push(")");
        let mut rows = qb.build().fetch_all(&self.pool).await.map_err(map_err)?;
        let mut map: HashMap<String, Vec<String>> = HashMap::new();
        for row in rows.drain(..) {
            let task_id: String = row.try_get("task_id").map_err(map_err)?;
            let tag: String = row.try_get("tag").map_err(map_err)?;
            map.entry(task_id).or_default().push(tag);
        }
        Ok(map)
    }
}

fn map_err<E: std::fmt::Display>(e: E) -> RepositoryError {
    RepositoryError::Database(e.to_string())
}

#[async_trait]
impl TaskRepository for SqliteTaskRepository {
    async fn find_by_id(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
        let row = sqlx::query(
            "SELECT id, title, start_date, end_date, start_minute, end_minute, progress, \
             responsible_id, assignees, created_at, updated_at \
             FROM tasks WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(map_err)?;
        let Some(row) = row else {
            return Ok(None);
        };
        let mut task = Self::row_to_task(&row)?;
        task.tags = self.load_tags(&[id.to_string()]).await?.remove(id).unwrap_or_default();
        Ok(Some(task))
    }

    async fn list(&self, filter: &TaskFilter) -> Result<Vec<Task>, RepositoryError> {
        use sqlx::QueryBuilder;

        let mut qb: QueryBuilder<sqlx::Sqlite> = QueryBuilder::new(
            "SELECT id, title, start_date, end_date, start_minute, end_minute, progress, \
             responsible_id, assignees, created_at, updated_at FROM tasks WHERE 1=1",
        );

        if let Some(p) = filter.period {
            qb.push(" AND start_date <= ").push_bind(p.end).push(" AND end_date >= ").push_bind(p.start);
        }
        if let Some(after) = filter.updated_after {
            qb.push(" AND updated_at > ").push_bind(after);
        }
        if let Some(tags) = &filter.tags {
            qb.push(" AND EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = tasks.id AND tt.tag IN (");
            let mut separated = qb.separated(", ");
            for t in tags {
                separated.push_bind(t);
            }
            qb.push("))");
        }
        if let Some(assignees) = &filter.assignees {
            qb.push(" AND EXISTS (SELECT 1 FROM json_each(tasks.assignees) WHERE json_each.value IN (");
            let mut separated = qb.separated(", ");
            for a in assignees {
                separated.push_bind(a);
            }
            qb.push("))");
        }
        qb.push(" ORDER BY start_date ASC");

        let rows = qb.build().fetch_all(&self.pool).await.map_err(map_err)?;

        let ids: Vec<String> = rows
            .iter()
            .map(|r| r.try_get::<String, _>("id").map_err(map_err))
            .collect::<Result<_, _>>()?;
        let tags = self.load_tags(&ids).await?;

        let mut tasks = Vec::with_capacity(rows.len());
        for row in rows {
            let mut task = Self::row_to_task(&row)?;
            task.tags = tags.get(&task.id).cloned().unwrap_or_default();
            tasks.push(task);
        }
        Ok(tasks)
    }

    async fn save(&self, task: &Task) -> Result<(), RepositoryError> {
        let assignees = serde_json::to_string(&task.assignees).map_err(map_err)?;
        let mut tx = self.pool.begin().await.map_err(map_err)?;
        sqlx::query(
            "INSERT OR REPLACE INTO tasks (id, title, start_date, end_date, start_minute, end_minute, \
             progress, responsible_id, assignees, created_at, updated_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&task.id)
        .bind(&task.title)
        .bind(task.period.start)
        .bind(task.period.end)
        .bind(task.start_minute.0)
        .bind(task.end_minute.0)
        .bind(task.progress)
        .bind(&task.responsible_id)
        .bind(assignees)
        .bind(task.created_at)
        .bind(task.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(map_err)?;

        sqlx::query("DELETE FROM task_tags WHERE task_id = ?")
            .bind(&task.id)
            .execute(&mut *tx)
            .await
            .map_err(map_err)?;
        for tag in &task.tags {
            sqlx::query("INSERT INTO task_tags (task_id, tag) VALUES (?, ?)")
                .bind(&task.id)
                .bind(tag)
                .execute(&mut *tx)
                .await
                .map_err(map_err)?;
        }
        tx.commit().await.map_err(map_err)?;
        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(map_err)?;
        Ok(())
    }
}