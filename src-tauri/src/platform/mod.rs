// Platform-specific implementations dispatcher
// Uses compile-time #[cfg] guards to select the correct implementation

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

// Re-export platform functions with unified names
#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
pub use linux::*;

// Shared types used across platforms
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortProcess {
    pub pid: u32,
    pub name: String,
    pub port: u16,
    pub protocol: String,
}
