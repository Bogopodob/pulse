mod application;
mod domain;
mod infrastructure;
mod presentation;

use std::sync::Arc;

use tauri::Manager;

use presentation::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // SQLite + миграции
      let data_dir = app.handle().path().app_data_dir()?;
      let db = tauri::async_runtime::block_on(infrastructure::database::sqlite::SqliteDatabase::init(
        &data_dir.join("pulse.db"),
      ))
      .map_err(|e| format!("failed to init sqlite: {e}"))?;

      // Composition root: порт -> реализация (local SQLite), сервис -> команды
      let task_repo: Arc<dyn domain::task::repository::TaskRepository> =
        Arc::new(infrastructure::database::sqlite::task_repository::SqliteTaskRepository::new(
          db.pool.clone(),
        ));
      let tasks = application::task::TaskService::new(task_repo.clone());
      let sync = infrastructure::sync::SyncService::new(task_repo);

      app.manage(AppState {
        tasks,
        sync,
        _db: Arc::new(db.pool),
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      presentation::commands::task_commands::create_task,
      presentation::commands::task_commands::get_task,
      presentation::commands::task_commands::list_tasks,
      presentation::commands::task_commands::update_task,
      presentation::commands::task_commands::delete_task,
      presentation::commands::task_commands::duplicate_task,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}