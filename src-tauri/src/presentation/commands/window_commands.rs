use tauri::{LogicalSize, Manager, PhysicalSize, Window};

#[tauri::command]
pub async fn expand_window(window: Window) -> Result<(), String> {
    // Discord-like: из маленького 380×380 frameless в нормальное окно
    // Сначала ставим декорации и ресайз, потом размер и центр — порядок важен для позиционирования
    let _ = window.set_decorations(true);
    let _ = window.set_resizable(true);
    let _ = window.set_min_size(Some(LogicalSize::new(900, 600)));
    let target_w = 1200;
    let target_h = 800;
    let _ = window.set_size(LogicalSize::new(target_w, target_h));
    // Явно центрируем по монитору, а не просто window.center() (который может оставить смещение от 380 окна)
    if let Some(monitor) = window.primary_monitor().unwrap_or(None) {
        let m_size = monitor.size();
        let m_pos = monitor.position();
        let scale = monitor.scale_factor();
        let phys_w = (target_w as f64 * scale) as i32;
        let phys_h = (target_h as f64 * scale) as i32;
        let x = m_pos.x + (m_size.width as i32 - phys_w) / 2;
        let y = m_pos.y + (m_size.height as i32 - phys_h) / 2;
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
    } else {
        let _ = window.center();
    }
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
