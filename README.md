<div align="center">
  <img width="1225" height="397" alt="banner" src="https://github.com/user-attachments/assets/0bfdd1d6-6902-4f4f-92c9-3456fa9565b3" />
      An unbelievably lightweight, keyboard-activated launcher packed with a Bunchatools™.
</div>

# About

BunchaTools is a fast, minimal utility application designed to solve a simple problem: developers and creative professionals constantly need small tools that are either annoying to access, buried in bloated software, or only available on sketchy websites.

Need to convert a video file? You used to have to visit some ad-ridden converter site and wait for uploads. Want to pick a color from your screen? That requires opening a full design application. Need to kill a process on port 3000? Time to remember the terminal commands again.

BunchaTools puts all these utilities in one place, accessible instantly with a single keyboard shortcut.

# Showcase

### Command Palette

<div align="center">
  <img width="674" height="468" alt="image" src="https://github.com/user-attachments/assets/6a58eca6-f038-496a-bf6d-6d7957da8bb9" />
</div>

### Local Port Killer 

<div align="center">
  <img width="680" height="402" alt="image" src="https://github.com/user-attachments/assets/df35fbc9-f4a7-4793-a587-b40bf7a12136" />
</div>

### Quick Translation

<div align="center">
  <img width="1483" height="504" alt="image" src="https://github.com/user-attachments/assets/d637a607-528c-4057-b530-7f7b49b2eacb" />
</div>

### QR Code Generator

<div align="center">
  <img width="797" height="566" alt="image" src="https://github.com/user-attachments/assets/0de6cf4a-32e5-4b75-b51f-e89490685f11" />
</div>

# Features

- Global hotkey activation (default: `Alt+Q`)
- Auto-hide when clicking away
- Instant search and filtering

### Tools

| Tool | Description |
|------|-------------|
| **Color Picker** | Pick any color from your screen and get it in multiple formats (HEX, RGB, HSL, etc.) |
| **Video Converter** | Convert videos between formats with quality presets. All conversions happen locally using FFmpeg |
| **Port Killer** | Find and kill processes using specific ports with quick presets for common dev ports |
| **Quick Translation** | Translate text between 30+ languages with automatic language detection |
| **QR Code Generator** | Generate QR codes for URLs, WiFi, contacts, events, and more. Export to PNG, SVG, or PDF |
| **Regex Tester** | Test and debug regular expressions with real-time matching, groups, and find-and-replace |
| **Git Downloader** | Download specific folders from GitHub repositories without cloning the entire repo |

### Quick Features

These work directly in the search bar:

| Feature | Description |
|---------|-------------|
| **Calculator** | Evaluate math expressions instantly (`2 + 2 * 3`, supports `^` for powers) |
| **Currency Converter** | Convert currencies with live rates (`100 usd to eur`, `50 pounds in yen`) |
| **Unit Converter** | Convert length, weight, temperature, volume, and time units |
| **Color Converter** | Parse and convert color formats with visual preview |

# Installation

### Download
Pre-built installers will be available in the [Releases](../../releases) section.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/kayfgit/BunchaTools.git
cd BunchaTools

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

# Platform Support

Currently Windows focused but works on some Linux systems. MacOS support may be added in future updates.

---

## Contributing

Contributions are welcome. Feel free to open issues for bugs, feature requests, or submit pull requests.
