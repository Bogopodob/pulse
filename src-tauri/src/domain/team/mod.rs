//! Команда: участники расписания. Шаблон домена — сущности начнём после tasks.

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct TeamMember {
    pub id: String,
    pub name: String,
    pub initials: String,
    pub color: String,
    pub created_at: i64,
}