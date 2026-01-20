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

### Quick Access
- Global hotkey activation (default: `Alt+Q`)
- Auto-hide when clicking away
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
Pick any color from anywhere on your screen. Click to capture and choose from all of the relevant color formats for professionals.

### Converters
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

### QR Code Generator
Generate QR codes instantly for various use cases without relying on online generators.

**Supported QR code types:**
- **URL**: Website links and URLs
- **WiFi**: Network credentials (SSID, password, encryption type)
- **Email**: Pre-filled email addresses with optional subject lines
- **Phone**: Phone numbers for quick dialing
- **Text**: Plain text messages
- **vCard**: Contact cards with name, phone, and email
- **Location**: Geographic coordinates (latitude/longitude)
- **Event**: Calendar events with title, date range, and location

**Features:**
- Real-time preview as you type
- Custom foreground and background colors
- Copy QR code image to clipboard
- Export to PNG, SVG, or PDF formats

All QR codes are generated locally on your machine.

### Regex Tester
Test and debug regular expressions with real-time feedback. No need to visit online regex testing sites.

**Features:**
- Real-time pattern matching as you type
- Flag toggles: global (g), case insensitive (i), multiline (m), dot-all (s)
- View all matches with their positions in the test string
- Capture group extraction and visualization
- Find-and-replace preview with highlighted replacements
- Support for group references ($1, $2, etc.) in replacements
- Copy pattern with flags, individual matches, or replacement results
- Built-in quick reference for common regex patterns

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

Currently Windows only. Linux and macOS support may be added in future updates.

---

## Contributing

Contributions are welcome. Feel free to open issues for bugs, feature requests, or submit pull requests.
