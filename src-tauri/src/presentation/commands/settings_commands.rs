//! Команды настроек: чтение и пакетное сохранение key-value.
//! Сервисы/интеграции (Telegram и т.п.) через эти команды не проходят.

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::presentation::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingEntry {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub async fn list_settings(state: State<'_, AppState>) -> Result<Vec<SettingEntry>, String> {
    let rows = state.settings.list().await.map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|(key, value)| SettingEntry { key, value })
        .collect())
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    entries: Vec<SettingEntry>,
) -> Result<(), String> {
    let pairs: Vec<(String, String)> = entries
        .into_iter()
        .map(|e| (e.key, e.value))
        .collect();
    state.settings.save(&pairs).await.map_err(|e| e.to_string())
}
