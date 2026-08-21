//! Use cases шаблонов: create, get, list, update, delete, duplicate.

use std::sync::Arc;

use uuid::Uuid;

use crate::application::ServiceError;
use crate::domain::template::repository::TemplateRepository;
use crate::domain::template::template::DayTemplate;

use super::dto::{CreateTemplateInput, TemplateView, UpdateTemplateInput};

pub struct TemplateService {
    repo: Arc<dyn TemplateRepository>,
}

impl TemplateService {
    pub fn new(repo: Arc<dyn TemplateRepository>) -> Self {
        Self { repo }
    }

    pub async fn create(&self, input: CreateTemplateInput) -> Result<TemplateView, ServiceError> {
        let rules = input
            .rules
            .into_iter()
            .map(|r| r.try_into())
            .collect::<Result<Vec<_>, _>>()?;
        let now = chrono::Utc::now().timestamp_millis();
        let tpl = DayTemplate::new(
            Uuid::new_v4().to_string(),
            input.name,
            input.days,
            rules,
            input.inherit_settings,
            input.chain_start_min,
            input.daily_goal_min,
            input.time_format,
            input.timezone,
            now,
            now,
        )?;
        self.repo.save(&tpl).await?;
        Ok(TemplateView::from(&tpl))
    }

    pub async fn get(&self, id: &str) -> Result<TemplateView, ServiceError> {
        match self.repo.find_by_id(id).await? {
            Some(t) => Ok(TemplateView::from(&t)),
            None => Err(ServiceError::NotFound(format!("template {id}"))),
        }
    }

    pub async fn list(&self) -> Result<Vec<TemplateView>, ServiceError> {
        let all = self.repo.list().await?;
        Ok(all.iter().map(TemplateView::from).collect())
    }

    pub async fn update(&self, id: &str, input: UpdateTemplateInput) -> Result<TemplateView, ServiceError> {
        let mut tpl = match self.repo.find_by_id(id).await? {
            Some(t) => t,
            None => return Err(ServiceError::NotFound(format!("template {id}"))),
        };
        let rules = match input.rules {
            Some(rs) => Some(
                rs.into_iter()
                    .map(|r| r.try_into())
                    .collect::<Result<Vec<_>, _>>()?,
            ),
            None => None,
        };
        tpl.apply_update(
            input.name,
            input.days,
            rules,
            input.inherit_settings,
            input.chain_start_min,
            input.daily_goal_min,
            input.time_format,
            input.timezone,
        )?;
        self.repo.save(&tpl).await?;
        Ok(TemplateView::from(&tpl))
    }

    pub async fn delete(&self, id: &str) -> Result<(), ServiceError> {
        if self.repo.find_by_id(id).await?.is_none() {
            return Err(ServiceError::NotFound(format!("template {id}")));
        }
        self.repo.delete(id).await?;
        Ok(())
    }

    pub async fn duplicate(&self, id: &str) -> Result<TemplateView, ServiceError> {
        let tpl = match self.repo.find_by_id(id).await? {
            Some(t) => t,
            None => return Err(ServiceError::NotFound(format!("template {id}"))),
        };
        let now = chrono::Utc::now().timestamp_millis();
        let copy = DayTemplate::new(
            Uuid::new_v4().to_string(),
            format!("{} · копия", tpl.name),
            tpl.days.clone(),
            tpl.rules
                .iter()
                .map(|r| {
                    Rule::new(
                        Uuid::new_v4().to_string(),
                        r.r#type.clone(),
                        r.name.clone(),
                        r.minutes,
                        r.color,
                        r.icon.clone(),
                    )
                })
                .collect::<Result<Vec<_>, _>>()?,
            tpl.inherit_settings,
            tpl.chain_start_min,
            tpl.daily_goal_min,
            tpl.time_format,
            tpl.timezone,
            now,
            now,
        )?;
        self.repo.save(&copy).await?;
        Ok(TemplateView::from(&copy))
    }
}

use crate::domain::template::rule::Rule;