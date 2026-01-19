// Windows-specific implementations using Win32 APIs

use super::PortProcess;
use std::collections::HashSet;
use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

use windows::Win32::{
    Foundation::POINT,
    Graphics::Gdi::{GetDC, GetPixel, ReleaseDC},
    UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_C,
        VK_CONTROL,
    },
    UI::WindowsAndMessaging::{
        CopyIcon, GetCursorPos, LoadCursorW, SetSystemCursor, SystemParametersInfoW, HCURSOR,
        HICON, IDC_CROSS, IDC_IBEAM, OCR_NORMAL, SPI_SETCURSORS, SYSTEM_PARAMETERS_INFO_ACTION,
    },
};

use winreg::enums::*;
use winreg::RegKey;

// ============================================================================
// Color Picker
// ============================================================================

pub async fn pick_color_impl(window: tauri::Window) -> Result<String, String> {
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

// ============================================================================
// Text Selection
// ============================================================================

pub async fn start_text_selection_impl(window: tauri::Window) -> Result<(), String> {
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

// ============================================================================
// Port Scanning & Killing
// ============================================================================

pub async fn scan_port_impl(port: u16) -> Result<Vec<PortProcess>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut processes: Vec<PortProcess> = Vec::new();
    let mut seen_pids: HashSet<u32> = HashSet::new();

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
                            let process_name =
                                get_process_name_impl(pid).unwrap_or_else(|| "Unknown".to_string());

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

pub fn get_process_name_impl(pid: u32) -> Option<String> {
    let output = Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
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

pub async fn kill_port_process_impl(pid: u32) -> Result<(), String> {
    let output = Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to kill process: {}", stderr));
    }

    Ok(())
}

// ============================================================================
// Auto-Startup (Registry)
// ============================================================================

pub fn get_launch_at_startup_impl() -> Result<bool, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key = hkcu
        .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| e.to_string())?;
    Ok(run_key.get_value::<String, _>("BunchaTools").is_ok())
}

pub fn set_launch_at_startup_impl(enable: bool) -> Result<(), String> {
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

// ============================================================================
// FFmpeg Path Resolution
// ============================================================================

pub fn get_ffmpeg_path() -> Result<std::path::PathBuf, String> {
    // Get executable directory
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
    ];

    for path in &possible_paths {
        if path.exists() {
            log::info!("Found FFmpeg at: {:?}", path);
            return Ok(path.clone());
        }
    }

    Err(format!(
        "FFmpeg not found. CWD: {:?}, Searched in: {:?}",
        cwd, possible_paths
    ))
}
