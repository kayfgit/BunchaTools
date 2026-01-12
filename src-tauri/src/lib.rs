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
    UI::Input::KeyboardAndMouse::{GetAsyncKeyState, SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_C, VK_CONTROL},
    UI::WindowsAndMessaging::{
        CopyIcon, GetCursorPos, LoadCursorW, SetSystemCursor, SystemParametersInfoW, HCURSOR,
        HICON, IDC_CROSS, IDC_IBEAM, OCR_NORMAL, SPI_SETCURSORS, SYSTEM_PARAMETERS_INFO_ACTION,
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
    #[serde(default)]
    pub window_position: Option<(i32, i32)>, // Saved window position (x, y)
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hotkey_modifiers: vec!["Alt".to_string()],
            hotkey_key: "Q".to_string(),
            launch_at_startup: false,
            window_position: None,
        }
    }
}

// Global state for current shortcut
struct AppState {
    current_shortcut: Mutex<Option<Shortcut>>,
    settings: Mutex<Settings>,
    auto_hide_enabled: Mutex<bool>,
    is_dragging: Mutex<bool>,
    window_ready: Mutex<bool>,
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

#[tauri::command]
fn set_auto_hide(app: AppHandle, enabled: bool) {
    let state = app.state::<AppState>();
    *state.auto_hide_enabled.lock().unwrap() = enabled;
}

#[tauri::command]
fn set_dragging(app: AppHandle, dragging: bool) {
    let state = app.state::<AppState>();
    *state.is_dragging.lock().unwrap() = dragging;
}

#[tauri::command]
fn mark_window_ready(app: AppHandle) {
    let state = app.state::<AppState>();
    *state.window_ready.lock().unwrap() = true;
    log::info!("Window marked as ready");
}

#[tauri::command]
fn save_window_position(app: AppHandle, x: i32, y: i32) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut settings = state.settings.lock().unwrap();
    settings.window_position = Some((x, y));
    save_settings_to_file(&app, &settings)
}

#[tauri::command]
async fn convert_image(app: AppHandle, input_path: String, output_path: String) -> Result<(), String> {
    // Emit start
    let _ = app.emit("conversion-progress", 0);

    // Load image
    let _ = app.emit("conversion-progress", 30);
    let img = image::open(&input_path).map_err(|e| e.to_string())?;

    // Save image
    let _ = app.emit("conversion-progress", 70);
    img.save(&output_path).map_err(|e| e.to_string())?;

    // Complete
    let _ = app.emit("conversion-progress", 100);
    Ok(())
}

// Helper to get media duration using ffmpeg
fn get_media_duration(ffmpeg_path: &std::path::Path, input_path: &str) -> Option<f64> {
    let output = std::process::Command::new(ffmpeg_path)
        .args(["-i", input_path])
        .output()
        .ok()?;

    // FFmpeg outputs duration to stderr
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Parse duration from "Duration: HH:MM:SS.ms"
    for line in stderr.lines() {
        if line.contains("Duration:") {
            if let Some(duration_str) = line.split("Duration:").nth(1) {
                let duration_part = duration_str.split(',').next()?.trim();
                let parts: Vec<&str> = duration_part.split(':').collect();
                if parts.len() == 3 {
                    let hours: f64 = parts[0].parse().ok()?;
                    let minutes: f64 = parts[1].parse().ok()?;
                    let seconds: f64 = parts[2].parse().ok()?;
                    return Some(hours * 3600.0 + minutes * 60.0 + seconds);
                }
            }
        }
    }
    None
}

// Helper to parse time from ffmpeg progress output
fn parse_time_from_progress(line: &str) -> Option<f64> {
    // Format: "out_time_ms=123456789" or "out_time=00:01:23.456789"
    if line.starts_with("out_time_ms=") {
        let ms_str = line.strip_prefix("out_time_ms=")?;
        let ms: i64 = ms_str.parse().ok()?;
        return Some(ms as f64 / 1_000_000.0);
    }
    if line.starts_with("out_time=") {
        let time_str = line.strip_prefix("out_time=")?;
        let parts: Vec<&str> = time_str.split(':').collect();
        if parts.len() == 3 {
            let hours: f64 = parts[0].parse().ok()?;
            let minutes: f64 = parts[1].parse().ok()?;
            let seconds: f64 = parts[2].parse().ok()?;
            return Some(hours * 3600.0 + minutes * 60.0 + seconds);
        }
    }
    None
}

