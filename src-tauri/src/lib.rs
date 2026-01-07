use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    window::Color,
    AppHandle, Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(windows)]
use windows::Win32::{
    Foundation::POINT,
    Graphics::Gdi::{GetDC, GetPixel, ReleaseDC},
    UI::Input::KeyboardAndMouse::GetAsyncKeyState,
    UI::WindowsAndMessaging::{
        CopyIcon, GetCursorPos, LoadCursorW, SetSystemCursor, SystemParametersInfoW, HCURSOR,
        HICON, IDC_CROSS, OCR_NORMAL, SPI_SETCURSORS, SYSTEM_PARAMETERS_INFO_ACTION,
    },
};

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

// Settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub hotkey_modifiers: Vec<String>, // ["Alt"], ["Ctrl", "Shift"], etc.
    pub hotkey_key: String,            // "Q", "Space", etc.
    pub launch_at_startup: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hotkey_modifiers: vec!["Alt".to_string()],
            hotkey_key: "Q".to_string(),
            launch_at_startup: false,
        }
    }
}

// Global state for current shortcut
struct AppState {
    current_shortcut: Mutex<Option<Shortcut>>,
    settings: Mutex<Settings>,
}

fn get_settings_path(app: &AppHandle) -> PathBuf {
    let app_data = app.path().app_data_dir().unwrap();
    fs::create_dir_all(&app_data).unwrap_or_default();
    app_data.join("settings.json")
}

fn load_settings(app: &AppHandle) -> Settings {
    let path = get_settings_path(app);
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    Settings::default()
}

fn save_settings_to_file(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = get_settings_path(app);
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

fn parse_shortcut(modifiers: &[String], key: &str) -> Option<Shortcut> {
    let mut mods = Modifiers::empty();
    for m in modifiers {
        match m.to_lowercase().as_str() {
            "alt" => mods |= Modifiers::ALT,
            "ctrl" | "control" => mods |= Modifiers::CONTROL,
            "shift" => mods |= Modifiers::SHIFT,
            "super" | "win" | "meta" => mods |= Modifiers::SUPER,
            _ => {}
        }
    }

    let code = match key.to_uppercase().as_str() {
        "A" => Code::KeyA,
        "B" => Code::KeyB,
        "C" => Code::KeyC,
        "D" => Code::KeyD,
        "E" => Code::KeyE,
        "F" => Code::KeyF,
        "G" => Code::KeyG,
        "H" => Code::KeyH,
        "I" => Code::KeyI,
        "J" => Code::KeyJ,
        "K" => Code::KeyK,
        "L" => Code::KeyL,
        "M" => Code::KeyM,
        "N" => Code::KeyN,
        "O" => Code::KeyO,
        "P" => Code::KeyP,
        "Q" => Code::KeyQ,
        "R" => Code::KeyR,
        "S" => Code::KeyS,
        "T" => Code::KeyT,
        "U" => Code::KeyU,
        "V" => Code::KeyV,
        "W" => Code::KeyW,
        "X" => Code::KeyX,
        "Y" => Code::KeyY,
        "Z" => Code::KeyZ,
        "0" => Code::Digit0,
        "1" => Code::Digit1,
        "2" => Code::Digit2,
        "3" => Code::Digit3,
        "4" => Code::Digit4,
        "5" => Code::Digit5,
        "6" => Code::Digit6,
        "7" => Code::Digit7,
        "8" => Code::Digit8,
        "9" => Code::Digit9,
        "SPACE" => Code::Space,
        "ENTER" => Code::Enter,
        "ESCAPE" | "ESC" => Code::Escape,
        "TAB" => Code::Tab,
        "F1" => Code::F1,
        "F2" => Code::F2,
        "F3" => Code::F3,
        "F4" => Code::F4,
        "F5" => Code::F5,
        "F6" => Code::F6,
        "F7" => Code::F7,
        "F8" => Code::F8,
        "F9" => Code::F9,
        "F10" => Code::F10,
        "F11" => Code::F11,
        "F12" => Code::F12,
        _ => return None,
    };

    let mods_option = if mods.is_empty() { None } else { Some(mods) };
    Some(Shortcut::new(mods_option, code))
}

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

#[tauri::command]
fn get_settings(app: AppHandle) -> Settings {
    let state = app.state::<AppState>();
    let settings = state.settings.lock().unwrap().clone();
    settings
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    // Save to file
    save_settings_to_file(&app, &settings)?;

    // Update state
    let state = app.state::<AppState>();
    *state.settings.lock().unwrap() = settings.clone();

    // Update hotkey
    update_global_shortcut(&app, &settings)?;

    // Update startup setting
    #[cfg(windows)]
    set_launch_at_startup_internal(settings.launch_at_startup)?;

    Ok(())
}

#[tauri::command]
fn get_launch_at_startup() -> Result<bool, String> {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu
            .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
            .map_err(|e| e.to_string())?;
        Ok(run_key.get_value::<String, _>("BunchaTools").is_ok())
    }
    #[cfg(not(windows))]
    {
        Ok(false)
    }
}

