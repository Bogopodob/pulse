//! Команды шаблонов: CRUD для фронтенда.

use tauri::State;

use crate::application::template::{CreateTemplateInput, TemplateView, UpdateTemplateInput};
use crate::presentation::AppState;

#[tauri::command]
pub async fn create_template(
    state: State<'_, AppState>,
    input: CreateTemplateInput,
) -> Result<TemplateView, String> {
    state.templates.create(input).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_template(state: State<'_, AppState>, id: String) -> Result<TemplateView, String> {
    state.templates.get(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_templates(state: State<'_, AppState>) -> Result<Vec<TemplateView>, String> {
    state.templates.list().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_template(
    state: State<'_, AppState>,
    id: String,
    input: UpdateTemplateInput,
) -> Result<TemplateView, String> {
    state.templates.update(&id, input).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_template(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.templates.delete(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn duplicate_template(state: State<'_, AppState>, id: String) -> Result<TemplateView, String> {
    state.templates.duplicate(&id).await.map_err(|e| e.to_string())
}