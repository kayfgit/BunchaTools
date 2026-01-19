import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  Pipette,
  Repeat2,
  Network,
  Languages,
  Settings as SettingsIcon,
  DollarSign,
  Calculator,
  Ruler,
  QrCode,
  Braces,
  Palette,
} from "lucide-react";
import QRCodeLib from "qrcode";

// Import types
import type {
  Tool,
  Settings,
  ConverterType,
  SelectedFile,
  PortProcess,
  CurrencyResult,
  TranslationResult,
  QRCodeType,
  QRCodeData,
  ColorFormats,
  QuickResult,
} from "./types";

// Import constants
import { FILE_FILTERS, DEFAULT_QR_DATA } from "./constants";

// Import utils
import {
  convertHexToFormats,
  generateQRContent,
  parseUnitQuery,
  parsePartialUnitQuery,
  parseCurrencyQuery,
  parsePartialCurrencyQuery,
  evaluateExpression,
  parseColorQuery,
  rgbToHex,
} from "./utils";

// Import components
import {
  CommandPalette,
  SettingsPanel,
  OmniConverter,
  PortKiller,
  QuickTranslation,
  ColorPickerPanel,
  QRGenerator,
  RegexTester,
} from "./components";

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
    show_in_tray: true,
    automatic_updates: false,
    theme: "dark",
  });
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hotkeyInputRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const settingsInitialized = useRef(false);
  const toolItemRefs = useRef<(HTMLDivElement | null)[]>([]);

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
  const [lastCurrencyQuery, setLastCurrencyQuery] = useState<string>("");

  // Quick Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationInput, setTranslationInput] = useState("");
  const [translationOutput, setTranslationOutput] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("Detecting...");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslationSettingsOpen, setIsTranslationSettingsOpen] = useState(false);

  // Quick result state (calculator, unit conversion, currency)
  const [quickResult, setQuickResult] = useState<QuickResult | null>(null);

  // Color Picker Details state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickedColor, setPickedColor] = useState<ColorFormats | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // QR Code Generator state
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [qrType, setQRType] = useState<QRCodeType>("url");
  const [qrData, setQRData] = useState<QRCodeData>({ ...DEFAULT_QR_DATA });
  const [qrForegroundColor, setQRForegroundColor] = useState("#000000");
  const [qrBackgroundColor, setQRBackgroundColor] = useState("#FFFFFF");
  const [showQRCustomization, setShowQRCustomization] = useState(false);
  const [qrImageDataUrl, setQRImageDataUrl] = useState<string>("");
  const [qrCopied, setQRCopied] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<"PNG" | "SVG" | "PDF">("PNG");

  // Regex Tester state
  const [showRegexTester, setShowRegexTester] = useState(false);
  const [regexPattern, setRegexPattern] = useState("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
  const [regexTestText, setRegexTestText] = useState("Contact us at support@example.com or sales@company.org for assistance.");
  const [regexReplacement, setRegexReplacement] = useState("[EMAIL REDACTED]");
  const [regexFlags, setRegexFlags] = useState({ g: true, i: true, m: false, s: false });
  const [regexActiveTab, setRegexActiveTab] = useState<"matches" | "groups" | "replace">("matches");
  const [regexCopiedItem, setRegexCopiedItem] = useState<string | null>(null);

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
          const formats = convertHexToFormats(color);
          setPickedColor(formats);
          setCopiedFormat(null);
          setShowColorPicker(true);
          setQuery("");
          await invoke("set_auto_hide", { enabled: true });
          await invoke("show_window");
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
        await invoke("set_auto_hide", { enabled: true });
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
        await invoke("set_auto_hide", { enabled: true });
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
      id: "qr-generator",
      name: "QR Code Generator",
      description: "Generate QR codes for URLs, WiFi, contacts, and more",
      icon: QrCode,
      keywords: ["qr", "qrcode", "barcode", "url", "wifi", "vcard", "contact", "link", "scan"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowQRGenerator(true);
        setQRType("url");
        setQRData({ ...DEFAULT_QR_DATA });
        setQRForegroundColor("#000000");
        setQRBackgroundColor("#FFFFFF");
        setShowQRCustomization(false);
        setQRImageDataUrl("");
        setQRCopied(false);
        setSelectedExportFormat("PNG");
        setQuery("");
      },
    },
    {
      id: "regex-tester",
      name: "Regex Tester",
      description: "Test and debug regular expressions instantly",
      icon: Braces,
      keywords: ["regex", "regexp", "regular", "expression", "pattern", "match", "replace", "test"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowRegexTester(true);
        setRegexPattern("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
        setRegexTestText("Contact us at support@example.com or sales@company.org for assistance.");
        setRegexReplacement("[EMAIL REDACTED]");
        setRegexFlags({ g: true, i: true, m: false, s: false });
        setRegexActiveTab("matches");
        setRegexCopiedItem(null);
        setQuery("");
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

  // Load settings on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const s = await invoke<Settings>("get_settings");
        setSettings(s);
        // Mark as initialized after a tick to avoid triggering auto-save
        setTimeout(() => {
          settingsInitialized.current = true;
        }, 0);
      } catch (e) {
        console.error("Failed to initialize:", e);
      }
    };
    initialize();
  }, []);

  // Auto-save settings when they change
  useEffect(() => {
    if (!settingsInitialized.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        await invoke("save_settings", { settings });
      } catch (e) {
        console.error("Failed to auto-save settings:", e);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [settings]);

  // Generate QR code when data changes
  useEffect(() => {
    if (!showQRGenerator) return;

    const generateQR = async () => {
      const content = generateQRContent(qrType, qrData);
      if (!content) {
        setQRImageDataUrl("");
        return;
      }

      try {
        const dataUrl = await QRCodeLib.toDataURL(content, {
          color: {
            dark: qrForegroundColor,
            light: qrBackgroundColor,
          },
          width: 300,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        setQRImageDataUrl(dataUrl);
      } catch (err) {
        console.error("QR generation error:", err);
        setQRImageDataUrl("");
      }
    };

    const timeoutId = setTimeout(generateQR, 100);
    return () => clearTimeout(timeoutId);
  }, [showQRGenerator, qrType, qrData, qrForegroundColor, qrBackgroundColor]);

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
      setLastCurrencyQuery("");
      setShowTranslation(false);
      setTranslationInput("");
      setTranslationOutput("");
      setDetectedLanguage("Detecting...");
      setTranslationError(null);
      setIsTranslationSettingsOpen(false);
      setShowColorPicker(false);
      setPickedColor(null);
      setCopiedFormat(null);
      setShowQRGenerator(false);
      setQRType("url");
      setQRData({ ...DEFAULT_QR_DATA });
      setQRForegroundColor("#000000");
      setQRBackgroundColor("#FFFFFF");
      setShowQRCustomization(false);
      setQRImageDataUrl("");
      setQRCopied(false);
      setShowRegexTester(false);
      setRegexPattern("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
      setRegexTestText("Contact us at support@example.com or sales@company.org for assistance.");
      setRegexReplacement("[EMAIL REDACTED]");
      setRegexFlags({ g: true, i: true, m: false, s: false });
      setRegexActiveTab("matches");
      setRegexCopiedItem(null);
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
      setQuickResult(null);
      setCurrencyResult(null);
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

      // Check for calculator result first
      const calcResult = evaluateExpression(query);
      if (calcResult) {
        setQuickResult({
          type: "calculator",
          query: query,
          result: calcResult,
          icon: Calculator,
          copyValue: calcResult.replace(/\./g, "").replace(/,/g, "."), // Convert from de-DE format to number
        });
        setCurrencyResult(null);
        return;
      }

      // Check for color conversion
      const colorResult = parseColorQuery(query);
      if (colorResult) {
        const hexColor = rgbToHex(colorResult.rgb.r, colorResult.rgb.g, colorResult.rgb.b);
        setQuickResult({
          type: "color",
          query: colorResult.displayQuery,
          result: colorResult.result,
          icon: Palette,
          copyValue: colorResult.result,
          colorPreview: hexColor,
        });
        setCurrencyResult(null);
        return;
      }

      // Check for unit conversion
      const unitResult = parseUnitQuery(query);
      if (unitResult) {
        const formattedResult = unitResult.result.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3,
        });
        setQuickResult({
          type: "unit",
          query: query,
          result: `${formattedResult} ${unitResult.toUnit}`,
          icon: Ruler,
          copyValue: unitResult.result.toString(),
        });
        setCurrencyResult(null);
        return;
      }

      // Check for currency query
      const currencyQuery = parseCurrencyQuery(query);
      if (currencyQuery && query !== lastCurrencyQuery) {
        setLastCurrencyQuery(query);
        setCurrencyLoading(true);
        setQuickResult(null);
        invoke<CurrencyResult>("convert_currency", {
          amount: currencyQuery.amount,
          from: currencyQuery.from,
          to: currencyQuery.to,
        })
          .then((result) => {
            setCurrencyResult(result);
            setCurrencyLoading(false);
            // Set quick result for currency
            const formattedResult = result.result.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            setQuickResult({
              type: "currency",
              query: query,
              result: `${formattedResult} ${result.to}`,
              icon: DollarSign,
              copyValue: result.result.toFixed(2),
            });
          })
          .catch(() => {
            setCurrencyResult(null);
            setCurrencyLoading(false);
            setQuickResult(null);
          });
      } else if (currencyQuery && currencyResult) {
        // Keep existing currency quick result
        const formattedResult = currencyResult.result.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setQuickResult({
          type: "currency",
          query: query,
          result: `${formattedResult} ${currencyResult.to}`,
          icon: DollarSign,
          copyValue: currencyResult.result.toFixed(2),
        });
      } else if (!currencyQuery) {
        setCurrencyResult(null);

        // No exact match found - check for partial queries and show preview
        // Check for partial unit query (e.g., "10 fahr" → "10 fahrenheit to celsius")
        const partialUnit = parsePartialUnitQuery(query);
        if (partialUnit) {
          // Compute the result for the suggested query
          const suggestedResult = parseUnitQuery(partialUnit.suggestedQuery);
          if (suggestedResult) {
            const formattedResult = suggestedResult.result.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 3,
            });
            setQuickResult({
              type: "unit",
              query: partialUnit.suggestedQuery,
              result: `${formattedResult} ${suggestedResult.toUnit}`,
              icon: Ruler,
              copyValue: suggestedResult.result.toString(),
              isPreview: true,
            });
            return;
          }
        }

        // Check for partial currency query (e.g., "10 yen" → "10 yen to usd")
        const partialCurrency = parsePartialCurrencyQuery(query);
        if (partialCurrency) {
          // Show loading state for currency preview
          setCurrencyLoading(true);
          invoke<CurrencyResult>("convert_currency", {
            amount: partialCurrency.amount,
            from: partialCurrency.from,
            to: partialCurrency.to,
          })
            .then((result) => {
              setCurrencyLoading(false);
              const formattedResult = result.result.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              setQuickResult({
                type: "currency",
                query: partialCurrency.suggestedQuery,
                result: `${formattedResult} ${result.to}`,
                icon: DollarSign,
                copyValue: result.result.toFixed(2),
                isPreview: true,
              });
            })
            .catch(() => {
              setCurrencyLoading(false);
              setQuickResult(null);
            });
          return;
        }

        setQuickResult(null);
      }
    }
  }, [query]);

  // Scroll selected tool into view when navigating with arrow keys
  useEffect(() => {
    const selectedElement = toolItemRefs.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Resize window based on active view
  useEffect(() => {
    const resizeWindow = async () => {
      const appWindow = getCurrentWindow();
      let height = 500; // Default height for command palette
      let width = 680; // Default width

      if (showConverter) {
        height = 450;
      } else if (showPortKiller) {
        height = 450;
      } else if (showTranslation) {
        height = isTranslationSettingsOpen ? 480 : 400;
      } else if (showSettings) {
        height = 460;
      } else if (showColorPicker) {
        height = 600;
        width = 880;
      } else if (showQRGenerator) {
        height = showQRCustomization ? 800 : 600;
        width = showQRCustomization ? 1000 : 800;
      } else if (showRegexTester) {
        height = 590;
        width = 1000;
      }

      await appWindow.setSize(new LogicalSize(width, height));
    };
    resizeWindow();
  }, [showSettings, showConverter, showPortKiller, showTranslation, isTranslationSettingsOpen, showColorPicker, showQRGenerator, showQRCustomization, showRegexTester]);

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
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
      } else if (showPortKiller) {
        setShowPortKiller(false);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
      } else if (showTranslation) {
        setShowTranslation(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else if (showQRGenerator) {
        setShowQRGenerator(false);
      } else if (showRegexTester) {
        setShowRegexTester(false);
      } else {
        invoke("hide_window");
        setQuery("");
      }
    } else if (!showSettings && !showConverter && !showPortKiller && !showTranslation && !showQRGenerator && !showRegexTester) {
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
    e.stopPropagation();

    if (e.key === "Escape") {
      setIsRecordingHotkey(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    // Use e.code for reliable key detection (works better with Alt combinations)
    const code = e.code;
    let mappedKey = "";

    // Handle letter keys (KeyA, KeyB, etc.)
    if (code.startsWith("Key")) {
      mappedKey = code.substring(3); // "KeyQ" -> "Q"
    }
    // Handle digit keys (Digit0, Digit1, etc.)
    else if (code.startsWith("Digit")) {
      mappedKey = code.substring(5); // "Digit1" -> "1"
    }
    // Handle numpad keys
    else if (code.startsWith("Numpad") && code.length > 6) {
      const numpadPart = code.substring(6);
      if (/^\d$/.test(numpadPart)) {
        mappedKey = "Num" + numpadPart;
      } else {
        mappedKey = "Num" + numpadPart;
      }
    }
    // Handle function keys
    else if (/^F\d{1,2}$/.test(code)) {
      mappedKey = code;
    }
    // Handle special keys
    else {
      const specialKeys: Record<string, string> = {
        Space: "Space",
        Enter: "Enter",
        Tab: "Tab",
        Backspace: "Backspace",
        Delete: "Delete",
        Insert: "Insert",
        Home: "Home",
        End: "End",
        PageUp: "PageUp",
        PageDown: "PageDown",
        ArrowUp: "Up",
        ArrowDown: "Down",
        ArrowLeft: "Left",
        ArrowRight: "Right",
        Backquote: "`",
        Minus: "-",
        Equal: "=",
        BracketLeft: "[",
        BracketRight: "]",
        Backslash: "\\",
        Semicolon: ";",
        Quote: "'",
        Comma: ",",
        Period: ".",
        Slash: "/",
      };
      mappedKey = specialKeys[code] || "";
    }

    // Skip if only modifiers were pressed or no valid key
    if (!mappedKey || ["ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "MetaLeft", "MetaRight"].includes(code)) {
      return;
    }

    // Require at least one modifier for non-function keys
    const isFunctionKey = /^F\d{1,2}$/.test(mappedKey);
    if (modifiers.length > 0 || isFunctionKey) {
      setSettings((prev) => ({
        ...prev,
        hotkey_modifiers: modifiers,
        hotkey_key: mappedKey,
      }));
      setIsRecordingHotkey(false);
    }
  };

  // Handle mouse buttons for hotkey recording (side buttons)
  const handleHotkeyMouseDown = (e: React.MouseEvent) => {
    // Only handle extra buttons (side buttons are typically 3 and 4)
    if (e.button < 3) return;

    e.preventDefault();
    e.stopPropagation();

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    // Map mouse buttons to names
    const mouseButtonNames: Record<number, string> = {
      3: "Mouse4", // Back button
      4: "Mouse5", // Forward button
    };

    const buttonName = mouseButtonNames[e.button];
    if (buttonName) {
      setSettings((prev) => ({
        ...prev,
        hotkey_modifiers: modifiers,
        hotkey_key: buttonName,
      }));
      setIsRecordingHotkey(false);
    }
  };

  // Global escape key handler for panels without input focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) {
          setShowSettings(false);
        }
      }
    };

    if (showSettings) {
      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [showSettings]);

  // Color picker escape key and blur handler
  useEffect(() => {
    if (!showColorPicker) return;

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowColorPicker(false);
        setPickedColor(null);
        setCopiedFormat(null);
        await invoke("hide_window");
      }
    };

    const handleBlur = () => {
      // Only reset state if not dragging (dragging causes temporary blur)
      if (!isDraggingRef.current) {
        setShowColorPicker(false);
        setPickedColor(null);
        setCopiedFormat(null);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [showColorPicker]);

  // Omni Converter blur handler (prevents flickering on reopen)
  useEffect(() => {
    if (!showConverter) return;

    const handleBlur = () => {
      if (!isDraggingRef.current) {
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showConverter]);

  // Port Killer blur handler (prevents flickering on reopen)
  useEffect(() => {
    if (!showPortKiller) return;

    const handleBlur = () => {
      if (!isDraggingRef.current) {
        setShowPortKiller(false);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showPortKiller]);

  // Regex Tester blur handler (prevents flickering on reopen)
  useEffect(() => {
    if (!showRegexTester) return;

    const handleBlur = () => {
      if (!isDraggingRef.current) {
        setShowRegexTester(false);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showRegexTester]);

  // Command palette blur handler (hides window on blur)
  useEffect(() => {
    // Only handle blur when command palette is visible (no other panel is open)
    const isCommandPaletteVisible = !showConverter && !showPortKiller && !showTranslation && !showSettings && !showColorPicker && !showQRGenerator && !showRegexTester;
    if (!isCommandPaletteVisible) return;

    const handleBlur = async () => {
      if (!isDraggingRef.current) {
        await invoke("hide_window");
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showConverter, showPortKiller, showTranslation, showSettings, showColorPicker, showQRGenerator, showRegexTester]);

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
    isDraggingRef.current = true;
    await invoke("set_dragging", { dragging: true });

    try {
      await getCurrentWindow().startDragging();
    } finally {
      // Clear dragging flag after drag ends
      isDraggingRef.current = false;
      await invoke("set_dragging", { dragging: false });
    }
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
    <div className="p-2 select-none" spellCheck={false}>
      {/* Command Palette - Hidden when tools are open */}
      {!showConverter && !showPortKiller && !showTranslation && !showSettings && !showColorPicker && !showQRGenerator && !showRegexTester && (
        <CommandPalette
          query={query}
          setQuery={setQuery}
          filteredTools={filteredTools}
          selectedIndex={selectedIndex}
          status={status}
          setStatus={setStatus}
          quickResult={quickResult}
          currencyLoading={currencyLoading}
          onToolExecute={executeTool}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          toolItemRefs={toolItemRefs}
          onDragStart={handleDragStart}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
          isRecordingHotkey={isRecordingHotkey}
          setIsRecordingHotkey={setIsRecordingHotkey}
          hotkeyInputRef={hotkeyInputRef}
          onHotkeyKeyDown={handleHotkeyKeyDown}
          onHotkeyMouseDown={handleHotkeyMouseDown}
          onDragStart={handleDragStart}
        />
      )}

      {/* Converter Panel */}
      {showConverter && (
        <OmniConverter
          converterType={converterType}
          setConverterType={setConverterType}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          targetFormat={targetFormat}
          setTargetFormat={setTargetFormat}
          isConverting={isConverting}
          conversionProgress={conversionProgress}
          conversionStatus={conversionStatus}
          onSelectFile={handleSelectFile}
          onConvert={handleConvert}
          onDragStart={handleDragStart}
        />
      )}

      {/* Port Killer Panel */}
      {showPortKiller && (
        <PortKiller
          portInput={portInput}
          setPortInput={setPortInput}
          portProcesses={portProcesses}
          isScanning={isScanning}
          scannedPort={scannedPort}
          onScanPort={handleScanPort}
          onKillProcess={handleKillProcess}
          onDragStart={handleDragStart}
        />
      )}

      {/* Quick Translation Panel */}
      {showTranslation && (
        <QuickTranslation
          translationInput={translationInput}
          translationOutput={translationOutput}
          detectedLanguage={detectedLanguage}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          isTranslating={isTranslating}
          translationError={translationError}
          isSettingsOpen={isTranslationSettingsOpen}
          setIsSettingsOpen={setIsTranslationSettingsOpen}
          onDragStart={handleDragStart}
        />
      )}

      {/* Color Picker Details Panel */}
      {showColorPicker && pickedColor && (
        <ColorPickerPanel
          pickedColor={pickedColor}
          copiedFormat={copiedFormat}
          setCopiedFormat={setCopiedFormat}
          onDragStart={handleDragStart}
        />
      )}

      {/* QR Code Generator Panel */}
      {showQRGenerator && (
        <QRGenerator
          qrType={qrType}
          setQRType={setQRType}
          qrData={qrData}
          setQRData={setQRData}
          qrForegroundColor={qrForegroundColor}
          setQRForegroundColor={setQRForegroundColor}
          qrBackgroundColor={qrBackgroundColor}
          setQRBackgroundColor={setQRBackgroundColor}
          showCustomization={showQRCustomization}
          setShowCustomization={setShowQRCustomization}
          qrImageDataUrl={qrImageDataUrl}
          qrCopied={qrCopied}
          setQRCopied={setQRCopied}
          selectedExportFormat={selectedExportFormat}
          setSelectedExportFormat={setSelectedExportFormat}
          onDragStart={handleDragStart}
        />
      )}

      {/* Regex Tester Panel */}
      {showRegexTester && (
        <RegexTester
          pattern={regexPattern}
          setPattern={setRegexPattern}
          testText={regexTestText}
          setTestText={setRegexTestText}
          replacement={regexReplacement}
          setReplacement={setRegexReplacement}
          flags={regexFlags}
          setFlags={setRegexFlags}
          activeTab={regexActiveTab}
          setActiveTab={setRegexActiveTab}
          copiedItem={regexCopiedItem}
          setCopiedItem={setRegexCopiedItem}
          onDragStart={handleDragStart}
        />
      )}
    </div>
  );
}

export default App;