#[tauri::command]
async fn convert_media(
    app: AppHandle,
    input_path: String,
    output_path: String,
) -> Result<(), String> {
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Stdio};

    // Get bundled ffmpeg path - try multiple locations
    let ffmpeg = {
        // First try: relative to executable (for production builds)
        let exe_dir = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Failed to get exe directory")?
            .to_path_buf();

        // Get current working directory
        let cwd = std::env::current_dir().unwrap_or_default();

        let possible_paths = vec![
            // Production paths
            exe_dir.join("ffmpeg.exe"),
            exe_dir.join("binaries").join("ffmpeg.exe"),
            // Development paths (relative to cwd)
            cwd.join("src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe"),
            cwd.join("binaries/ffmpeg-x86_64-pc-windows-msvc.exe"),
            // Absolute path for this project
            std::path::PathBuf::from(r"C:\projects\BunchaTools\src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe"),
        ];

        let mut found_path = None;
        for path in &possible_paths {
            if path.exists() {
                found_path = Some(path.clone());
                log::info!("Found FFmpeg at: {:?}", path);
                break;
            }
        }

        found_path.ok_or_else(|| {
            format!("FFmpeg not found. CWD: {:?}, Searched in: {:?}", cwd, possible_paths)
        })?
    };

    // Get total duration
    let total_duration = get_media_duration(&ffmpeg, &input_path).unwrap_or(0.0);

    // Emit initial progress
    let _ = app.emit("conversion-progress", 0);

    // Run ffmpeg with progress output
    let mut child = Command::new(&ffmpeg)
        .args([
            "-i", &input_path,
            "-y",
            "-progress", "pipe:1",
            "-nostats",
            &output_path
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    // Read progress from stdout
    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let mut last_progress = 0;

        for line in reader.lines() {
            if let Ok(line) = line {
                if let Some(current_time) = parse_time_from_progress(&line) {
                    if total_duration > 0.0 {
                        let progress = ((current_time / total_duration) * 100.0).min(99.0) as i32;
                        // Only emit in increments of 10
                        let progress_rounded = (progress / 10) * 10;
                        if progress_rounded > last_progress {
                            last_progress = progress_rounded;
                            let _ = app.emit("conversion-progress", progress_rounded);
                        }
                    }
                }
            }
        }
    }

    // Wait for process to complete
    let status = child.wait().map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("Conversion failed".to_string());
    }

    // Emit completion
    let _ = app.emit("conversion-progress", 100);
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

// Port process info structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortProcess {
    pub pid: u32,
    pub name: String,
    pub port: u16,
    pub protocol: String,
}