#[cfg(windows)]
fn set_launch_at_startup_internal(enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| e.to_string())?;

    if enable {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        run_key
            .set_value("BunchaTools", &exe_path.to_string_lossy().to_string())
            .map_err(|e| e.to_string())?;
    } else {
        let _ = run_key.delete_value("BunchaTools");
    }
    Ok(())
}

fn update_global_shortcut(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let state = app.state::<AppState>();

    // Unregister old shortcut
    if let Some(old_shortcut) = state.current_shortcut.lock().unwrap().take() {
        let _ = app.global_shortcut().unregister(old_shortcut);
    }

    // Register new shortcut
    if let Some(new_shortcut) = parse_shortcut(&settings.hotkey_modifiers, &settings.hotkey_key) {
        app.global_shortcut()
            .register(new_shortcut.clone())
            .map_err(|e| e.to_string())?;
        *state.current_shortcut.lock().unwrap() = Some(new_shortcut);
    }

    Ok(())
}

#[cfg(windows)]
#[tauri::command]
async fn pick_color(window: tauri::Window) -> Result<String, String> {
    let _ = window.hide();
    std::thread::sleep(std::time::Duration::from_millis(100));

    unsafe {
        let cross_cursor = LoadCursorW(None, IDC_CROSS).map_err(|e| e.to_string())?;
        let cursor_copy = CopyIcon(HICON(cross_cursor.0)).map_err(|e| e.to_string())?;
        let _ = SetSystemCursor(HCURSOR(cursor_copy.0), OCR_NORMAL);
    }

    let restore_cursors = || unsafe {
        let _ = SystemParametersInfoW(
            SYSTEM_PARAMETERS_INFO_ACTION(SPI_SETCURSORS.0),
            0,
            None,
            Default::default(),
        );
    };

    const VK_LBUTTON: i32 = 0x01;
    const VK_ESCAPE: i32 = 0x1B;

    loop {
        let state = unsafe { GetAsyncKeyState(VK_LBUTTON) };
        if state >= 0 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    loop {
        let escape_state = unsafe { GetAsyncKeyState(VK_ESCAPE) };
        if escape_state < 0 {
            restore_cursors();
            return Err("Cancelled".to_string());
        }

        let state = unsafe { GetAsyncKeyState(VK_LBUTTON) };
        if state < 0 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    restore_cursors();

    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        let _ = GetCursorPos(&mut point);
    }

    let color = unsafe {
        let hdc = GetDC(None);
        let pixel = GetPixel(hdc, point.x, point.y);
        let _ = ReleaseDC(None, hdc);
        pixel
    };

    let r = (color.0 & 0xFF) as u8;
    let g = ((color.0 >> 8) & 0xFF) as u8;
    let b = ((color.0 >> 16) & 0xFF) as u8;

    Ok(format!("#{:02X}{:02X}{:02X}", r, g, b))
}

#[cfg(not(windows))]
#[tauri::command]
async fn pick_color(_window: tauri::Window) -> Result<String, String> {
    Err("Color picker is only supported on Windows".to_string())
}

fn toggle_window(app: &AppHandle) {
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState {
            current_shortcut: Mutex::new(None),
            settings: Mutex::new(Settings::default()),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Load settings
            let settings = load_settings(app.handle());
            {
                let state = app.state::<AppState>();
                *state.settings.lock().unwrap() = settings.clone();
            }

            // Create system tray
            let hotkey_display = format!(
                "{}+{}",
                settings.hotkey_modifiers.join("+"),
                settings.hotkey_key
            );
            let quit_item =
                tauri::menu::MenuItemBuilder::with_id("quit", "Quit BunchaTools").build(app)?;
            let show_item = tauri::menu::MenuItemBuilder::with_id(
                "show",
                format!("Show ({})", hotkey_display),
            )
            .build(app)?;
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
                    "quit" => app.exit(0),
                    "show" => toggle_window(app),
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

            // Register global shortcut with handler
            let app_handle = app.handle().clone();
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            // Check current state shortcut
                            let state = _app.state::<AppState>();
                            let current_shortcut = state.current_shortcut.lock().unwrap().clone();
                            if let Some(current) = current_shortcut {
                                if shortcut == &current {
                                    toggle_window(&app_handle);
                                }
                            }
                        }
                    })
                    .build(),
            )?;

            // Register the initial shortcut
            if let Some(shortcut) =
                parse_shortcut(&settings.hotkey_modifiers, &settings.hotkey_key)
            {
                app.global_shortcut().register(shortcut.clone())?;
                let state = app.state::<AppState>();
                *state.current_shortcut.lock().unwrap() = Some(shortcut);
            }

            // Handle window events
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));

            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = window_clone.hide();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            pick_color,
            get_settings,
            save_settings,
            get_launch_at_startup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
