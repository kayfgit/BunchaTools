import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  Search,
  X,
  Loader2,
  ArrowDown,
  TrendingUp,
  RefreshCw,
  Image,
  Music,
  Video,
  FileText,
  Upload,
  Check,
  Monitor,
  AlertCircle,
  Copy,
  File,
  ArrowRight,
  Repeat2,
  Network,
  Languages,
  Pipette,
  Settings as SettingsIcon,
  LucideIcon,
  DollarSign,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  action?: () => Promise<void>;
  isSettings?: boolean;
}

interface Settings {
  hotkey_modifiers: string[];
  hotkey_key: string;
  launch_at_startup: boolean;
}

const BASE_HEIGHT = 500;
const SETTINGS_HEIGHT = 280;
const CONVERTER_HEIGHT = 450;
const PORT_KILLER_HEIGHT = 450;
const CURRENCY_HEIGHT = 550;
const TRANSLATION_HEIGHT = 380;

// Format options for converter
const FORMAT_OPTIONS = {
  image: ["PNG", "JPG", "WEBP", "GIF", "BMP", "ICO"],
  audio: ["MP3", "WAV", "FLAC", "AAC", "OGG", "M4A"],
  video: ["MP4", "AVI", "MOV", "GIF", "WEBM", "MKV"],
};