#[tauri::command]
async fn scan_port(port: u16) -> Result<Vec<PortProcess>, String> {
    use std::process::Command;

    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut processes: Vec<PortProcess> = Vec::new();
    let mut seen_pids: std::collections::HashSet<u32> = std::collections::HashSet::new();

    for line in stdout.lines() {
        // Parse lines like: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            let protocol = parts[0];
            let local_addr = parts[1];

            // Check if this is TCP or UDP
            if protocol != "TCP" && protocol != "UDP" {
                continue;
            }

            // Parse the port from local address (format: IP:PORT or [IPv6]:PORT)
            let port_str = if local_addr.contains('[') {
                // IPv6: [::]:port
                local_addr.rsplit(':').next()
            } else {
                // IPv4: 0.0.0.0:port
                local_addr.rsplit(':').next()
            };

            if let Some(port_str) = port_str {
                if let Ok(local_port) = port_str.parse::<u16>() {
                    if local_port == port {
                        // Get PID (last column for TCP, different for UDP)
                        let pid_str = if protocol == "TCP" && parts.len() >= 5 {
                            parts[4]
                        } else if protocol == "UDP" && parts.len() >= 4 {
                            parts[3]
                        } else {
                            continue;
                        };

                        if let Ok(pid) = pid_str.parse::<u32>() {
                            if pid == 0 || seen_pids.contains(&pid) {
                                continue;
                            }
                            seen_pids.insert(pid);

                            // Get process name using tasklist
                            let process_name = get_process_name(pid).unwrap_or_else(|| "Unknown".to_string());

                            processes.push(PortProcess {
                                pid,
                                name: process_name,
                                port: local_port,
                                protocol: protocol.to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(processes)
}

fn get_process_name(pid: u32) -> Option<String> {
    use std::process::Command;

    let output = Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().next()?;

    // Parse CSV: "process.exe","12345",...
    let parts: Vec<&str> = line.split(',').collect();
    if !parts.is_empty() {
        let name = parts[0].trim_matches('"');
        return Some(name.to_string());
    }

    None
}

#[tauri::command]
async fn kill_port_process(pid: u32) -> Result<(), String> {
    use std::process::Command;

    let output = Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to kill process: {}", stderr));
    }

    Ok(())
}

// Currency conversion response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyResult {
    pub amount: f64,
    pub from: String,
    pub to: String,
    pub result: f64,
    pub rate: f64,
}

#[tauri::command]
async fn convert_currency(amount: f64, from: String, to: String) -> Result<CurrencyResult, String> {
    // Use frankfurter.app - free, no API key required
    let url = format!(
        "https://api.frankfurter.app/latest?amount={}&from={}&to={}",
        amount,
        from.to_uppercase(),
        to.to_uppercase()
    );

    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch rates: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let to_upper = to.to_uppercase();
    let result_value = data["rates"][&to_upper]
        .as_f64()
        .ok_or_else(|| format!("Currency '{}' not found", to_upper))?;

    // Calculate the rate (1 unit of source currency)
    let rate = result_value / amount;

    Ok(CurrencyResult {
        amount,
        from: from.to_uppercase(),
        to: to_upper,
        result: result_value,
        rate,
    })
}

#[cfg(windows)]
#[tauri::command]
async fn start_text_selection(window: tauri::Window) -> Result<(), String> {
    // Hide the window first
    let _ = window.hide();
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Set the cursor to I-beam (text selection cursor)
    unsafe {
        let ibeam_cursor = LoadCursorW(None, IDC_IBEAM).map_err(|e| e.to_string())?;
        let cursor_copy = CopyIcon(HICON(ibeam_cursor.0)).map_err(|e| e.to_string())?;
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

    // Wait for any existing mouse button press to be released first
    loop {
        let state = unsafe { GetAsyncKeyState(VK_LBUTTON) };
        if state >= 0 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    // Wait for mouse button to be pressed (user starts selecting)
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

    // Wait for mouse button to be released (user finishes selecting)
    loop {
        let escape_state = unsafe { GetAsyncKeyState(VK_ESCAPE) };
        if escape_state < 0 {
            restore_cursors();
            return Err("Cancelled".to_string());
        }

        let state = unsafe { GetAsyncKeyState(VK_LBUTTON) };
        if state >= 0 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    // Restore cursors
    restore_cursors();

    // Small delay to ensure selection is complete
    std::thread::sleep(std::time::Duration::from_millis(50));

    // Simulate Ctrl+C to copy selected text
    unsafe {
        let mut inputs: [INPUT; 4] = std::mem::zeroed();

        // Ctrl down
        inputs[0].r#type = INPUT_KEYBOARD;
        inputs[0].Anonymous.ki = KEYBDINPUT {
            wVk: VK_CONTROL,
            wScan: 0,
            dwFlags: Default::default(),
            time: 0,
            dwExtraInfo: 0,
        };

        // C down
        inputs[1].r#type = INPUT_KEYBOARD;
        inputs[1].Anonymous.ki = KEYBDINPUT {
            wVk: VK_C,
            wScan: 0,
            dwFlags: Default::default(),
            time: 0,
            dwExtraInfo: 0,
        };

        // C up
        inputs[2].r#type = INPUT_KEYBOARD;
        inputs[2].Anonymous.ki = KEYBDINPUT {
            wVk: VK_C,
            wScan: 0,
            dwFlags: KEYEVENTF_KEYUP,
            time: 0,
            dwExtraInfo: 0,
        };

        // Ctrl up
        inputs[3].r#type = INPUT_KEYBOARD;
        inputs[3].Anonymous.ki = KEYBDINPUT {
            wVk: VK_CONTROL,
            wScan: 0,
            dwFlags: KEYEVENTF_KEYUP,
            time: 0,
            dwExtraInfo: 0,
        };

        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }

    // Wait for clipboard to be populated
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Show the window
    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
async fn start_text_selection(_window: tauri::Window) -> Result<(), String> {
    Err("Text selection is only supported on Windows".to_string())
}

// Translation result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResult {
    pub translated_text: String,
    pub detected_language: String,
    pub target_language: String,
}

// Lingva Translate API response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
struct LingvaResponse {
    translation: String,
    info: Option<LingvaInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LingvaInfo {
    source: Option<LingvaSource>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LingvaSource {
    detected: Option<LingvaDetected>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LingvaDetected {
    code: String,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LingvaError {
    error: String,
}

// Language code to name mapping (fallback if API doesn't provide name)
fn get_language_name(code: &str) -> String {
    match code.to_lowercase().as_str() {
        "en" => "English".to_string(),
        "ja" => "Japanese".to_string(),
        "es" => "Spanish".to_string(),
        "fr" => "French".to_string(),
        "de" => "German".to_string(),
        "zh" => "Chinese".to_string(),
        "ko" => "Korean".to_string(),
        "pt" => "Portuguese".to_string(),
        "ru" => "Russian".to_string(),
        "it" => "Italian".to_string(),
        "ar" => "Arabic".to_string(),
        "hi" => "Hindi".to_string(),
        "nl" => "Dutch".to_string(),
        "pl" => "Polish".to_string(),
        "tr" => "Turkish".to_string(),
        "vi" => "Vietnamese".to_string(),
        "th" => "Thai".to_string(),
        "id" => "Indonesian".to_string(),
        "uk" => "Ukrainian".to_string(),
        "cs" => "Czech".to_string(),
        "el" => "Greek".to_string(),
        "he" => "Hebrew".to_string(),
        "sv" => "Swedish".to_string(),
        "da" => "Danish".to_string(),
        "fi" => "Finnish".to_string(),
        "no" => "Norwegian".to_string(),
        "hu" => "Hungarian".to_string(),
        "ro" => "Romanian".to_string(),
        "sk" => "Slovak".to_string(),
        "bg" => "Bulgarian".to_string(),
        _ => code.to_uppercase(),
    }
}

#[tauri::command]
async fn translate_text(text: String, target_lang: String) -> Result<TranslationResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    // URL encode the text
    let encoded_text = urlencoding::encode(&text);

    // List of Lingva instances to try (with fallbacks)
    let instances = [
        "lingva.ml",
        "lingva.lunar.icu",
        "translate.plausibility.cloud",
    ];

    let mut last_error = String::from("All translation servers failed");

    for instance in instances {
        let url = format!(
            "https://{}/api/v1/auto/{}/{}",
            instance, target_lang, encoded_text
        );

        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<LingvaResponse>().await {
                        Ok(data) => {
                            // Extract detected language info
                            let detected_lang = data
                                .info
                                .and_then(|i| i.source)
                                .and_then(|s| s.detected)
                                .map(|d| d.name)
                                .unwrap_or_else(|| "Auto-detected".to_string());

                            return Ok(TranslationResult {
                                translated_text: data.translation,
                                detected_language: detected_lang,
                                target_language: get_language_name(&target_lang),
                            });
                        }
                        Err(e) => {
                            last_error = format!("Failed to parse response from {}: {}", instance, e);
                        }
                    }
                } else {
                    // Try to get error message
                    if let Ok(err) = response.json::<LingvaError>().await {
                        last_error = format!("{}: {}", instance, err.error);
                    } else {
                        last_error = format!("{} returned error status", instance);
                    }
                }
            }
            Err(e) => {
                last_error = format!("Failed to connect to {}: {}", instance, e);
            }
        }
    }

    Err(last_error)
}

fn toggle_window(app: &AppHandle) {
    // Check if window is ready before attempting to toggle
    let state = app.state::<AppState>();
    let is_ready = *state.window_ready.lock().unwrap();
    if !is_ready {
        log::warn!("Window not ready yet, ignoring toggle request");
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            // Check for saved position
            let settings = state.settings.lock().unwrap();
            if let Some((x, y)) = settings.window_position {
                use tauri::LogicalPosition;
                let _ = window.set_position(LogicalPosition::new(x, y));
            } else {
                let _ = window.center();
            }
            drop(settings); // Release lock before show
            let _ = window.show();
            let _ = window.set_focus();
            let _ = app.emit("focus-search", ());
        }
    } else {
        log::warn!("Main window not found");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            current_shortcut: Mutex::new(None),
            settings: Mutex::new(Settings::default()),
            auto_hide_enabled: Mutex::new(true),
            is_dragging: Mutex::new(false),
            window_ready: Mutex::new(false),
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

            // Handle window events - use if let to avoid panic if window isn't ready
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));

                let window_clone = window.clone();
                let app_handle_for_blur = app.handle().clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::Focused(false) => {
                            let state = app_handle_for_blur.state::<AppState>();
                            let auto_hide = *state.auto_hide_enabled.lock().unwrap();
                            let is_dragging = *state.is_dragging.lock().unwrap();
                            // Don't hide if dragging or auto_hide is disabled
                            if auto_hide && !is_dragging {
                                let _ = window_clone.hide();
                            }
                        }
                        tauri::WindowEvent::Moved(position) => {
                            // Save position when window is moved
                            let state = app_handle_for_blur.state::<AppState>();
                            let mut settings = state.settings.lock().unwrap();
                            settings.window_position = Some((position.x, position.y));
                            let _ = save_settings_to_file(&app_handle_for_blur, &settings);
                        }
                        _ => {}
                    }
                });
            } else {
                log::error!("Failed to get main window during setup");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            pick_color,
            get_settings,
            save_settings,
            get_launch_at_startup,
            set_auto_hide,
            set_dragging,
            mark_window_ready,
            save_window_position,
            convert_image,
            convert_media,
            scan_port,
            kill_port_process,
            convert_currency,
            start_text_selection,
            translate_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
