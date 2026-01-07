use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    window::Color,
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg(windows)]
use windows::Win32::{
    Foundation::POINT,
    Graphics::Gdi::{GetDC, GetPixel, ReleaseDC},
    UI::Input::KeyboardAndMouse::GetAsyncKeyState,
    UI::WindowsAndMessaging::GetCursorPos,
};

#[tauri::command]
fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
fn show_window(window: tauri::Window) {
    let _ = window.center();
    let _ = window.show();
    let _ = window.set_focus();
}

#[cfg(windows)]
#[tauri::command]
async fn pick_color(window: tauri::Window) -> Result<String, String> {
    // Hide the launcher window
    let _ = window.hide();

    // Small delay to ensure window is hidden
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Wait for left mouse button click
    // VK_LBUTTON = 0x01
    const VK_LBUTTON: i32 = 0x01;
    const VK_ESCAPE: i32 = 0x1B;

    // Wait for any existing click to be released first
    loop {
        let state = unsafe { GetAsyncKeyState(VK_LBUTTON) };
        if state >= 0 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    // Now wait for a new click
    loop {
        // Check for escape key to cancel
        let escape_state = unsafe { GetAsyncKeyState(VK_ESCAPE) };
        if escape_state < 0 {
            return Err("Cancelled".to_string());
        }

        let state = unsafe { GetAsyncKeyState(VK_LBUTTON) };
        if state < 0 {
            // Button is pressed, get the color
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    // Get cursor position
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        let _ = GetCursorPos(&mut point);
    }

    // Get screen DC and pixel color
    let color = unsafe {
        let hdc = GetDC(None);
        let pixel = GetPixel(hdc, point.x, point.y);
        let _ = ReleaseDC(None, hdc);
        pixel
    };

    // Extract RGB (GetPixel returns 0x00BBGGRR)
    let r = (color.0 & 0xFF) as u8;
    let g = ((color.0 >> 8) & 0xFF) as u8;
    let b = ((color.0 >> 16) & 0xFF) as u8;

    let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);
    Ok(hex)
}

#[cfg(not(windows))]
#[tauri::command]
async fn pick_color(_window: tauri::Window) -> Result<String, String> {
    Err("Color picker is only supported on Windows".to_string())
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.center();
            let _ = window.show();
            let _ = window.set_focus();
            let _ = app.emit("focus-search", ());
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Setup logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create system tray
            let quit_item =
                tauri::menu::MenuItemBuilder::with_id("quit", "Quit BunchaTools").build(app)?;
            let show_item =
                tauri::menu::MenuItemBuilder::with_id("show", "Show (Alt+Q)").build(app)?;
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("BunchaTools")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        toggle_window(app);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Register global shortcut (Alt+Q)
            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyQ);
            let app_handle = app.handle().clone();
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, _shortcut, event| {
                        if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                            toggle_window(&app_handle);
                        }
                    })
                    .build(),
            )?;

            app.global_shortcut().register(shortcut)?;

            // Handle window blur (click outside)
            let window = app.get_webview_window("main").unwrap();

            // Set webview background to transparent (fixes white border on Windows)
            let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));

            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = window_clone.hide();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_window, show_window, pick_color])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
