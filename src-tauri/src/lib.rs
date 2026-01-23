use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    window::Color,
    AppHandle, Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// Platform-specific implementations
mod platform;

/// Creates a Command that hides the console window on Windows.
/// On other platforms, returns a regular Command.
fn hidden_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

// Settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub hotkey_modifiers: Vec<String>, // ["Alt"], ["Ctrl", "Shift"], etc.
    pub hotkey_key: String,            // "Q", "Space", etc.
    pub launch_at_startup: bool,
    #[serde(default)]
    pub window_position: Option<(i32, i32)>, // Saved window position (x, y)
    #[serde(default = "default_show_in_tray")]
    pub show_in_tray: bool,
}

fn default_show_in_tray() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hotkey_modifiers: vec!["Alt".to_string()],
            hotkey_key: "Q".to_string(),
            launch_at_startup: false,
            window_position: None,
            show_in_tray: true,
        }
    }
}

// Global state for current shortcut
struct AppState {
    current_shortcut: Mutex<Option<Shortcut>>,
    settings: Mutex<Settings>,
    auto_hide_enabled: Mutex<bool>,
    is_dragging: Mutex<bool>,
    tray_handle: Mutex<Option<TrayIcon>>,
    app_ready: Mutex<bool>,
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

    // Force foreground focus on Windows
    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            platform::force_foreground_window(hwnd.0 as isize);
        }
    }
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

    // Update startup setting (platform-specific)
    platform::set_launch_at_startup_impl(settings.launch_at_startup)?;

    // Update tray visibility
    if let Some(tray) = state.tray_handle.lock().unwrap().as_ref() {
        let _ = tray.set_visible(settings.show_in_tray);
    }

    Ok(())
}

#[tauri::command]
fn get_launch_at_startup() -> Result<bool, String> {
    platform::get_launch_at_startup_impl()
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
fn mark_app_ready(app: AppHandle) {
    let state = app.state::<AppState>();
    *state.app_ready.lock().unwrap() = true;

    // Show tray icon now that app is ready (if enabled in settings)
    let settings = state.settings.lock().unwrap();
    if settings.show_in_tray {
        if let Some(tray) = state.tray_handle.lock().unwrap().as_ref() {
            let _ = tray.set_visible(true);
        }
    }

    log::info!("App marked as ready");
}

// Helper to get media duration using ffmpeg
fn get_media_duration(ffmpeg_path: &std::path::Path, input_path: &str) -> Option<f64> {
    let output = hidden_command(ffmpeg_path)
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
    use std::process::Stdio;

    // Get bundled ffmpeg path using platform-specific resolution
    let ffmpeg = platform::get_ffmpeg_path()?;

    // Get total duration
    let total_duration = get_media_duration(&ffmpeg, &input_path).unwrap_or(0.0);

    // Emit initial progress
    let _ = app.emit("conversion-progress", 0);

    // Run ffmpeg with progress output
    let mut child = hidden_command(&ffmpeg)
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

#[tauri::command]
async fn pick_color(window: tauri::Window) -> Result<String, String> {
    platform::pick_color_impl(window).await
}

// Re-export PortProcess from platform module for the command handler
pub use platform::PortProcess;

#[tauri::command]
async fn scan_port(port: u16) -> Result<Vec<PortProcess>, String> {
    platform::scan_port_impl(port).await
}

#[tauri::command]
async fn kill_port_process(pid: u32) -> Result<(), String> {
    platform::kill_port_process_impl(pid).await
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

// Video metadata response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: f64,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub frame_rate: f64,
    pub codec: String,
}

// Video conversion options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoConvertOptions {
    pub resolution: String,
    pub frame_rate: String,
    pub codec: String,
    pub keep_audio: bool,
    pub bitrate: u32, // kbps, 0 for original
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

#[tauri::command]
async fn start_text_selection(window: tauri::Window) -> Result<(), String> {
    platform::start_text_selection_impl(window).await
}

// Translation result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResult {
    pub translated_text: String,
    pub detected_language: String,
    pub target_language: String,
}

// MyMemory API response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct MyMemoryResponse {
    responseData: Option<MyMemoryResponseData>,
    responseStatus: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct MyMemoryResponseData {
    translatedText: Option<String>,
}

// Convert whatlang Lang to ISO 639-1 code
fn lang_to_code(lang: whatlang::Lang) -> &'static str {
    use whatlang::Lang::*;
    match lang {
        Eng => "en",
        Fra => "fr",
        Deu => "de",
        Spa => "es",
        Por => "pt",
        Ita => "it",
        Nld => "nl",
        Rus => "ru",
        Ukr => "uk",
        Pol => "pl",
        Jpn => "ja",
        Cmn => "zh",
        Kor => "ko",
        Ara => "ar",
        Hin => "hi",
        Tur => "tr",
        Vie => "vi",
        Tha => "th",
        Ind => "id",
        Ces => "cs",
        Ell => "el",
        Heb => "he",
        Swe => "sv",
        Dan => "da",
        Fin => "fi",
        Nob => "no",
        Hun => "hu",
        Ron => "ro",
        Slk => "sk",
        Bul => "bg",
        _ => "en", // Default fallback
    }
}

