// Linux-specific implementations using X11 (via x11rb crate)

use super::PortProcess;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use x11rb::connection::Connection;
use x11rb::protocol::xproto::{ConnectionExt, EventMask, GrabMode, GrabStatus, ImageFormat};
use x11rb::protocol::xtest::ConnectionExt as XTestConnectionExt;
use x11rb::rust_connection::RustConnection;

// ============================================================================
// Color Picker (X11)
// ============================================================================

pub async fn pick_color_impl(window: tauri::Window) -> Result<String, String> {
    let _ = window.hide();
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Run in a blocking thread since X11 operations are synchronous
    let result = tokio::task::spawn_blocking(|| pick_color_x11())
        .await
        .map_err(|e| format!("Task join error: {}", e))?;

    result
}

fn pick_color_x11() -> Result<String, String> {
    let (conn, screen_num) = RustConnection::connect(None).map_err(|e| format!("X11 connection failed: {}. Note: This feature requires X11 (not Wayland).", e))?;

    let screen = &conn.setup().roots[screen_num];
    let root = screen.root;

    // Create crosshair cursor
    let cursor_font = conn
        .generate_id()
        .map_err(|e| format!("Failed to generate font id: {}", e))?;
    conn.open_font(cursor_font, b"cursor")
        .map_err(|e| format!("Failed to open cursor font: {}", e))?;

    let cursor = conn
        .generate_id()
        .map_err(|e| format!("Failed to generate cursor id: {}", e))?;

    // Crosshair cursor is character 34 in the cursor font
    conn.create_glyph_cursor(
        cursor,
        cursor_font,
        cursor_font,
        34,
        35, // crosshair glyph
        0,
        0,
        0,       // foreground (black)
        65535,
        65535,
        65535, // background (white)
    )
    .map_err(|e| format!("Failed to create cursor: {}", e))?;

    // Grab pointer with crosshair cursor
    let grab_result = conn
        .grab_pointer(
            true,
            root,
            (EventMask::BUTTON_PRESS | EventMask::BUTTON_RELEASE | EventMask::KEY_PRESS).into(),
            GrabMode::ASYNC,
            GrabMode::ASYNC,
            root,
            cursor,
            x11rb::CURRENT_TIME,
        )
        .map_err(|e| format!("Grab pointer request failed: {}", e))?
        .reply()
        .map_err(|e| format!("Grab pointer reply failed: {}", e))?;

    if grab_result.status != GrabStatus::SUCCESS {
        return Err("Failed to grab pointer".to_string());
    }

    // Also grab keyboard for Escape key
    let _ = conn.grab_keyboard(
        true,
        root,
        x11rb::CURRENT_TIME,
        GrabMode::ASYNC,
        GrabMode::ASYNC,
    );

    // Wait for click or escape
    let mut click_x = 0i16;
    let mut click_y = 0i16;
    let mut cancelled = false;

    loop {
        let event = conn
            .wait_for_event()
            .map_err(|e| format!("Event error: {}", e))?;

        match event {
            x11rb::protocol::Event::ButtonPress(bp) => {
                if bp.detail == 1 {
                    // Left click
                    click_x = bp.root_x;
                    click_y = bp.root_y;
                    break;
                }
            }
            x11rb::protocol::Event::KeyPress(kp) => {
                // Escape key is keycode 9 on most systems
                if kp.detail == 9 {
                    cancelled = true;
                    break;
                }
            }
            _ => {}
        }
    }

    // Release grabs
    let _ = conn.ungrab_pointer(x11rb::CURRENT_TIME);
    let _ = conn.ungrab_keyboard(x11rb::CURRENT_TIME);
    let _ = conn.free_cursor(cursor);
    let _ = conn.close_font(cursor_font);
    let _ = conn.flush();

    if cancelled {
        return Err("Cancelled".to_string());
    }

    // Get pixel color using GetImage
    let image = conn
        .get_image(ImageFormat::Z_PIXMAP, root, click_x, click_y, 1, 1, !0)
        .map_err(|e| format!("GetImage request failed: {}", e))?
        .reply()
        .map_err(|e| format!("GetImage reply failed: {}", e))?;

    // Parse pixel data (format depends on depth, assuming 24/32-bit)
    let data = &image.data;
    if data.len() >= 3 {
        // Usually BGRA or BGR format
        let b = data[0];
        let g = data[1];
        let r = data[2];
        Ok(format!("#{:02X}{:02X}{:02X}", r, g, b))
    } else {
        Err("Failed to read pixel data".to_string())
    }
}

// ============================================================================
// Text Selection (X11 + XTest)
// ============================================================================

