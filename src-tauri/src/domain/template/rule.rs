//! Блок шаблона — правило «что делать и сколько».

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuleColor {
    Blue,
    Amber,
    Teal,
    Violet,
    Rose,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    /// Тип блока (например, имя пресета), для совместимости с фронтом.
    #[allow(clippy::struct_field_names)]
    pub r#type: String,
    pub name: String,
    pub minutes: i32,
    pub color: RuleColor,
    pub icon: String,
}

impl Rule {
    pub fn new(
        id: String,
        r#type: String,
        name: String,
        minutes: i32,
        color: RuleColor,
        icon: String,
    ) -> Result<Self, TemplateValidationError> {
        if name.trim().is_empty() {
            return Err(TemplateValidationError::EmptyRuleName);
        }
        if !(1..=1440).contains(&minutes) {
            return Err(TemplateValidationError::InvalidRuleMinutes(minutes));
        }
        Ok(Self {
            id,
            r#type,
            name,
            minutes,
            color,
            icon,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TemplateValidationError {
    #[error("template name must not be empty")]
    EmptyName,
    #[error("day must be in 1..=7, got {0}")]
    InvalidDay(i32),
    #[error("duplicate day {0}")]
    DuplicateDay(i32),
    #[error("chain start minute must be in 0..=1440, got {0}")]
    InvalidChainStart(i32),
    #[error("daily goal minute must be positive, got {0}")]
    InvalidDailyGoal(i32),
    #[error("rule name must not be empty")]
    EmptyRuleName,
    #[error("rule minutes must be in 1..=1440, got {0}")]
    InvalidRuleMinutes(i32),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rule_rejects_bad_values() {
        assert!(Rule::new("r1".into(), "preset".into(), String::new(), 30, RuleColor::Blue, "star".into()).is_err());
        assert!(Rule::new("r1".into(), "preset".into(), "Блок".into(), 0, RuleColor::Blue, "star".into()).is_err());
        assert!(Rule::new("r1".into(), "preset".into(), "Блок".into(), 1500, RuleColor::Blue, "star".into()).is_err());
        assert!(Rule::new("r1".into(), "preset".into(), "Блок".into(), 30, RuleColor::Teal, "star".into()).is_ok());
    }
}