// Convert whatlang Lang to display name
fn lang_to_name(lang: whatlang::Lang) -> &'static str {
    use whatlang::Lang::*;
    match lang {
        Eng => "English",
        Fra => "French",
        Deu => "German",
        Spa => "Spanish",
        Por => "Portuguese",
        Ita => "Italian",
        Nld => "Dutch",
        Rus => "Russian",
        Ukr => "Ukrainian",
        Pol => "Polish",
        Jpn => "Japanese",
        Cmn => "Chinese",
        Kor => "Korean",
        Ara => "Arabic",
        Hin => "Hindi",
        Tur => "Turkish",
        Vie => "Vietnamese",
        Tha => "Thai",
        Ind => "Indonesian",
        Ces => "Czech",
        Ell => "Greek",
        Heb => "Hebrew",
        Swe => "Swedish",
        Dan => "Danish",
        Fin => "Finnish",
        Nob => "Norwegian",
        Hun => "Hungarian",
        Ron => "Romanian",
        Slk => "Slovak",
        Bul => "Bulgarian",
        Lat => "Latin",
        Epo => "Esperanto",
        _ => "Unknown",
    }
}

// Language code to name mapping
fn get_language_name(code: &str) -> String {
    match code.to_lowercase().as_str() {
        "en" => "English".to_string(),
        "ja" => "Japanese".to_string(),
        "es" => "Spanish".to_string(),
        "fr" => "French".to_string(),
        "de" => "German".to_string(),
        "zh" | "zh-cn" | "zh-tw" => "Chinese".to_string(),
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
    // Detect language locally using whatlang
    let detected = whatlang::detect(&text);

    let (source_code, detected_name) = match detected {
        Some(info) => {
            let code = lang_to_code(info.lang());
            let name = lang_to_name(info.lang());
            (code, name.to_string())
        }
        None => ("en", "Unknown".to_string()), // Default to English if detection fails
    };

    // If source and target are the same, just return the original text
    if source_code == target_lang {
        return Ok(TranslationResult {
            translated_text: text,
            detected_language: detected_name,
            target_language: get_language_name(&target_lang),
        });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    // URL encode the text
    let encoded_text = urlencoding::encode(&text);

    // MyMemory API endpoint
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair={}|{}",
        encoded_text, source_code, target_lang
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let data: MyMemoryResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let translated_text = data
        .responseData
        .and_then(|r| r.translatedText)
        .ok_or_else(|| "No translation received".to_string())?;

    Ok(TranslationResult {
        translated_text,
        detected_language: detected_name,
        target_language: get_language_name(&target_lang),
    })
}

#[tauri::command]
async fn save_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, &data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    // Get file size first - this should always work
    let file_size = fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Use ffmpeg to get video info (ffprobe may not be available)
    let ffmpeg = match platform::get_ffmpeg_path() {
        Ok(p) => p,
        Err(_) => {
            // Return partial metadata with just file size
            return Ok(VideoMetadata {
                duration: 0.0,
                size: file_size,
                width: 0,
                height: 0,
                frame_rate: 0.0,
                codec: "unknown".to_string(),
            });
        }
    };

    // Run ffmpeg -i to get video info from stderr
    let output = match hidden_command(&ffmpeg)
        .args(["-i", &path])
        .output()
    {
        Ok(o) => o,
        Err(_) => {
            return Ok(VideoMetadata {
                duration: 0.0,
                size: file_size,
                width: 0,
                height: 0,
                frame_rate: 0.0,
                codec: "unknown".to_string(),
            });
        }
    };

    // FFmpeg outputs info to stderr (exit code will be non-zero since no output specified, that's ok)
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Parse duration from "Duration: HH:MM:SS.ms"
    let mut duration = 0.0;
    for line in stderr.lines() {
        if line.contains("Duration:") {
            if let Some(duration_str) = line.split("Duration:").nth(1) {
                if let Some(duration_part) = duration_str.split(',').next() {
                    let parts: Vec<&str> = duration_part.trim().split(':').collect();
                    if parts.len() == 3 {
                        if let (Ok(h), Ok(m), Ok(s)) = (
                            parts[0].parse::<f64>(),
                            parts[1].parse::<f64>(),
                            parts[2].parse::<f64>(),
                        ) {
                            duration = h * 3600.0 + m * 60.0 + s;
                        }
                    }
                }
            }
            break;
        }
    }

    // Parse video stream info: "Stream #0:0: Video: h264 ..., 1920x1080 [SAR ...], 30 fps"
    let mut width = 0u32;
    let mut height = 0u32;
    let mut frame_rate = 0.0;
    let mut codec = "unknown".to_string();

    for line in stderr.lines() {
        if line.contains("Stream") && line.contains("Video:") {
            // Extract codec (first word after "Video: ")
            if let Some(video_part) = line.split("Video:").nth(1) {
                let video_info = video_part.trim();
                // Codec is the first word (e.g., "h264" or "hevc")
                if let Some(codec_name) = video_info.split(|c: char| c == ' ' || c == ',').next() {
                    codec = codec_name.to_string();
                }

                // Extract resolution (pattern like "1920x1080" or "1280x720")
                let re_resolution = regex::Regex::new(r"(\d{2,5})x(\d{2,5})").ok();
                if let Some(re) = re_resolution {
                    if let Some(caps) = re.captures(video_info) {
                        if let (Some(w), Some(h)) = (caps.get(1), caps.get(2)) {
                            width = w.as_str().parse().unwrap_or(0);
                            height = h.as_str().parse().unwrap_or(0);
                        }
                    }
                }

                // Extract frame rate (pattern like "30 fps" or "29.97 fps" or "30 tbr")
                let re_fps = regex::Regex::new(r"(\d+(?:\.\d+)?)\s*(?:fps|tbr)").ok();
                if let Some(re) = re_fps {
                    if let Some(caps) = re.captures(video_info) {
                        if let Some(fps_match) = caps.get(1) {
                            frame_rate = fps_match.as_str().parse().unwrap_or(0.0);
                        }
                    }
                }
            }
            break;
        }
    }

    Ok(VideoMetadata {
        duration,
        size: file_size,
        width,
        height,
        frame_rate,
        codec,
    })
}

#[tauri::command]
async fn convert_video(
    app: AppHandle,
    input_path: String,
    output_path: String,
    options: VideoConvertOptions,
) -> Result<(), String> {
    use std::io::{BufRead, BufReader};
    use std::process::Stdio;

    let ffmpeg = platform::get_ffmpeg_path()?;

    // Get total duration for progress calculation
    let total_duration = get_media_duration(&ffmpeg, &input_path).unwrap_or(0.0);

    // Emit initial progress
    let _ = app.emit("conversion-progress", 0);

    // Detect output format from extension
    let output_ext = output_path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();

    let is_gif = output_ext == "gif";
    let is_webm = output_ext == "webm";

    // Build ffmpeg arguments
    let mut args: Vec<String> = vec![
        "-i".to_string(),
        input_path.clone(),
        "-y".to_string(), // Overwrite output
    ];

    // Build video filter string
    let mut vf_filters: Vec<String> = Vec::new();

    // Resolution filter
    match options.resolution.as_str() {
        "4K" => vf_filters.push("scale=3840:-2".to_string()),
        "1080p" => vf_filters.push("scale=1920:-2".to_string()),
        "720p" => vf_filters.push("scale=1280:-2".to_string()),
        "480p" => vf_filters.push("scale=854:-2".to_string()),
        _ => {} // Keep original
    }

    if is_gif {
        // GIF-specific encoding with palette for better quality
        // Determine GIF fps based on quality preset (bitrate as proxy) and frame rate setting
        let gif_fps = if options.frame_rate != "Keep Original" {
            // User explicitly set frame rate
            match options.frame_rate.as_str() {
                "60 fps" => "30", // Cap at 30 for GIF
                "30 fps" => "30",
                "24 fps" => "24",
                _ => "15",
            }
        } else {
            // Use bitrate as quality indicator for GIF fps
            match options.bitrate {
                0 => "24",           // Original quality: 24 fps
                b if b >= 8000 => "24",  // High quality: 24 fps
                b if b >= 4000 => "15",  // Medium quality: 15 fps
                b if b >= 2000 => "12",  // Low quality: 12 fps
                _ => "10",               // Web/lowest: 10 fps
            }
        };
        vf_filters.push(format!("fps={}", gif_fps));

        // Add palette generation for better GIF quality
        vf_filters.push("split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5".to_string());

        if !vf_filters.is_empty() {
            args.push("-vf".to_string());
            args.push(vf_filters.join(","));
        }

        // GIF doesn't support audio
        args.push("-an".to_string());

        // Loop forever
        args.push("-loop".to_string());
        args.push("0".to_string());
    } else {
        // Regular video encoding

        // Video codec (not applicable for GIF)
        if is_webm {
            // WebM typically uses VP9
            args.push("-c:v".to_string());
            args.push("libvpx-vp9".to_string());
        } else {
            match options.codec.as_str() {
                "H.264" => {
                    args.push("-c:v".to_string());
                    args.push("libx264".to_string());
                }
                "H.265" => {
                    args.push("-c:v".to_string());
                    args.push("libx265".to_string());
                }
                "VP9" => {
                    args.push("-c:v".to_string());
                    args.push("libvpx-vp9".to_string());
                }
                "AV1" => {
                    args.push("-c:v".to_string());
                    args.push("libaom-av1".to_string());
                    args.push("-cpu-used".to_string());
                    args.push("4".to_string()); // Speed up AV1 encoding
                }
                _ => {} // Use default
            }
        }

        // Apply video filters if any
        if !vf_filters.is_empty() {
            args.push("-vf".to_string());
            args.push(vf_filters.join(","));
        }

        // Frame rate
        match options.frame_rate.as_str() {
            "60 fps" => {
                args.push("-r".to_string());
                args.push("60".to_string());
            }
            "30 fps" => {
                args.push("-r".to_string());
                args.push("30".to_string());
            }
            "24 fps" => {
                args.push("-r".to_string());
                args.push("24".to_string());
            }
            _ => {} // Keep original
        }

        // Bitrate (if not original quality)
        if options.bitrate > 0 {
            args.push("-b:v".to_string());
            args.push(format!("{}k", options.bitrate));
        }

        // Audio handling
        if options.keep_audio {
            if is_webm {
                // WebM uses Opus or Vorbis for audio
                args.push("-c:a".to_string());
                args.push("libopus".to_string());
                args.push("-b:a".to_string());
                args.push("128k".to_string());
            } else {
                args.push("-c:a".to_string());
                args.push("aac".to_string());
                args.push("-b:a".to_string());
                args.push("128k".to_string());
            }
        } else {
            args.push("-an".to_string()); // No audio
        }
    }

    // Progress output
    args.push("-progress".to_string());
    args.push("pipe:1".to_string());
    args.push("-nostats".to_string());

    // Output path
    args.push(output_path.clone());

    // Run ffmpeg
    let mut child = hidden_command(&ffmpeg)
        .args(&args)
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
        return Err("Video conversion failed".to_string());
    }

    // Emit completion
    let _ = app.emit("conversion-progress", 100);
    Ok(())
}

