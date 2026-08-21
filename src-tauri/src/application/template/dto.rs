//! DTO шаблонов — граница между фронтендом и use cases.

use crate::domain::template::rule::{Rule, RuleColor};
use crate::domain::template::template::DayTemplate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDto {
    pub id: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub name: String,
    pub minutes: i32,
    pub color: RuleColor,
    pub icon: String,
}

impl From<&Rule> for RuleDto {
    fn from(r: &Rule) -> Self {
        Self {
            id: r.id.clone(),
            r#type: r.r#type.clone(),
            name: r.name.clone(),
            minutes: r.minutes,
            color: r.color,
            icon: r.icon.clone(),
        }
    }
}

impl TryFrom<RuleDto> for Rule {
    type Error = crate::domain::template::rule::TemplateValidationError;

    fn try_from(d: RuleDto) -> Result<Self, Self::Error> {
        Rule::new(d.id, d.r#type, d.name, d.minutes, d.color, d.icon)
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateInput {
    pub name: String,
    #[serde(default)]
    pub days: Vec<i32>,
    #[serde(default)]
    pub rules: Vec<RuleDto>,
    #[serde(default = "default_true")]
    pub inherit_settings: bool,
    pub chain_start_min: Option<i32>,
    pub daily_goal_min: Option<i32>,
    pub time_format: Option<String>,
    pub timezone: Option<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, Default)]
pub struct UpdateTemplateInput {
    pub name: Option<String>,
    pub days: Option<Vec<i32>>,
    pub rules: Option<Vec<RuleDto>>,
    pub inherit_settings: Option<bool>,
    /// Some(None) — сбросить.
    pub chain_start_min: Option<Option<i32>>,
    pub daily_goal_min: Option<Option<i32>>,
    pub time_format: Option<Option<String>>,
    pub timezone: Option<Option<String>>,
}

#[derive(Debug, Serialize)]
pub struct TemplateView {
    pub id: String,
    pub name: String,
    pub days: Vec<i32>,
    pub rules: Vec<RuleDto>,
    pub inherit_settings: bool,
    pub chain_start_min: Option<i32>,
    pub daily_goal_min: Option<i32>,
    pub time_format: Option<String>,
    pub timezone: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<&DayTemplate> for TemplateView {
    fn from(t: &DayTemplate) -> Self {
        Self {
            id: t.id.clone(),
            name: t.name.clone(),
            days: t.days.clone(),
            rules: t.rules.iter().map(RuleDto::from).collect(),
            inherit_settings: t.inherit_settings,
            chain_start_min: t.chain_start_min,
            daily_goal_min: t.daily_goal_min,
            time_format: t.time_format.clone(),
            timezone: t.timezone.clone(),
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}