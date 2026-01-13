# Placeholder for app photo :)

An unbelievably lightweight, keyboard-activated launcher packed with a **Bunch of** developer and creative tools.

---

# Quick Translation

Placeholder for gifs showcasing the tool

# Local Port Killer 

Placeholder for gifs showcasing the tool

# Omni Converter 

Placeholder for gifs showcasing the tool

---

# About

BunchaTools is a fast, minimal utility application designed to solve a simple problem: developers and creative professionals constantly need small tools that are either annoying to access, buried in bloated software, or only available on sketchy websites.

Need to convert a video file? You used to have to visit some ad-ridden converter site and wait for uploads. Want to pick a color from your screen? That requires opening a full design application. Need to kill a process on port 3000? Time to remember the terminal commands again.

BunchaTools puts all these utilities in one place, accessible instantly with a single keyboard shortcut.

**Note: This project is in very early development and will receive constant updates. Expect new tools, improvements, and changes frequently.**

---

# Features

### Quick Access
- Global hotkey activation (default: `Alt+Q`)
- System tray integration
- Auto-hide when clicking away
- Remembers window position
- Instant search and filtering

### Built-in Calculator
Evaluate math expressions directly in the search bar. Just type your calculation and see the result instantly.

Supports: `+`, `-`, `*`, `/`, `^` (power), parentheses

### Currency Converter
Convert between currencies in real-time using natural queries.

- Query examples: `20 usd in yen`, `100 eur to gbp`
- Supports 30+ currencies with aliases (dollar, euro, pound, yen, etc.)
- Live exchange rates from Frankfurter API

### Color Picker
Pick any color from anywhere on your screen. Click to capture and automatically copy the hex value to your clipboard.

### Omni Converter
Convert media files locally without uploading to sketchy websites or dealing with watermarks.

**Supported formats:**
- Images: PNG, JPG, WEBP, GIF, BMP, ICO
- Audio: MP3, WAV, FLAC, AAC, OGG, M4A
- Video: MP4, AVI, MOV, GIF, WEBM, MKV

All conversions happen locally using FFmpeg. Your files never leave your machine.

### Port Killer
Free up ports by killing processes with a few clicks. No more remembering `netstat` commands.

- Scan for processes on specific ports
- View process details (PID, name, protocol)
- Kill processes instantly
- Quick presets for common development ports (3000, 5173, 8080, etc.)

### Quick Translation
Translate text between 30+ languages. Simply enable text selection mode, highlight any text on your screen, and get an instant translation.

- Automatic language detection
- Supports English, Japanese, Spanish, French, German, Chinese, Korean, Portuguese, Russian, Italian, Arabic, and many more
- Works with any text on your screen

---

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

---

# Platform Support

Currently Windows only. Linux and macOS support may be added in future updates.

---

## Contributing

Contributions are welcome. Feel free to open issues for bugs, feature requests, or submit pull requests.