pub async fn start_text_selection_impl(window: tauri::Window) -> Result<(), String> {
    let _ = window.hide();
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Run in a blocking thread
    let result = tokio::task::spawn_blocking(|| text_selection_x11())
        .await
        .map_err(|e| format!("Task join error: {}", e))?;

    if result.is_ok() {
        std::thread::sleep(std::time::Duration::from_millis(100));
        let _ = window.show();
        let _ = window.set_focus();
    }

    result
}

fn text_selection_x11() -> Result<(), String> {
    let (conn, screen_num) = RustConnection::connect(None).map_err(|e| format!("X11 connection failed: {}. Note: This feature requires X11 (not Wayland).", e))?;

    let screen = &conn.setup().roots[screen_num];
    let root = screen.root;

    // Create I-beam cursor
    let cursor_font = conn
        .generate_id()
        .map_err(|e| format!("Failed to generate font id: {}", e))?;
    conn.open_font(cursor_font, b"cursor")
        .map_err(|e| format!("Failed to open cursor font: {}", e))?;

    let cursor = conn
        .generate_id()
        .map_err(|e| format!("Failed to generate cursor id: {}", e))?;

    // I-beam/xterm cursor is character 152 in the cursor font
    conn.create_glyph_cursor(
        cursor,
        cursor_font,
        cursor_font,
        152,
        153, // xterm/ibeam glyph
        0,
        0,
        0,       // foreground (black)
        65535,
        65535,
        65535, // background (white)
    )
    .map_err(|e| format!("Failed to create cursor: {}", e))?;

    // Grab pointer with I-beam cursor
    let grab_result = conn
        .grab_pointer(
            true,
            root,
            (EventMask::BUTTON_PRESS | EventMask::BUTTON_RELEASE | EventMask::KEY_PRESS).into(),
            GrabMode::ASYNC,
            GrabMode::ASYNC,
            root,
            cursor,
            x11rb::CURRENT_TIME,
        )
        .map_err(|e| format!("Grab pointer request failed: {}", e))?
        .reply()
        .map_err(|e| format!("Grab pointer reply failed: {}", e))?;

    if grab_result.status != GrabStatus::SUCCESS {
        return Err("Failed to grab pointer".to_string());
    }

    // Also grab keyboard for Escape key
    let _ = conn.grab_keyboard(
        true,
        root,
        x11rb::CURRENT_TIME,
        GrabMode::ASYNC,
        GrabMode::ASYNC,
    );

    let mut cancelled = false;
    let mut button_pressed = false;

    // Wait for button press (start selection)
    loop {
        let event = conn
            .wait_for_event()
            .map_err(|e| format!("Event error: {}", e))?;

        match event {
            x11rb::protocol::Event::ButtonPress(bp) => {
                if bp.detail == 1 {
                    button_pressed = true;
                    // Release pointer grab but keep monitoring
                    let _ = conn.ungrab_pointer(x11rb::CURRENT_TIME);
                    let _ = conn.flush();

                    // Simulate the button press at the current location using XTest
                    let _ = conn.xtest_fake_input(4, 1, x11rb::CURRENT_TIME, root, 0, 0, 0);
                    let _ = conn.flush();
                    break;
                }
            }
            x11rb::protocol::Event::KeyPress(kp) => {
                if kp.detail == 9 {
                    // Escape
                    cancelled = true;
                    break;
                }
            }
            _ => {}
        }
    }

    if cancelled {
        let _ = conn.ungrab_pointer(x11rb::CURRENT_TIME);
        let _ = conn.ungrab_keyboard(x11rb::CURRENT_TIME);
        let _ = conn.free_cursor(cursor);
        let _ = conn.close_font(cursor_font);
        let _ = conn.flush();
        return Err("Cancelled".to_string());
    }

    if button_pressed {
        // Wait a bit for user to complete selection
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Now simulate Ctrl+C using XTest
        // Key codes: Control_L is usually 37, C is usually 54
        let control_keycode = 37u8;
        let c_keycode = 54u8;

        // Press Control
        let _ = conn.xtest_fake_input(2, control_keycode, x11rb::CURRENT_TIME, root, 0, 0, 0);
        let _ = conn.flush();

        // Press C
        let _ = conn.xtest_fake_input(2, c_keycode, x11rb::CURRENT_TIME, root, 0, 0, 0);
        let _ = conn.flush();

        std::thread::sleep(std::time::Duration::from_millis(50));

        // Release C
        let _ = conn.xtest_fake_input(3, c_keycode, x11rb::CURRENT_TIME, root, 0, 0, 0);
        let _ = conn.flush();

        // Release Control
        let _ = conn.xtest_fake_input(3, control_keycode, x11rb::CURRENT_TIME, root, 0, 0, 0);
        let _ = conn.flush();
    }

    // Cleanup
    let _ = conn.ungrab_keyboard(x11rb::CURRENT_TIME);
    let _ = conn.free_cursor(cursor);
    let _ = conn.close_font(cursor_font);
    let _ = conn.flush();

    Ok(())
}

