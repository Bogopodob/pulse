//! SQLite-реализация порта TemplateRepository (local).

use async_trait::async_trait;
use sqlx::{Row, SqlitePool};

use crate::domain::template::repository::{TemplateRepository, TemplateRepositoryError};
use crate::domain::template::template::DayTemplate;

pub struct SqliteTemplateRepository {
    pool: SqlitePool,
}

impl SqliteTemplateRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    fn row_to_template(row: &sqlx::sqlite::SqliteRow) -> Result<DayTemplate, TemplateRepositoryError> {
        let days: Vec<i32> = row
            .try_get::<String, _>("days")
            .map_err(map_err)
            .and_then(|s| serde_json::from_str(&s).map_err(map_err))?;
        let rules: Vec<crate::domain::template::rule::Rule> = row
            .try_get::<String, _>("rules")
            .map_err(map_err)
            .and_then(|s| serde_json::from_str(&s).map_err(map_err))?;
        DayTemplate::new(
            row.try_get("id").map_err(map_err)?,
            row.try_get("name").map_err(map_err)?,
            days,
            rules,
            row.try_get("inherit_settings").map_err(map_err)?,
            row.try_get("chain_start_min").map_err(map_err)?,
            row.try_get("daily_goal_min").map_err(map_err)?,
            row.try_get("time_format").map_err(map_err)?,
            row.try_get("timezone").map_err(map_err)?,
            row.try_get("created_at").map_err(map_err)?,
            row.try_get("updated_at").map_err(map_err)?,
        )
        .map_err(|e| TemplateRepositoryError::Database(e.to_string()))
    }
}

fn map_err<E: std::fmt::Display>(e: E) -> TemplateRepositoryError {
    TemplateRepositoryError::Database(e.to_string())
}

const COLS: &str = "id, name, days, inherit_settings, chain_start_min, daily_goal_min, time_format, timezone, rules, created_at, updated_at";

#[async_trait]
impl TemplateRepository for SqliteTemplateRepository {
    async fn find_by_id(&self, id: &str) -> Result<Option<DayTemplate>, TemplateRepositoryError> {
        let row = sqlx::query(&format!("SELECT {COLS} FROM templates WHERE id = ?"))
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(map_err)?;
        match row {
            Some(r) => Ok(Some(Self::row_to_template(&r)?)),
            None => Ok(None),
        }
    }

    async fn list(&self) -> Result<Vec<DayTemplate>, TemplateRepositoryError> {
        let rows = sqlx::query(&format!("SELECT {COLS} FROM templates ORDER BY name ASC"))
            .fetch_all(&self.pool)
            .await
            .map_err(map_err)?;
        rows.iter().map(Self::row_to_template).collect()
    }

    async fn save(&self, tpl: &DayTemplate) -> Result<(), TemplateRepositoryError> {
        let days = serde_json::to_string(&tpl.days).map_err(map_err)?;
        let rules = serde_json::to_string(&tpl.rules).map_err(map_err)?;
        sqlx::query(
            "INSERT OR REPLACE INTO templates (id, name, days, inherit_settings, chain_start_min, \
             daily_goal_min, time_format, timezone, rules, created_at, updated_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&tpl.id)
        .bind(&tpl.name)
        .bind(days)
        .bind(tpl.inherit_settings)
        .bind(tpl.chain_start_min)
        .bind(tpl.daily_goal_min)
        .bind(&tpl.time_format)
        .bind(&tpl.timezone)
        .bind(rules)
        .bind(tpl.created_at)
        .bind(tpl.updated_at)
        .execute(&self.pool)
        .await
        .map_err(map_err)?;
        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), TemplateRepositoryError> {
        sqlx::query("DELETE FROM templates WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(map_err)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::template::rule::{Rule, RuleColor};
    use crate::infrastructure::database::sqlite::SqliteDatabase;

    async fn test_repo() -> SqliteTemplateRepository {
        let dir = std::env::temp_dir().join(format!("pulse-tpl-{}", uuid::Uuid::new_v4()));
        let db = SqliteDatabase::init(&dir.join("test.db")).await.unwrap();
        SqliteTemplateRepository::new(db.pool.clone())
    }

    fn tpl(id: &str) -> DayTemplate {
        DayTemplate::new(
            id.to_string(),
            "Рабочий".to_string(),
            vec![1, 2, 3, 4, 5],
            vec![Rule::new("r1".into(), "preset".into(), "Фокус".into(), 120, RuleColor::Blue, "star".into()).unwrap()],
            true,
            None,
            None,
            None,
            None,
            1,
            1,
        )
        .unwrap()
    }

    #[tokio::test]
    async fn create_and_load_roundtrip() {
        let repo = test_repo().await;
        repo.save(&tpl("t1")).await.unwrap();

        let loaded = repo.find_by_id("t1").await.unwrap().unwrap();
        assert_eq!(loaded.name, "Рабочий");
        assert_eq!(loaded.days, vec![1, 2, 3, 4, 5]);
        assert_eq!(loaded.rules.len(), 1);
        assert_eq!(loaded.rules[0].name, "Фокус");
        assert_eq!(loaded.rules[0].color, RuleColor::Blue);
    }

    #[tokio::test]
    async fn update_persists_extra_fields() {
        let repo = test_repo().await;
        repo.save(&tpl("t2")).await.unwrap();

        let mut t = repo.find_by_id("t2").await.unwrap().unwrap();
        t.apply_update(
            None,
            None,
            None,
            Some(false),
            Some(Some(8 * 60)),
            Some(Some(180)),
            Some(Some("12h".to_string())),
            Some(Some("Europe/Moscow".to_string())),
        )
        .unwrap();
        repo.save(&t).await.unwrap();

        let loaded = repo.find_by_id("t2").await.unwrap().unwrap();
        assert!(!loaded.inherit_settings);
        assert_eq!(loaded.chain_start_min, Some(8 * 60));
        assert_eq!(loaded.daily_goal_min, Some(180));
        assert_eq!(loaded.time_format.as_deref(), Some("12h"));
        assert_eq!(loaded.timezone.as_deref(), Some("Europe/Moscow"));
    }

    #[tokio::test]
    async fn delete_removes_template() {
        let repo = test_repo().await;
        repo.save(&tpl("t3")).await.unwrap();
        repo.delete("t3").await.unwrap();
        assert!(repo.find_by_id("t3").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn list_returns_all() {
        let repo = test_repo().await;
        repo.save(&tpl("t4")).await.unwrap();
        repo.save(&tpl("t5")).await.unwrap();
        assert_eq!(repo.list().await.unwrap().len(), 2);
    }
}