//! Команды задач: CRUD для фронтенда.

use tauri::State;

use crate::application::task::{CreateTaskInput, TaskFilterInput, TaskView, UpdateTaskInput};
use crate::presentation::AppState;

#[tauri::command]
pub async fn create_task(
    state: State<'_, AppState>,
    input: CreateTaskInput,
) -> Result<TaskView, String> {
    state.tasks.create(input).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task(state: State<'_, AppState>, id: String) -> Result<TaskView, String> {
    state.tasks.get(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tasks(
    state: State<'_, AppState>,
    filter: Option<TaskFilterInput>,
) -> Result<Vec<TaskView>, String> {
    state
        .tasks
        .list(filter.unwrap_or_default())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task(
    state: State<'_, AppState>,
    id: String,
    input: UpdateTaskInput,
) -> Result<TaskView, String> {
    state.tasks.update(&id, input).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.tasks.delete(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn duplicate_task(state: State<'_, AppState>, id: String) -> Result<TaskView, String> {
    state.tasks.duplicate(&id).await.map_err(|e| e.to_string())
}