// ============================================================================
// Port Scanning & Killing (Linux)
// ============================================================================

pub async fn scan_port_impl(port: u16) -> Result<Vec<PortProcess>, String> {
    let mut processes: Vec<PortProcess> = Vec::new();
    let mut seen_pids: HashSet<u32> = HashSet::new();

    // Try using ss command first (more modern)
    let output = Command::new("ss")
        .args(["-tlnp", "-H"]) // TCP listening, numeric, show process, no header
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            // Format: LISTEN 0 128 0.0.0.0:8080 0.0.0.0:* users:(("node",pid=1234,fd=3))
            if let Some(port_match) = parse_ss_line(line, port) {
                if !seen_pids.contains(&port_match.pid) {
                    seen_pids.insert(port_match.pid);
                    processes.push(port_match);
                }
            }
        }
    }

    // Also try UDP
    let output = Command::new("ss")
        .args(["-ulnp", "-H"]) // UDP listening, numeric, show process, no header
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if let Some(mut port_match) = parse_ss_line(line, port) {
                port_match.protocol = "UDP".to_string();
                if !seen_pids.contains(&port_match.pid) {
                    seen_pids.insert(port_match.pid);
                    processes.push(port_match);
                }
            }
        }
    }

    // If ss didn't work, fall back to parsing /proc/net/tcp
    if processes.is_empty() {
        if let Ok(procs) = scan_port_procfs(port) {
            for p in procs {
                if !seen_pids.contains(&p.pid) {
                    seen_pids.insert(p.pid);
                    processes.push(p);
                }
            }
        }
    }

    Ok(processes)
}