fn toggle_window(app: &AppHandle) {
    // Don't toggle until the app is fully initialized
    let state = app.state::<AppState>();
    if !*state.app_ready.lock().unwrap() {
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            // Position window on the monitor where the cursor is located
            #[cfg(target_os = "windows")]
            {
                // Get current window size
                if let Ok(size) = window.outer_size() {
                    if let Some((x, y)) = platform::get_centered_position_on_cursor_monitor(
                        size.width as i32,
                        size.height as i32,
                    ) {
                        use tauri::PhysicalPosition;
                        let _ = window.set_position(PhysicalPosition::new(x, y));
                    } else {
                        let _ = window.center();
                    }
                } else {
                    let _ = window.center();
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = window.center();
            }
            let _ = window.show();
            let _ = window.set_focus();

            // Force foreground focus on Windows to ensure immediate keyboard capture
            // This is critical for spotlight/command-palette UX where users start typing immediately
            #[cfg(target_os = "windows")]
            {
                if let Ok(hwnd) = window.hwnd() {
                    platform::force_foreground_window(hwnd.0 as isize);
                }
            }

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
            tray_handle: Mutex::new(None),
            app_ready: Mutex::new(false),
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

            let tray = TrayIconBuilder::with_id("main-tray")
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

            // Store tray handle - initially hidden until app is ready
            {
                let state = app.state::<AppState>();
                let _ = tray.set_visible(false);
                *state.tray_handle.lock().unwrap() = Some(tray);
            }

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
                                    // Spawn on async runtime to avoid blocking the shortcut handler thread.
                                    // This prevents deadlocks with the Windows message loop.
                                    let app_handle_clone = app_handle.clone();
                                    tauri::async_runtime::spawn(async move {
                                        toggle_window(&app_handle_clone);
                                    });
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
                    if let tauri::WindowEvent::Focused(false) = event {
                        let state = app_handle_for_blur.state::<AppState>();
                        let auto_hide = *state.auto_hide_enabled.lock().unwrap();
                        let is_dragging = *state.is_dragging.lock().unwrap();
                        // Don't hide if dragging or auto_hide is disabled
                        if auto_hide && !is_dragging {
                            let _ = window_clone.hide();
                        }
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
            mark_app_ready,
            convert_media,
            scan_port,
            kill_port_process,
            convert_currency,
            start_text_selection,
            translate_text,
            save_binary_file,
            save_text_file,
            get_video_metadata,
            convert_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
