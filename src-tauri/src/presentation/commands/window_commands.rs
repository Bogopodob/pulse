use tauri::{LogicalSize, Manager, PhysicalSize, Window};

#[tauri::command]
pub async fn expand_window(window: Window) -> Result<(), String> {
    // Discord-like: из маленького frameless в нормальное окно
    let _ = window.set_decorations(true);
    let _ = window.set_resizable(true);
    let _ = window.set_min_size(Some(LogicalSize::new(900, 600)));
    // Плавно расширяем до целевого размера
    let target_w = 1200;
    let target_h = 800;
    // Центр после ресайза
    let _ = window.set_size(LogicalSize::new(target_w, target_h));
    let _ = window.center();
    // Снимаем transparent (если был) — не критично, оставляем как есть
    Ok(())
}

#[tauri::command]
pub async fn shrink_to_splash(window: Window) -> Result<(), String> {
    let _ = window.set_decorations(false);
    let _ = window.set_resizable(false);
    let _ = window.set_min_size(Some(LogicalSize::new(380, 380)));
    let _ = window.set_size(LogicalSize::new(380, 380));
    let _ = window.center();
    Ok(())
}
