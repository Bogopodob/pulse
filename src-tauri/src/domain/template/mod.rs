//! Шаблоны дней. Шаблон домена — сущности начнём после tasks.

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct DayTemplate {
    pub id: String,
    pub name: String,
    pub days: Vec<u8>,
    pub inherit_settings: bool,
    pub chain_start_min: Option<i32>,
    pub rules: Vec<Rule>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct Rule {
    pub name: String,
    pub start_min: i32,
    pub duration_min: i32,
}