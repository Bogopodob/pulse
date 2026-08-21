// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // WebKitGTK (Linux): DMABUF-рендерер вызывает фризы/подтормаживания
  // композитинга в Tauri. Отключаем до создания окна.
  #[cfg(target_os = "linux")]
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

  app_lib::run();
}