// File type filters for open dialog
const FILE_FILTERS = {
  image: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "tiff"] }],
  audio: [{ name: "Audio", extensions: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"] }],
  video: [{ name: "Video", extensions: ["mp4", "avi", "mov", "mkv", "webm", "wmv", "flv"] }],
};

type ConverterType = "image" | "audio" | "video";

interface SelectedFile {
  name: string;
  path: string;
  size: number;
}

interface PortProcess {
  pid: number;
  name: string;
  port: number;
  protocol: string;
}

const COMMON_PORTS = [3000, 3001, 5173, 8080, 8000, 4200, 5000, 1420];

// Currency conversion
interface CurrencyResult {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
}

interface CurrencyQuery {
  amount: number;
  from: string;
  to: string;
}

interface TranslationResult {
  translated_text: string;
  detected_language: string;
  target_language: string;
}

// Common currency aliases
const CURRENCY_ALIASES: Record<string, string> = {
  // Names to codes
  dollar: "USD", dollars: "USD", usd: "USD",
  euro: "EUR", euros: "EUR", eur: "EUR",
  pound: "GBP", pounds: "GBP", gbp: "GBP", sterling: "GBP",
  yen: "JPY", jpy: "JPY",
  yuan: "CNY", cny: "CNY", rmb: "CNY", renminbi: "CNY",
  won: "KRW", krw: "KRW",
  rupee: "INR", rupees: "INR", inr: "INR",
  franc: "CHF", francs: "CHF", chf: "CHF",
  real: "BRL", reais: "BRL", brl: "BRL",
  peso: "MXN", pesos: "MXN", mxn: "MXN",
  ruble: "RUB", rubles: "RUB", rub: "RUB",
  lira: "TRY", try: "TRY",
  rand: "ZAR", zar: "ZAR",
  krona: "SEK", kronor: "SEK", sek: "SEK",
  krone: "NOK", kroner: "NOK", nok: "NOK",
  // Direct codes
  aud: "AUD", cad: "CAD", nzd: "NZD", sgd: "SGD", hkd: "HKD",
  dkk: "DKK", pln: "PLN", czk: "CZK", huf: "HUF", ils: "ILS",
  thb: "THB", myr: "MYR", php: "PHP", idr: "IDR",
};

// Parse currency query like "20 usd in yen" or "100 eur to usd"
function parseCurrencyQuery(query: string): CurrencyQuery | null {
  const cleaned = query.toLowerCase().trim();

  // Pattern: <amount> <currency> (in|to) <currency>
  const match = cleaned.match(/^([\d.,]+)\s*([a-z]+)\s+(?:in|to)\s+([a-z]+)$/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  const fromInput = match[2];
  const toInput = match[3];

  const from = CURRENCY_ALIASES[fromInput] || fromInput.toUpperCase();
  const to = CURRENCY_ALIASES[toInput] || toInput.toUpperCase();

  // Basic validation - currency codes are 3 letters
  if (from.length !== 3 || to.length !== 3) return null;
  if (from === to) return null;

  return { amount, from, to };
}

// Safe calculator function that evaluates basic math expressions
function evaluateExpression(expr: string): string | null {
  // Remove all spaces
  const cleaned = expr.replace(/\s/g, "");

  // Check if it looks like a math expression (must contain at least one operator)
  if (!/^[\d.]+[+\-*/^][\d.+\-*/^()]+$/.test(cleaned) && !/^\(.*\)$/.test(cleaned)) {
    // Also check for expressions starting with negative numbers or parentheses
    if (!/^-?[\d.]+[+\-*/^]/.test(cleaned) && !/^\(/.test(cleaned)) {
      return null;
    }
  }

  // Only allow safe characters: digits, operators, parentheses, decimal point
  if (!/^[\d+\-*/^().]+$/.test(cleaned)) {
    return null;
  }

  try {
    // Replace ^ with ** for exponentiation
    const withPower = cleaned.replace(/\^/g, "**");

    // Use Function constructor for safer evaluation (still sandboxed to math)
    // This is safer than eval() as it doesn't have access to local scope
    const result = new Function(`"use strict"; return (${withPower})`)();

    // Check if result is a valid number
    if (typeof result !== "number" || !isFinite(result)) {
      return null;
    }

    // Format the result (limit decimal places, add thousand separators with dots)
    const rounded = Number.isInteger(result)
      ? result
      : parseFloat(result.toFixed(10));

    // Format with dots as thousand separators
    const formatted = rounded.toLocaleString('de-DE');

    return formatted;
  } catch {
    return null;
  }
}

function App() {
  const [query, setQuery] = useState("");
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    hotkey_modifiers: ["Alt"],
    hotkey_key: "Q",
    launch_at_startup: false,
  });
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hotkeyInputRef = useRef<HTMLDivElement>(null);

  // Converter state
  const [showConverter, setShowConverter] = useState(false);
  const [converterType, setConverterType] = useState<ConverterType | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [targetFormat, setTargetFormat] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');

  // Port killer state
  const [showPortKiller, setShowPortKiller] = useState(false);
  const [portInput, setPortInput] = useState("");
  const [portProcesses, setPortProcesses] = useState<PortProcess[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPort, setScannedPort] = useState<number | null>(null);

  // Currency converter state
  const [currencyResult, setCurrencyResult] = useState<CurrencyResult | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [lastCurrencyQuery, setLastCurrencyQuery] = useState<string>("");
  const [currencyUpdatedAt, setCurrencyUpdatedAt] = useState<Date | null>(null);

  // Quick Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationInput, setTranslationInput] = useState("");
  const [translationOutput, setTranslationOutput] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("Detecting...");
  const [targetLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Define tools
  const tools: Tool[] = [
    {
      id: "color-picker",
      name: "Color Picker",
      description: "Pick any color from your screen",
      icon: Pipette,
      keywords: ["color", "picker", "eyedropper", "hex", "rgb", "colour"],
      action: async () => {
        try {
          const color = await invoke<string>("pick_color");
          await writeText(color);
          setStatus(`Copied ${color}`);
          setTimeout(() => setStatus(null), 2000);
        } catch (e) {
          if (e !== "Cancelled") {
            console.error("Color picker error:", e);
          }
        }
      },
    },
    {
      id: "omni-converter",
      name: "Omni Converter",
      description: "Convert images, audio, and video files",
      icon: Repeat2,
      keywords: ["convert", "converter", "video", "audio", "image", "mp4", "mp3", "png", "jpg", "wav", "gif", "webp", "avi", "mkv"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: false });
        setShowConverter(true);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
        setQuery("");
      },
    },
    {
      id: "port-killer",
      name: "Port Killer",
      description: "Free up ports that didn't close properly",
      icon: Network,
      keywords: ["port", "kill", "process", "free", "localhost", "server", "3000", "8080", "1420", "network", "tcp"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: false });
        setShowPortKiller(true);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
        setQuery("");
      },
    },
    {
      id: "quick-translation",
      name: "Quick Translate",
      description: "Instant translation of highlighted text",
      icon: Languages,
      keywords: ["translate", "translation", "language", "japanese", "english", "spanish", "french", "german", "chinese", "korean"],
      action: async () => {
        setQuery("");
        // Reset translation state
        setTranslationInput("");
        setTranslationOutput("");
        setDetectedLanguage("Detecting...");
        setTranslationError(null);
        setIsTranslating(false);

        try {
          // Start text selection mode - window hides, cursor changes to I-beam
          // User selects text, Ctrl+C is simulated, window shows after mouse release
          await invoke("start_text_selection");

          // Read the copied text from clipboard
          const clipboardText = await readText();

          if (clipboardText && clipboardText.trim()) {
            setTranslationInput(clipboardText);
            setShowTranslation(true);

            // Start translation immediately
            setIsTranslating(true);
            try {
              const result = await invoke<TranslationResult>("translate_text", {
                text: clipboardText,
                targetLang: targetLanguage,
              });
              setTranslationOutput(result.translated_text);
              setDetectedLanguage(result.detected_language);
              setIsTranslating(false);
            } catch (translationErr) {
              setTranslationError(String(translationErr));
              setIsTranslating(false);
            }
          } else {
            // No text was selected/copied
            setShowTranslation(true);
            setTranslationInput("");
            setDetectedLanguage("No text selected");
          }
        } catch (e) {
          // User cancelled (pressed Escape), don't show translation window
          if (e !== "Cancelled") {
            console.error("Text selection error:", e);
          }
        }
      },
    },
    {
      id: "settings",
      name: "Settings",
      description: "Configure BunchaTools preferences",
      icon: SettingsIcon,
      keywords: ["settings", "preferences", "config", "options", "hotkey", "startup"],
      isSettings: true,
    },
  ];

  // Mark window ready and load settings on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Mark window as ready first - this enables hotkey and tray interactions
        await invoke("mark_window_ready");

        // Then load settings
        const s = await invoke<Settings>("get_settings");
        setSettings(s);
      } catch (e) {
        console.error("Failed to initialize:", e);
      }
    };
    initialize();
  }, []);

  // Listen for conversion progress events
  useEffect(() => {
    const unlisten = listen<number>("conversion-progress", (event) => {
      setConversionProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen("focus-search", async () => {
      await invoke("set_auto_hide", { enabled: true });
      setQuery("");
      setSelectedIndex(0);
      setStatus(null);
      setShowSettings(false);
      setShowConverter(false);
      setConverterType(null);
      setSelectedFile(null);
      setTargetFormat(null);
      setShowPortKiller(false);
      setPortInput("");
      setPortProcesses([]);
      setScannedPort(null);
      setCurrencyResult(null);
      setCurrencyError(null);
      setLastCurrencyQuery("");
      setShowTranslation(false);
      setTranslationInput("");
      setTranslationOutput("");
      setDetectedLanguage("Detecting...");
      setTranslationError(null);
      inputRef.current?.focus();
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (query.trim() === "") {
      setFilteredTools(tools);
      setSelectedIndex(0);
      setCurrencyResult(null);
      setCurrencyError(null);
      setLastCurrencyQuery("");
    } else {
      const q = query.toLowerCase();
      const filtered = tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q) ||
          tool.keywords.some((k) => k.includes(q))
      );
      setFilteredTools(filtered);
      setSelectedIndex(0);

      // Check for currency query
      const currencyQuery = parseCurrencyQuery(query);
      if (currencyQuery && query !== lastCurrencyQuery) {
        setLastCurrencyQuery(query);
        setCurrencyLoading(true);
        setCurrencyError(null);
        invoke<CurrencyResult>("convert_currency", {
          amount: currencyQuery.amount,
          from: currencyQuery.from,
          to: currencyQuery.to,
        })
          .then((result) => {
            setCurrencyResult(result);
            setCurrencyUpdatedAt(new Date());
            setCurrencyLoading(false);
          })
          .catch((err) => {
            setCurrencyError(String(err));
            setCurrencyResult(null);
            setCurrencyLoading(false);
          });
      } else if (!currencyQuery) {
        setCurrencyResult(null);
        setCurrencyError(null);
      }
    }
  }, [query]);

  // Resize window based on view
  useEffect(() => {
    const resizeWindow = async () => {
      const appWindow = getCurrentWindow();
      let newHeight = BASE_HEIGHT;

      if (showConverter) {
        newHeight = CONVERTER_HEIGHT;
      } else if (showPortKiller) {
        newHeight = PORT_KILLER_HEIGHT;
      } else if (showTranslation) {
        newHeight = TRANSLATION_HEIGHT;
      } else if (showSettings) {
        newHeight = SETTINGS_HEIGHT;
      } else if (currencyResult || currencyLoading) {
        newHeight = CURRENCY_HEIGHT;
      }

      await appWindow.setSize(new LogicalSize(680, newHeight));
    };
    resizeWindow();
  }, [showSettings, showConverter, showPortKiller, showTranslation, currencyResult, currencyLoading]);

  const executeTool = async (tool: Tool) => {
    if (tool.isSettings) {
      setShowSettings(true);
      setQuery("");
    } else if (tool.action) {
      setQuery("");
      await tool.action();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showConverter) {
        await invoke("set_auto_hide", { enabled: true });
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
      } else if (showPortKiller) {
        await invoke("set_auto_hide", { enabled: true });
        setShowPortKiller(false);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
      } else if (showTranslation) {
        setShowTranslation(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else {
        invoke("hide_window");
        setQuery("");
      }
    } else if (!showSettings && !showConverter && !showPortKiller && !showTranslation) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredTools.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && filteredTools.length > 0) {
        e.preventDefault();
        await executeTool(filteredTools[selectedIndex]);
      }
    }
  };

  const handleHotkeyKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.key === "Escape") {
      setIsRecordingHotkey(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    // Get the actual key (not modifier keys)
    const key = e.key.toUpperCase();
    if (["CONTROL", "ALT", "SHIFT", "META"].includes(key)) {
      return; // Wait for actual key
    }

    // Map special keys
    let mappedKey = key;
    if (key === " ") mappedKey = "Space";
    else if (key.length === 1) mappedKey = key;
    else if (key.startsWith("F") && key.length <= 3) mappedKey = key;

    if (modifiers.length > 0 || ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].includes(mappedKey)) {
      setSettings((prev) => ({
        ...prev,
        hotkey_modifiers: modifiers,
        hotkey_key: mappedKey,
      }));
      setIsRecordingHotkey(false);
    }
  };

  const saveSettings = async () => {
    try {
      await invoke("save_settings", { settings });
      setStatus("Settings saved!");
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      console.error("Failed to save settings:", e);
      setStatus("Failed to save settings");
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const hotkeyDisplay = [...settings.hotkey_modifiers, settings.hotkey_key].join(" + ");
  const showCurrency = (currencyResult || currencyLoading) && !showSettings && !showConverter && !showPortKiller;
  const calculatorResult = query ? evaluateExpression(query) : null;

  // Global escape key handler for panels without input focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCurrency) {
          setCurrencyResult(null);
          setCurrencyError(null);
          setQuery("");
        } else if (showSettings) {
          setShowSettings(false);
        }
      }
    };

    if (showCurrency || showSettings) {
      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [showCurrency, showSettings]);

  // Format time ago for currency update
  const getTimeAgo = (date: Date | null) => {
    if (!date) return "";
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Updated just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "Updated 1 minute ago";
    return `Updated ${minutes} minutes ago`;
  };

  // Refresh currency rate
  const refreshCurrency = async () => {
    if (!currencyResult) return;
    setCurrencyLoading(true);
    try {
      const result = await invoke<CurrencyResult>("convert_currency", {
        amount: currencyResult.amount,
        from: currencyResult.from,
        to: currencyResult.to,
      });
      setCurrencyResult(result);
      setCurrencyUpdatedAt(new Date());
    } catch (err) {
      setCurrencyError(String(err));
    } finally {
      setCurrencyLoading(false);
    }
  };

  // Port killer functions
  const handleScanPort = async (port: number) => {
    setIsScanning(true);
    setScannedPort(port);
    try {
      const processes = await invoke<PortProcess[]>("scan_port", { port });
      setPortProcesses(processes);
    } catch (e) {
      console.error("Scan port error:", e);
      setPortProcesses([]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleKillProcess = async (pid: number) => {
    try {
      await invoke("kill_port_process", { pid });
      // Re-scan to update the list
      if (scannedPort !== null) {
        await handleScanPort(scannedPort);
      }
      setStatus("Process killed");
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      console.error("Kill process error:", e);
      setStatus(`Failed: ${e}`);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // Handle window dragging - only drag from elements with data-drag-region
  const handleDragStart = async (e: React.MouseEvent) => {
    // Only start drag if clicking directly on a drag region (not on buttons inside it)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-region]') || target.closest('button, input')) return;

    // Set dragging flag to prevent auto-hide during drag
    await invoke("set_dragging", { dragging: true });

    try {
      await getCurrentWindow().startDragging();
    } finally {
      // Clear dragging flag after drag ends
      await invoke("set_dragging", { dragging: false });
    }
  };

  // Helper to get file extension
  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "";
  };

  // Helper to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle file selection via dialog
  const handleSelectFile = async () => {
    if (!converterType) return;
    const result = await open({
      filters: FILE_FILTERS[converterType],
      multiple: false,
    });
    if (result) {
      // Get file info
      const path = result as string;
      const name = path.split(/[\\/]/).pop() || "";
      // We'll estimate size client-side or could add a backend command
      setSelectedFile({ name, path, size: 0 });
      setTargetFormat(null);
    }
  };

  // Handle conversion
  const handleConvert = async () => {
    if (!selectedFile || !targetFormat || !converterType) return;

    const ext = targetFormat.toLowerCase();
    const defaultName = selectedFile.name.replace(/\.[^.]+$/, `.${ext}`);

    const outputPath = await save({
      defaultPath: defaultName,
      filters: [{ name: targetFormat, extensions: [ext] }],
    });

    if (!outputPath) return;

    setIsConverting(true);
    setConversionProgress(0);
    setConversionStatus('converting');

    try {
      if (converterType === "image") {
        await invoke("convert_image", { inputPath: selectedFile.path, outputPath });
      } else {
        await invoke("convert_media", { inputPath: selectedFile.path, outputPath });
      }

      // Show success state
      setConversionStatus('success');
      setConversionProgress(100);

      // Wait a moment to show success, then close
      setTimeout(async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
        setIsConverting(false);
        setConversionStatus('idle');
        setConversionProgress(0);
      }, 1500);
    } catch (e) {
      console.error("Conversion error:", e);
      setConversionStatus('error');
      // Show error in status bar
      setStatus(String(e));

      // Reset after showing error
      setTimeout(() => {
        setIsConverting(false);
        setConversionStatus('idle');
        setConversionProgress(0);
        setStatus(null);
      }, 4000);
    }
  };

  return (
    <div className="p-2 select-none">
      {/* Command Palette - Hidden when tools are open */}
      {!showConverter && !showPortKiller && !showTranslation && !showSettings && !showCurrency && (
        <div
          className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden"
          onMouseDown={handleDragStart}
        >
          {/* Search Input */}
          <div className="relative border-b border-buncha-border py-4" data-drag-region>
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Search className="w-5 h-5 text-buncha-text-muted" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status || "Search for tools..."}
              className={`ml-15 w-145 py-1 bg-transparent text-lg outline-none ${
                status
                  ? "text-buncha-accent placeholder-buncha-accent"
                  : "text-buncha-text placeholder-buncha-text-muted"
              }`}
              autoFocus
            />
            {calculatorResult && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <span className="z-99 select-text text-buncha-text-muted text-base">= {calculatorResult}</span>
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-[340px] overflow-y-auto scrollbar-hidden">
            {filteredTools.length > 0 ? (
              <div className="py-2">
                {filteredTools.map((tool, index) => {
                  const IconComponent = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => executeTool(tool)}
                      className={`group px-5 py-4 transition-all cursor-pointer flex items-center gap-4 ${
                        index === selectedIndex
                          ? "bg-buncha-surface/50"
                          : "hover:bg-buncha-surface/50"
                      }`}
                    >
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                        index === selectedIndex
                          ? "bg-buncha-accent/20"
                          : "bg-buncha-accent/10 group-hover:bg-buncha-accent/20"
                      }`}>
                        <IconComponent className="w-6 h-6 text-buncha-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-0.5 transition-colors ${
                          index === selectedIndex
                            ? "text-buncha-accent"
                            : "text-buncha-text group-hover:text-buncha-accent"
                        }`}>
                          {tool.name}
                        </h3>
                        <p className="text-sm text-buncha-text-muted line-clamp-1">
                          {tool.description}
                        </p>
                      </div>
                      <ArrowRight className={`w-5 h-5 text-buncha-text-muted transition-all ${
                        index === selectedIndex
                          ? "opacity-100 translate-x-1"
                          : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
                      }`} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 px-5 text-center">
                <div className="w-16 h-16 rounded-full bg-buncha-surface/50 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-buncha-text-muted" />
                </div>
                <p className="text-buncha-text-muted mb-1">No tools found</p>
                <p className="text-sm text-buncha-text-muted/70">Try searching for "converter" or "translate"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-buncha-border px-5 py-3 bg-buncha-surface/30" data-drag-region>
            <div className="flex items-center justify-between text-xs text-buncha-text-muted">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                    <span className="font-medium">↑</span>
                  </div>
                  <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                    <span className="font-medium">↓</span>
                  </div>
                  <span>to navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                    <span className="font-medium">↵</span>
                  </div>
                  <span>to select</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                  <span className="font-medium">esc</span>
                </div>
                <span>to close</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={handleDragStart}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-buncha-border cursor-default" data-drag-region>
            <div className="flex items-center">
              <SettingsIcon className="w-5 h-5 text-buncha-accent mr-3" />
              <span className="text-buncha-text text-base font-medium">Settings</span>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-buncha-text-muted hover:text-buncha-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {/* Hotkey Setting */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-buncha-text text-sm font-medium">Hotkey</div>
                <div className="text-buncha-text-muted text-xs">
                  Keyboard shortcut to open BunchaTools
                </div>
              </div>
              <div
                ref={hotkeyInputRef}
                tabIndex={0}
                onClick={() => setIsRecordingHotkey(true)}
                onKeyDown={isRecordingHotkey ? handleHotkeyKeyDown : undefined}
                onBlur={() => setIsRecordingHotkey(false)}
                className={`px-4 py-2 rounded-lg border min-w-32 text-center transition-colors cursor-pointer ${
                  isRecordingHotkey
                    ? "border-buncha-accent bg-buncha-accent/20 text-buncha-accent"
                    : "border-buncha-border bg-buncha-surface text-buncha-text hover:border-buncha-text-muted"
                }`}
              >
                {isRecordingHotkey ? "Press keys..." : hotkeyDisplay}
              </div>
            </div>

            {/* Launch at Startup */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-buncha-text text-sm font-medium">
                  Launch at startup
                </div>
                <div className="text-buncha-text-muted text-xs">
                  Start BunchaTools when you log in
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    launch_at_startup: !prev.launch_at_startup,
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.launch_at_startup
                    ? "bg-buncha-accent"
                    : "bg-buncha-surface border border-buncha-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    settings.launch_at_startup
                      ? "translate-x-6"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-buncha-accent text-white rounded-lg text-sm font-medium hover:bg-buncha-accent/80 transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Conversion Panel */}
      {showCurrency && (
        <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={handleDragStart}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-buncha-border cursor-default" data-drag-region>
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-buncha-accent mr-3" />
              <span className="text-buncha-text text-base font-medium">Currency Conversion</span>
            </div>
            <button
              onClick={() => {
                setCurrencyResult(null);
                setCurrencyError(null);
                setQuery("");
              }}
              className="text-buncha-text-muted hover:text-buncha-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            {currencyLoading && !currencyResult ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-buncha-accent" />
              </div>
            ) : currencyError ? (
              <div className="text-center py-8">
                <div className="text-red-400 text-sm">{currencyError}</div>
              </div>
            ) : currencyResult && (
              <>
                {/* From section */}
                <div className="text-buncha-text-muted text-sm mb-2">From</div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-buncha-surface border border-buncha-border rounded-lg px-4 py-3">
                    <span className="text-buncha-text text-lg select-text">{currencyResult.amount.toLocaleString()}</span>
                  </div>
                  <div className="bg-buncha-surface border border-buncha-border rounded-lg px-4 py-3 min-w-[80px] text-center">
                    <span className="text-buncha-text font-medium select-text">{currencyResult.from}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center my-2">
                  <div className="w-8 h-8 rounded-full bg-buncha-surface border border-buncha-border flex items-center justify-center">
                    <ArrowDown className="w-4 h-4 text-buncha-text-muted" />
                  </div>
                </div>

                {/* To section */}
                <div className="text-buncha-text-muted text-sm mb-2">To</div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-buncha-surface border border-buncha-border rounded-lg px-4 py-3">
                    <span className="text-buncha-accent text-lg font-medium select-text">
                      {currencyResult.result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-buncha-surface border border-buncha-border rounded-lg px-4 py-3 min-w-[80px] text-center">
                    <span className="text-buncha-text font-medium select-text">{currencyResult.to}</span>
                  </div>
                </div>

                {/* Rate info */}
                <div className="flex items-center justify-between p-3 bg-buncha-surface rounded-lg border border-buncha-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-buncha-accent/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-buncha-accent" />
                    </div>
                    <div>
                      <div className="text-buncha-text text-sm select-text">
                        1 {currencyResult.from} = {currencyResult.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {currencyResult.to}
                      </div>
                      <div className="text-buncha-text-muted text-xs">{getTimeAgo(currencyUpdatedAt)}</div>
                    </div>
                  </div>
                  <button
                    onClick={refreshCurrency}
                    disabled={currencyLoading}
                    className="text-buncha-text-muted hover:text-buncha-text cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 ${currencyLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Converter Panel */}
      {showConverter && (
        <div className="bg-buncha-bg border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={handleDragStart}>
          {/* Tool Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-buncha-border cursor-default" data-drag-region>
            <div className="flex items-center">
              <span className="text-xl mr-3">🔄</span>
              <span className="text-buncha-text text-base font-medium">Omni Converter</span>
            </div>
            <button
              onClick={async () => {
                await invoke("set_auto_hide", { enabled: true });
                setShowConverter(false);
                setConverterType(null);
                setSelectedFile(null);
                setTargetFormat(null);
              }}
              className="text-buncha-text-muted hover:text-buncha-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            {/* Type Selection View */}
            {!converterType && (
              <>
                <div className="text-buncha-text text-sm font-medium mb-4">
                  Choose conversion type
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Images */}
                  <button
                    onClick={() => setConverterType("image")}
                    className="flex flex-col items-center justify-center p-6 rounded-lg border border-buncha-border bg-buncha-surface hover:border-buncha-text-muted transition-colors cursor-pointer"
                  >
                    <Image className="w-8 h-8 mb-2 text-blue-500" />
                    <span className="text-blue-500 text-sm font-medium">Images</span>
                  </button>
                  {/* Audio */}
                  <button
                    onClick={() => setConverterType("audio")}
                    className="flex flex-col items-center justify-center p-6 rounded-lg border border-buncha-border bg-buncha-surface hover:border-buncha-text-muted transition-colors cursor-pointer"
                  >
                    <Music className="w-8 h-8 mb-2 text-green-500" />
                    <span className="text-green-500 text-sm font-medium">Audio</span>
                  </button>
                  {/* Video */}
                  <button
                    onClick={() => setConverterType("video")}
                    className="flex flex-col items-center justify-center p-6 rounded-lg border border-buncha-border bg-buncha-surface hover:border-buncha-text-muted transition-colors cursor-pointer"
                  >
                    <Video className="w-8 h-8 mb-2 text-purple-500" />
                    <span className="text-purple-500 text-sm font-medium">Video</span>
                  </button>
                  {/* Documents - Disabled */}
                  <button
                    disabled
                    className="flex flex-col items-center justify-center p-6 rounded-lg border border-buncha-border bg-buncha-surface opacity-50 cursor-not-allowed"
                  >
                    <FileText className="w-8 h-8 mb-2 text-orange-500" />
                    <span className="text-orange-500 text-sm font-medium">Documents</span>
                  </button>
                </div>
              </>
            )}

            {/* Conversion View */}
            {converterType && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-buncha-text text-sm font-medium">
                    {converterType.charAt(0).toUpperCase() + converterType.slice(1)} Conversion
                  </div>
                  <button
                    onClick={() => {
                      setConverterType(null);
                      setSelectedFile(null);
                      setTargetFormat(null);
                    }}
                    className="text-buncha-accent text-sm hover:underline cursor-pointer"
                  >
                    Change type
                  </button>
                </div>

                {/* File Selection */}
                <div className="text-buncha-text-muted text-xs mb-2">Select file</div>
                {!selectedFile ? (
                  <button
                    onClick={handleSelectFile}
                    className="w-full p-8 border-2 border-dashed border-buncha-border rounded-lg hover:border-buncha-text-muted transition-colors flex flex-col items-center justify-center cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-buncha-surface flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-buncha-accent" />
                    </div>
                    <span className="text-buncha-accent text-sm font-medium">Click to upload</span>
                    <span className="text-buncha-text-muted text-xs mt-1">or drag and drop your file here</span>
                  </button>
                ) : (
                  <div className="flex items-center p-3 bg-buncha-surface rounded-lg border border-buncha-border">
                    <div className="w-10 h-10 rounded bg-buncha-bg flex items-center justify-center mr-3">
                      <File className="w-5 h-5 text-buncha-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-buncha-text text-sm font-medium truncate">{selectedFile.name}</div>
                      {selectedFile.size > 0 && (
                        <div className="text-buncha-text-muted text-xs">{formatFileSize(selectedFile.size)}</div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setTargetFormat(null);
                      }}
                      className="text-buncha-text-muted hover:text-buncha-text ml-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Format Selection */}
                {selectedFile && (
                  <>
                    <div className="text-buncha-text-muted text-xs mt-4 mb-2">Convert to</div>
                    <div className="grid grid-cols-3 gap-2">
                      {FORMAT_OPTIONS[converterType].map((format) => {
                        const isCurrentFormat = getFileExtension(selectedFile.name) === format;
                        const isSelected = targetFormat === format;
                        return (
                          <button
                            key={format}
                            onClick={() => !isCurrentFormat && setTargetFormat(format)}
                            disabled={isCurrentFormat}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              isCurrentFormat
                                ? "bg-buncha-surface text-buncha-text-muted cursor-not-allowed"
                                : isSelected
                                ? "bg-buncha-accent text-white cursor-pointer"
                                : "bg-buncha-surface text-buncha-text border border-buncha-border hover:border-buncha-text-muted cursor-pointer"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-4 h-4 inline mr-1" strokeWidth={3} />
                            )}
                            {format}
                          </button>
                        );
                      })}
                    </div>

                    {/* Convert Button / Progress Bar */}
                    {targetFormat && (
                      <>
                        {!isConverting ? (
                          <button
                            onClick={handleConvert}
                            className="w-full mt-4 py-3 bg-buncha-accent text-white rounded-lg text-sm font-medium hover:bg-buncha-accent/80 transition-colors cursor-pointer"
                          >
                            Convert {getFileExtension(selectedFile.name)} → {targetFormat}
                          </button>
                        ) : (
                          <div className="w-full mt-4 relative">
                            {/* Progress bar background */}
                            <div
                              className={`w-full py-3 rounded-lg text-sm font-medium text-center text-white relative overflow-hidden transition-colors ${
                                conversionStatus === 'success'
                                  ? 'bg-green-600'
                                  : conversionStatus === 'error'
                                  ? 'bg-red-600'
                                  : 'bg-buncha-surface border border-buncha-border'
                              }`}
                            >
                              {/* Progress fill - only show during converting */}
                              {conversionStatus === 'converting' && (
                                <div
                                  className="absolute inset-0 bg-buncha-accent transition-all duration-300 ease-out"
                                  style={{ width: `${conversionProgress}%` }}
                                />
                              )}
                              {/* Text */}
                              <span className="relative z-10">
                                {conversionStatus === 'success'
                                  ? 'Completed'
                                  : conversionStatus === 'error'
                                  ? 'Failed to convert'
                                  : `Converting: ${conversionProgress}%`}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Port Killer Panel */}
      {showPortKiller && (
        <div className="bg-buncha-bg border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={handleDragStart}>
          {/* Tool Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-buncha-border cursor-default" data-drag-region>
            <div className="flex items-center">
              <span className="text-xl mr-3">🔌</span>
              <span className="text-buncha-text text-base font-medium">Port Killer</span>
            </div>
            <button
              onClick={async () => {
                await invoke("set_auto_hide", { enabled: true });
                setShowPortKiller(false);
                setPortInput("");
                setPortProcesses([]);
                setScannedPort(null);
              }}
              className="text-buncha-text-muted hover:text-buncha-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            {/* Port Input */}
            <div className="text-buncha-text text-sm font-medium mb-3">Enter port number</div>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && portInput) {
                    handleScanPort(parseInt(portInput));
                  }
                }}
                placeholder="e.g., 3000"
                className="flex-1 bg-buncha-surface border border-buncha-border rounded-lg px-4 py-2 text-buncha-text placeholder-buncha-text-muted outline-none focus:border-buncha-accent"
                data-no-drag
              />
              <button
                onClick={() => portInput && handleScanPort(parseInt(portInput))}
                disabled={!portInput || isScanning}
                className="px-4 py-2 bg-buncha-accent text-white rounded-lg text-sm font-medium hover:bg-buncha-accent/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Scan
              </button>
            </div>

            {/* Common Ports */}
            <div className="text-buncha-text-muted text-xs mb-2">Common ports</div>
            <div className="flex flex-wrap gap-2 mb-6">
              {COMMON_PORTS.map((port) => (
                <button
                  key={port}
                  onClick={() => {
                    setPortInput(port.toString());
                    handleScanPort(port);
                  }}
                  className="px-3 py-1.5 bg-buncha-surface border border-buncha-border rounded-lg text-buncha-text text-sm hover:border-buncha-text-muted transition-colors cursor-pointer"
                >
                  {port}
                </button>
              ))}
            </div>

            {/* Results Area */}
            <div className="min-h-[140px] flex flex-col">
              {isScanning ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center text-buncha-text-muted">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-sm">Scanning port {scannedPort}...</span>
                  </div>
                </div>
              ) : portProcesses.length > 0 ? (
                <div className="space-y-2">
                  {portProcesses.map((process) => (
                    <div
                      key={process.pid}
                      className="flex items-center justify-between p-3 bg-buncha-surface rounded-lg border border-buncha-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-buncha-bg flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-buncha-text-muted" />
                        </div>
                        <div>
                          <div className="text-buncha-text text-sm font-medium">{process.name}</div>
                          <div className="text-buncha-text-muted text-xs">
                            PID: {process.pid} | {process.protocol} :{process.port}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleKillProcess(process.pid)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Kill
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center text-buncha-text-muted">
                    <AlertCircle className="w-10 h-10 mb-2 opacity-50" strokeWidth={1.5} />
                    <span className="text-sm">
                      {scannedPort !== null
                        ? `No processes found on port ${scannedPort}`
                        : "No active processes found. Enter a port number to scan."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Translation Panel */}
      {showTranslation && (
        <div className="bg-[#121212] border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={handleDragStart}>
          {/* Header with close button */}
          <div className="border-b-buncha-border border-b flex items-center justify-between px-4 py-3 cursor-default" data-drag-region>
            <div className="flex items-center">
              <span className="text-xl mr-3">🌐</span>
              <span className="text-buncha-text text-base font-medium">Quick Translation</span>
            </div>
            <button
              onClick={() => setShowTranslation(false)}
              className="hover:bg-[#1B1B1B] p-2 rounded-full duration-200 text-buncha-text-muted hover:text-buncha-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4">
            {/* Source Language Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-buncha-accent text-xs font-medium tracking-wider uppercase">
                  {detectedLanguage}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => translationInput && writeText(translationInput)}
                    className="hover:bg-[#1B1B1B] p-2 rounded-full duration-200 text-buncha-text-muted hover:text-buncha-text cursor-pointer"
                    title="Copy source text"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-buncha-text text-lg min-h-[28px] select-text">
                {translationInput || <span className="text-buncha-text-muted italic">No text selected</span>}
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="flex items-center">
              <div className="grow border-t border-buncha-border"/>
              <div className="flex justify-center mx-4 my-4">
                {isTranslating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-buncha-accent" />
                ) : (
                  <ArrowDown className="w-5 h-5 text-buncha-text-muted" />
                )}
              </div>
              <div className="grow border-t border-buncha-border"/>
            </div>

            {/* Target Language Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-buncha-accent text-xs font-medium tracking-wider uppercase">ENGLISH</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => translationOutput && writeText(translationOutput)}
                    className="hover:bg-[#1B1B1B] p-2 rounded-full duration-200 text-buncha-text-muted hover:text-buncha-text cursor-pointer"
                    title="Copy translation"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-buncha-text text-lg min-h-[28px] select-text">
                {translationError ? (
                  <span className="text-red-400">{translationError}</span>
                ) : isTranslating ? (
                  <span className="text-buncha-text-muted italic">Translating...</span>
                ) : translationOutput ? (
                  translationOutput
                ) : (
                  <span className="text-buncha-text-muted italic">Translation will appear here</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-buncha-border">
              <p className="text-xs text-buncha-text-muted text-center">
                Translation powered by MyMemory
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