fn parse_ss_line(line: &str, target_port: u16) -> Option<PortProcess> {
    // Example: LISTEN 0 128 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=12345,fd=3))
    // Or:      LISTEN 0 128 [::]:3000 [::]:* users:(("node",pid=12345,fd=3))
    let parts: Vec<&str> = line.split_whitespace().collect();

    // Find local address (usually 4th field)
    for (i, part) in parts.iter().enumerate() {
        // Check if this looks like an address:port
        if let Some(port_str) = part.rsplit(':').next() {
            if let Ok(port) = port_str.parse::<u16>() {
                if port == target_port {
                    // Look for users:((... pattern to extract PID
                    for remaining in &parts[i..] {
                        if remaining.contains("pid=") {
                            if let Some(pid) = extract_pid_from_users(remaining) {
                                let name =
                                    extract_process_name(remaining).unwrap_or_else(|| {
                                        get_process_name_impl(pid).unwrap_or("Unknown".to_string())
                                    });
                                return Some(PortProcess {
                                    pid,
                                    name,
                                    port: target_port,
                                    protocol: "TCP".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn extract_pid_from_users(s: &str) -> Option<u32> {
    // Pattern: users:(("name",pid=12345,fd=3))
    if let Some(pid_start) = s.find("pid=") {
        let after_pid = &s[pid_start + 4..];
        let pid_str: String = after_pid.chars().take_while(|c| c.is_numeric()).collect();
        return pid_str.parse().ok();
    }
    None
}

fn extract_process_name(s: &str) -> Option<String> {
    // Pattern: users:((\"name\" or users:(("name"
    if let Some(start) = s.find("((\"") {
        let after = &s[start + 3..];
        if let Some(end) = after.find('"') {
            return Some(after[..end].to_string());
        }
    }
    if let Some(start) = s.find("((") {
        let after = &s[start + 2..];
        if let Some(end) = after.find(',') {
            let name = after[..end].trim_matches('"');
            return Some(name.to_string());
        }
    }
    None
}

fn scan_port_procfs(port: u16) -> Result<Vec<PortProcess>, String> {
    let mut processes = Vec::new();

    // Parse /proc/net/tcp and /proc/net/tcp6
    for path in &["/proc/net/tcp", "/proc/net/tcp6"] {
        if let Ok(content) = fs::read_to_string(path) {
            for line in content.lines().skip(1) {
                // Skip header
                if let Some(proc) = parse_proc_net_tcp_line(line, port) {
                    processes.push(proc);
                }
            }
        }
    }

    Ok(processes)
}

fn parse_proc_net_tcp_line(line: &str, target_port: u16) -> Option<PortProcess> {
    // Format: sl local_address rem_address st tx_queue:rx_queue tr:tm->when retrnsmt uid timeout inode
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 10 {
        return None;
    }

    let local_addr = parts[1];
    // Format: IP:PORT in hex (e.g., 0100007F:1F90 = 127.0.0.1:8080)
    let port_hex = local_addr.split(':').nth(1)?;
    let port = u16::from_str_radix(port_hex, 16).ok()?;

    if port != target_port {
        return None;
    }

    // Get inode to find the process
    let inode = parts[9];
    let pid = find_pid_by_inode(inode)?;
    let name = get_process_name_impl(pid).unwrap_or("Unknown".to_string());

    Some(PortProcess {
        pid,
        name,
        port: target_port,
        protocol: "TCP".to_string(),
    })
}

fn find_pid_by_inode(target_inode: &str) -> Option<u32> {
    // Scan /proc/*/fd/* for socket:[inode]
    let proc_dir = fs::read_dir("/proc").ok()?;

    for entry in proc_dir.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        // Check if this is a PID directory
        if let Ok(pid) = name_str.parse::<u32>() {
            let fd_path = format!("/proc/{}/fd", pid);
            if let Ok(fd_dir) = fs::read_dir(&fd_path) {
                for fd_entry in fd_dir.flatten() {
                    if let Ok(link) = fs::read_link(fd_entry.path()) {
                        let link_str = link.to_string_lossy();
                        if link_str.contains(&format!("socket:[{}]", target_inode)) {
                            return Some(pid);
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn get_process_name_impl(pid: u32) -> Option<String> {
    // Read from /proc/{pid}/comm
    let comm_path = format!("/proc/{}/comm", pid);
    fs::read_to_string(&comm_path)
        .ok()
        .map(|s| s.trim().to_string())
}

pub async fn kill_port_process_impl(pid: u32) -> Result<(), String> {
    let output = Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to kill process: {}", stderr));
    }

    Ok(())
}

// ============================================================================
// Auto-Startup (XDG Autostart)
// ============================================================================

fn get_autostart_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("Could not find config directory")?;
    let autostart_dir = config_dir.join("autostart");

    // Create directory if it doesn't exist
    fs::create_dir_all(&autostart_dir).map_err(|e| e.to_string())?;

    Ok(autostart_dir)
}

fn get_desktop_file_path() -> Result<PathBuf, String> {
    Ok(get_autostart_dir()?.join("bunchatools.desktop"))
}

pub fn get_launch_at_startup_impl() -> Result<bool, String> {
    let desktop_file = get_desktop_file_path()?;
    Ok(desktop_file.exists())
}

pub fn set_launch_at_startup_impl(enable: bool) -> Result<(), String> {
    let desktop_file = get_desktop_file_path()?;

    if enable {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let desktop_content = format!(
            r#"[Desktop Entry]
Type=Application
Name=BunchaTools
Comment=A lightweight launcher for creative developers
Exec={}
Terminal=false
StartupNotify=false
Categories=Utility;
"#,
            exe_path.display()
        );

        fs::write(&desktop_file, desktop_content).map_err(|e| e.to_string())?;
    } else {
        if desktop_file.exists() {
            fs::remove_file(&desktop_file).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ============================================================================
// FFmpeg Path Resolution
// ============================================================================

pub fn get_ffmpeg_path() -> Result<PathBuf, String> {
    // Get executable directory
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Failed to get exe directory")?
        .to_path_buf();

    // Get current working directory
    let cwd = std::env::current_dir().unwrap_or_default();

    let possible_paths = vec![
        // Production paths (Tauri sidecar)
        exe_dir.join("ffmpeg"),
        exe_dir.join("binaries").join("ffmpeg"),
        // Development paths
        cwd.join("src-tauri/binaries/ffmpeg-x86_64-unknown-linux-gnu"),
        cwd.join("binaries/ffmpeg-x86_64-unknown-linux-gnu"),
        // System ffmpeg as fallback
        PathBuf::from("/usr/bin/ffmpeg"),
        PathBuf::from("/usr/local/bin/ffmpeg"),
    ];

    for path in &possible_paths {
        if path.exists() {
            log::info!("Found FFmpeg at: {:?}", path);
            return Ok(path.clone());
        }
    }

    // Try to find ffmpeg in PATH using which
    if let Ok(output) = Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                return Ok(PathBuf::from(path_str));
            }
        }
    }

    Err(format!(
        "FFmpeg not found. CWD: {:?}, Searched in: {:?}",
        cwd, possible_paths
    ))
}
