//! Сущность шаблона дня — корень агрегата (шаблон + его блоки).

use super::rule::{Rule, TemplateValidationError};

/// Сутки в минутах — жёсткий потолок для цепочки правил.
pub const DAY_LIMIT_MIN: i32 = 1440;

/// Цепочка правил целиком обязана помещаться в сутки: от начала цепочки
/// до 24:00. Используется и при создании, и перед записью обновлений в БД.
fn validate_rules_within_day(
    rules: &[Rule],
    chain_start_min: Option<i32>,
) -> Result<(), TemplateValidationError> {
    let start = chain_start_min.unwrap_or(0).clamp(0, DAY_LIMIT_MIN);
    let total: i32 = rules.iter().map(|r| r.minutes).sum();
    let limit = DAY_LIMIT_MIN - start;
    if total > limit {
        return Err(TemplateValidationError::RulesExceedDay { total, limit });
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct DayTemplate {
    pub id: String,
    pub name: String,
    /// Дни недели 1..=7 (1 = понедельник). Пусто = вручную.
    pub days: Vec<i32>,
    pub rules: Vec<Rule>,
    pub inherit_settings: bool,
    pub chain_start_min: Option<i32>,
    pub daily_goal_min: Option<i32>,
    pub time_format: Option<String>,
    pub timezone: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl DayTemplate {
    pub fn new(
        id: String,
        name: String,
        days: Vec<i32>,
        rules: Vec<Rule>,
        inherit_settings: bool,
        chain_start_min: Option<i32>,
        daily_goal_min: Option<i32>,
        time_format: Option<String>,
        timezone: Option<String>,
        created_at: i64,
        updated_at: i64,
    ) -> Result<Self, TemplateValidationError> {
        if name.trim().is_empty() {
            return Err(TemplateValidationError::EmptyName);
        }
        validate_days(&days)?;
        validate_chain_start(chain_start_min)?;
        if let Some(g) = daily_goal_min {
            if g < 0 {
                return Err(TemplateValidationError::InvalidDailyGoal(g));
            }
        }
        validate_rules_within_day(&rules, chain_start_min)?;
        Ok(Self {
            id,
            name,
            days,
            rules,
            inherit_settings,
            chain_start_min,
            daily_goal_min,
            time_format,
            timezone,
            created_at,
            updated_at,
        })
    }

    /// Атомарное частичное обновление: при ошибке состояние не меняется.
    pub fn apply_update(
        &mut self,
        name: Option<String>,
        days: Option<Vec<i32>>,
        rules: Option<Vec<Rule>>,
        inherit_settings: Option<bool>,
        chain_start_min: Option<Option<i32>>,
        daily_goal_min: Option<Option<i32>>,
        time_format: Option<Option<String>>,
        timezone: Option<Option<String>>,
    ) -> Result<(), TemplateValidationError> {
        let next_name = match name {
            Some(n) if n.trim().is_empty() => return Err(TemplateValidationError::EmptyName),
            Some(n) => n,
            None => self.name.clone(),
        };
        if let Some(days) = &days {
            validate_days(days)?;
        }
        if let Some(c) = chain_start_min {
            validate_chain_start(c)?;
        }
        if let Some(Some(g)) = daily_goal_min {
            if g < 0 {
                return Err(TemplateValidationError::InvalidDailyGoal(g));
            }
        }
        if let Some(rules) = &rules {
            // повторно валидируем правила (они уже валидны по построению Rule::new,
            // но перестраховка от некорректного входа)
            for r in rules {
                if r.name.trim().is_empty() {
                    return Err(TemplateValidationError::EmptyRuleName);
                }
                if !(1..=1440).contains(&r.minutes) {
                    return Err(TemplateValidationError::InvalidRuleMinutes(r.minutes));
                }
            }
        }

        // Перед записью в БД: цепочка с учётом НОВОГО начала дня обязана
        // помещаться в сутки. Проверяем только когда правила реально меняются,
        // чтобы не блокировать правки имён/настроек у легаси-данных.
        if let Some(rules) = &rules {
            let next_chain_start = match chain_start_min {
                Some(v) => v,
                None => self.chain_start_min,
            };
            validate_rules_within_day(rules, next_chain_start)?;
        }

        self.name = next_name;
        if let Some(d) = days {
            self.days = d;
        }
        if let Some(r) = rules {
            self.rules = r;
        }
        if let Some(v) = inherit_settings {
            self.inherit_settings = v;
        }
        if let Some(v) = chain_start_min {
            self.chain_start_min = v;
        }
        if let Some(v) = daily_goal_min {
            self.daily_goal_min = v;
        }
        if let Some(v) = time_format {
            self.time_format = v;
        }
        if let Some(v) = timezone {
            self.timezone = v;
        }
        self.updated_at = now_ms();
        Ok(())
    }
}

fn validate_days(days: &[i32]) -> Result<(), TemplateValidationError> {
    let mut seen = std::collections::HashSet::new();
    for d in days {
        if !(1..=7).contains(d) {
            return Err(TemplateValidationError::InvalidDay(*d));
        }
        if !seen.insert(*d) {
            return Err(TemplateValidationError::DuplicateDay(*d));
        }
    }
    Ok(())
}

fn validate_chain_start(v: Option<i32>) -> Result<(), TemplateValidationError> {
    if let Some(c) = v {
        if !(0..=1440).contains(&c) {
            return Err(TemplateValidationError::InvalidChainStart(c));
        }
    }
    Ok(())
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::template::rule::RuleColor;

    fn tpl(id: &str) -> DayTemplate {
        DayTemplate::new(
            id.to_string(),
            "Рабочий день".to_string(),
            vec![1, 2, 3],
            vec![],
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

    fn rule(name: &str) -> Rule {
        Rule::new("r".into(), "preset".into(), name.to_string(), 30, RuleColor::Blue, "star".into()).unwrap()
    }

    #[test]
    fn accepts_valid_template() {
        assert!(DayTemplate::new(
            "t".into(),
            "Шаблон".into(),
            vec![],
            vec![rule("Блок")],
            false,
            Some(9 * 60),
            Some(240),
            Some("24h".into()),
            Some("UTC".into()),
            1,
            1,
        )
        .is_ok());
    }

    #[test]
    fn rejects_empty_name_and_bad_days() {
        assert!(matches!(
            DayTemplate::new("t".into(), "  ".into(), vec![], vec![], true, None, None, None, None, 1, 1),
            Err(TemplateValidationError::EmptyName)
        ));
        assert!(matches!(
            DayTemplate::new("t".into(), "A".into(), vec![0], vec![], true, None, None, None, None, 1, 1),
            Err(TemplateValidationError::InvalidDay(0))
        ));
        assert!(matches!(
            DayTemplate::new("t".into(), "A".into(), vec![8], vec![], true, None, None, None, None, 1, 1),
            Err(TemplateValidationError::InvalidDay(8))
        ));
        assert!(matches!(
            DayTemplate::new("t".into(), "A".into(), vec![3, 3], vec![], true, None, None, None, None, 1, 1),
            Err(TemplateValidationError::DuplicateDay(3))
        ));
    }

    #[test]
    fn rejects_bad_chain_start() {
        assert!(DayTemplate::new("t".into(), "A".into(), vec![], vec![], true, Some(1500), None, None, None, 1, 1).is_err());
        assert!(DayTemplate::new("t".into(), "A".into(), vec![], vec![], true, Some(-1), None, None, None, 1, 1).is_err());
    }

    #[test]
    fn rejects_rules_over_24h_on_create() {
        let rules = vec![rule("Работа"), rule("Отдых"), rule("Ещё")]; // 3 × 30 = 90 мин — ок
        assert!(DayTemplate::new("t".into(), "A".into(), vec![], rules, true, None, None, None, None, 1, 1).is_ok());

        let mut long_rules = Vec::new();
        for i in 0..50 {
            long_rules.push(Rule::new(format!("r{i}"), "preset".into(), format!("Блок {i}"), 30, RuleColor::Blue, "star".into()).unwrap());
        } // 50 × 30 = 1500 мин > 1440
        assert!(matches!(
            DayTemplate::new("t".into(), "A".into(), vec![], long_rules, true, None, None, None, None, 1, 1),
            Err(TemplateValidationError::RulesExceedDay { total: 1500, limit: 1440 })
        ));
    }

    #[test]
    fn rejects_rules_over_24h_with_explicit_chain_start() {
        // Начало в 18:00 → до полуночи остаётся 360 мин, а блоков на 400
        let rules = vec![
            Rule::new("a".into(), "preset".into(), "A".into(), 200, RuleColor::Teal, "star".into()).unwrap(),
            Rule::new("b".into(), "preset".into(), "B".into(), 200, RuleColor::Rose, "star".into()).unwrap(),
        ];
        assert!(matches!(
            DayTemplate::new("t".into(), "A".into(), vec![], rules.clone(), true, Some(18 * 60), None, None, None, 1, 1),
            Err(TemplateValidationError::RulesExceedDay { total: 400, limit: 360 })
        ));
        // Ровно впритык — разрешено
        let fits = vec![
            Rule::new("a".into(), "preset".into(), "A".into(), 200, RuleColor::Teal, "star".into()).unwrap(),
            Rule::new("b".into(), "preset".into(), "B".into(), 160, RuleColor::Rose, "star".into()).unwrap(),
        ];
        assert!(DayTemplate::new("t".into(), "A".into(), vec![], fits, true, Some(18 * 60), None, None, None, 1, 1).is_ok());
    }

    #[test]
    fn update_rejects_overbooked_rules_and_stays_atomic() {
        let mut t = tpl("t1"); // chain_start не задан → лимит 1440
        let err = t.apply_update(
            None,
            None,
            Some(vec![
                Rule::new("a".into(), "preset".into(), "A".into(), 800, RuleColor::Teal, "star".into()).unwrap(),
                Rule::new("b".into(), "preset".into(), "B".into(), 700, RuleColor::Rose, "star".into()).unwrap(),
            ]),
            None,
            None,
            None,
            None,
            None,
        );
        assert!(matches!(
            err,
            Err(TemplateValidationError::RulesExceedDay { total: 1500, limit: 1440 })
        ));
        assert!(t.rules.is_empty()); // состояние не изменилось

        // Обновление chain_start вместе с правилами учитывает новое начало
        let err2 = t.apply_update(
            None,
            None,
            Some(vec![
                Rule::new("a".into(), "preset".into(), "A".into(), 200, RuleColor::Teal, "star".into()).unwrap(),
                Rule::new("b".into(), "preset".into(), "B".into(), 200, RuleColor::Rose, "star".into()).unwrap(),
            ]),
            None,
            Some(Some(18 * 60)),
            None,
            None,
            None,
        );
        assert!(matches!(
            err2,
            Err(TemplateValidationError::RulesExceedDay { total: 400, limit: 360 })
        ));
        assert_eq!(t.chain_start_min, None);
    }

    #[test]
    fn update_is_atomic() {
        let mut t = tpl("t1");
        let err = t.apply_update(Some("   ".into()), None, None, None, None, None, None, None);
        assert!(matches!(err, Err(TemplateValidationError::EmptyName)));
        assert_eq!(t.name, "Рабочий день");

        let err = t.apply_update(None, Some(vec![5, 5]), None, None, None, None, None, None);
        assert!(err.is_err());
        assert_eq!(t.days, vec![1, 2, 3]);

        t.apply_update(Some("Вечер".into()), Some(vec![6, 7]), Some(vec![rule("Блок")]), Some(false), Some(Some(18 * 60)), Some(Some(120)), None, None)
            .unwrap();
        assert_eq!(t.name, "Вечер");
        assert_eq!(t.days, vec![6, 7]);
        assert_eq!(t.rules.len(), 1);
        assert_eq!(t.chain_start_min, Some(18 * 60));
        assert_eq!(t.daily_goal_min, Some(120));
    }
}