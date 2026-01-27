import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { open, save } from "@tauri-apps/plugin-dialog";
import { downloadDir } from "@tauri-apps/api/path";
import { useWindowAutoSize } from "./hooks";
import {
  Pipette,
  Video,
  Network,
  Languages,
  Settings as SettingsIcon,
  DollarSign,
  Calculator,
  Ruler,
  QrCode,
  Braces,
  Palette,
  GitBranch,
  Youtube,
} from "lucide-react";
import QRCodeLib from "qrcode";

// Import types
import type {
  Tool,
  Settings,
  VideoFileMetadata,
  VideoAdvancedSettings,
  PortProcess,
  CurrencyResult,
  TranslationResult,
  QRCodeType,
  QRCodeData,
  ColorFormats,
  QuickResult,
  GitHubUrlInfo,
  GitDownloadOptions,
  GitDownloadProgress,
  GitDownloadResult,
  YouTubeVideoInfo,
  YouTubeDownloadOptions,
  YouTubeDownloadProgress,
  YouTubeUrlInfo,
} from "./types";

// Import constants
import { VIDEO_FILE_FILTERS, VIDEO_QUALITY_PRESETS, DEFAULT_QR_DATA } from "./constants";

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
  parseGitHubUrl,
  parseYouTubeUrl,
} from "./utils";

// Import components
import {
  CommandPalette,
  SettingsPanel,
  VideoConverter,
  PortKiller,
  QuickTranslation,
  ColorPickerPanel,
  QRGenerator,
  RegexTester,
  GitDownloader,
  YouTubeDownloader,
} from "./components";
import type { CommandStatus } from "./components/CommandPalette";

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
    command_only_mode: false,
    quick_translation_hotkey_modifiers: ["Ctrl", "Alt"],
    quick_translation_hotkey_key: "",
    quick_translation_target_language: "en",
  });
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [isRecordingQuickTranslationHotkey, setIsRecordingQuickTranslationHotkey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hotkeyInputRef = useRef<HTMLDivElement>(null);
  const quickTranslationHotkeyInputRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isDialogOpenRef = useRef(false);
  const settingsInitialized = useRef(false);
  const toolItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gitDownloadingRef = useRef(false);

  // Video Converter state
  const [showVideoConverter, setShowVideoConverter] = useState(false);
  const [videoFile, setVideoFile] = useState<VideoFileMetadata | null>(null);
  const [videoFormat, setVideoFormat] = useState<string>("mp4");
  const [videoQuality, setVideoQuality] = useState<string>("high");
  const [videoAdvancedSettings, setVideoAdvancedSettings] = useState<VideoAdvancedSettings>({
    resolution: "Keep Original",
    frameRate: "Keep Original",
    codec: "H.264",
    keepAudio: true,
  });
  const [showVideoAdvanced, setShowVideoAdvanced] = useState(false);
  const [videoConverting, setVideoConverting] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoConversionStatus, setVideoConversionStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');

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
  const [regexPattern, setRegexPattern] = useState("");
  const [regexTestText, setRegexTestText] = useState("");
  const [regexReplacement, setRegexReplacement] = useState("");
  const [regexFlags, setRegexFlags] = useState({ g: true, i: true, m: false, s: false });
  const [regexActiveTab, setRegexActiveTab] = useState<"matches" | "groups" | "replace">("matches");
  const [regexCopiedItem, setRegexCopiedItem] = useState<string | null>(null);

  // Git Downloader state
  const [showGitDownloader, setShowGitDownloader] = useState(false);
  const [gitUrlInput, setGitUrlInput] = useState("");
  const [gitParsedUrl, setGitParsedUrl] = useState<GitHubUrlInfo | null>(null);
  const [gitDownloadPath, setGitDownloadPath] = useState("");
  const [gitDownloadOptions, setGitDownloadOptions] = useState<GitDownloadOptions>({
    extractFiles: true,
    flattenStructure: false,
    createSubfolder: true,
  });
  const [gitProgress, setGitProgress] = useState<GitDownloadProgress>({
    stage: 'idle',
    percent: 0,
    message: '',
  });

  // YouTube Downloader state
  const [showYouTubeDownloader, setShowYouTubeDownloader] = useState(false);
  const [ytUrlInput, setYtUrlInput] = useState("");
  const [ytParsedUrl, setYtParsedUrl] = useState<YouTubeUrlInfo | null>(null);
  const [ytVideoInfo, setYtVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [ytDownloadPath, setYtDownloadPath] = useState("");
  const [ytDownloadOptions, setYtDownloadOptions] = useState<YouTubeDownloadOptions>({
    quality: 'best',
    mode: 'video_audio',
  });
  const [ytProgress, setYtProgress] = useState<YouTubeDownloadProgress>({
    stage: 'idle',
    percent: 0,
    message: '',
  });
  const [ytValidationError, setYtValidationError] = useState<string | null>(null);

  // Command-only mode state
  const [commandStatus, setCommandStatus] = useState<CommandStatus>({
    message: "Type a command...",
    type: 'idle',
  });
  const commandStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      id: "video-converter",
      name: "Video Converter",
      description: "Convert videos with quality presets",
      icon: Video,
      keywords: ["video", "convert", "converter", "mp4", "webm", "mov", "avi", "mkv", "gif"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowVideoConverter(true);
        setVideoFile(null);
        setVideoFormat("mp4");
        setVideoQuality("high");
        setVideoAdvancedSettings({
          resolution: "Keep Original",
          frameRate: "Keep Original",
          codec: "H.264",
          keepAudio: true,
        });
        setShowVideoAdvanced(false);
        setVideoConverting(false);
        setVideoProgress(0);
        setVideoConversionStatus('idle');
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
      description: "Translate text between languages",
      icon: Languages,
      keywords: ["translate", "translation", "language", "japanese", "english", "spanish", "french", "german", "chinese", "korean"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setQuery("");
        // Reset translation state
        setTranslationInput("");
        setTranslationOutput("");
        setDetectedLanguage("");
        setTranslationError(null);
        setIsTranslating(false);
        // Just show the translation window for manual input
        setShowTranslation(true);
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
        setQuery("");
      },
    },
    {
      id: "git-downloader",
      name: "Git Downloader",
      description: "Download folders from GitHub repositories",
      icon: GitBranch,
      keywords: ["git", "github", "download", "folder", "repo", "repository", "clone", "subdirectory", "sparse", "partial"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowGitDownloader(true);
        setGitUrlInput("");
        setGitParsedUrl(null);
        setGitDownloadPath("");
        setGitDownloadOptions({
          extractFiles: true,
          flattenStructure: false,
          createSubfolder: true,
        });
        setGitProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
        setQuery("");
      },
    },
    {
      id: "youtube-downloader",
      name: "YouTube Downloader",
      description: "Download videos from YouTube",
      icon: Youtube,
      keywords: ["youtube", "video", "download", "yt", "music", "audio", "stream", "mp3", "mp4"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowYouTubeDownloader(true);
        setYtUrlInput("");
        setYtParsedUrl(null);
        setYtVideoInfo(null);
        // Set default download path to Downloads folder
        try {
          const defaultPath = await downloadDir();
          setYtDownloadPath(defaultPath);
        } catch {
          setYtDownloadPath("");
        }
        setYtDownloadOptions({
          quality: 'best',
          mode: 'video_audio',
        });
        setYtProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
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

  // Load settings on mount and mark app as ready
  useEffect(() => {
    const initialize = async () => {
      try {
        const s = await invoke<Settings>("get_settings");
        setSettings(s);
        // Mark as initialized after a tick to avoid triggering auto-save
        setTimeout(() => {
          settingsInitialized.current = true;
        }, 0);
        // Signal to backend that the app is fully loaded and ready
        await invoke("mark_app_ready");
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

  // Debounced translation when input changes (for manual typing)
  useEffect(() => {
    if (!showTranslation || !translationInput.trim()) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsTranslating(true);
      setTranslationError(null);
      try {
        const result = await invoke<TranslationResult>("translate_text", {
          text: translationInput,
          targetLang: targetLanguage,
        });
        setTranslationOutput(result.translated_text);
        setDetectedLanguage(result.detected_language);
      } catch (err) {
        setTranslationError(String(err));
      } finally {
        setIsTranslating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [translationInput, targetLanguage, showTranslation]);

  // Listen for conversion progress events
  useEffect(() => {
    const unlisten = listen<number>("conversion-progress", (event) => {
      setVideoProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for git download progress events
  useEffect(() => {
    const unlisten = listen<GitDownloadProgress>("git-download-progress", (event) => {
      setGitProgress(event.payload);
      // Also update command status if in command-only mode and downloading
      if (settings.command_only_mode && event.payload.stage === 'downloading') {
        setCommandStatus({
          message: `Downloading... ${event.payload.percent}%`,
          type: 'progress',
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [settings.command_only_mode]);

  // Listen for YouTube download progress events
  useEffect(() => {
    const unlisten = listen<YouTubeDownloadProgress>("youtube-download-progress", (event) => {
      setYtProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Keep ref in sync with git download status
  useEffect(() => {
    gitDownloadingRef.current = gitProgress.stage === 'fetching' ||
                                gitProgress.stage === 'downloading' ||
                                gitProgress.stage === 'extracting';
  }, [gitProgress.stage]);

  useEffect(() => {
    const unlisten = listen("focus-search", async () => {
      await invoke("set_auto_hide", { enabled: true });
      setQuery("");
      setSelectedIndex(0);
      setStatus(null);
      setShowSettings(false);
      setShowVideoConverter(false);
      setVideoFile(null);
      setVideoFormat("mp4");
      setVideoQuality("high");
      setVideoAdvancedSettings({
        resolution: "Keep Original",
        frameRate: "Keep Original",
        codec: "H.264",
        keepAudio: true,
      });
      setShowVideoAdvanced(false);
      setVideoConverting(false);
      setVideoProgress(0);
      setVideoConversionStatus('idle');
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
      // Only reset Git Downloader if not actively downloading
      if (!gitDownloadingRef.current) {
        setShowGitDownloader(false);
        setGitUrlInput("");
        setGitParsedUrl(null);
        setGitDownloadPath("");
        setGitDownloadOptions({
          extractFiles: true,
          flattenStructure: false,
          createSubfolder: true,
        });
        setGitProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
      }
      // Always close YouTube Downloader panel, but don't reset state if downloading
      // (download continues in background, user returns to command palette)
      setShowYouTubeDownloader(false);
      inputRef.current?.focus();
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for quick translation hotkey trigger
  useEffect(() => {
    const unlisten = listen("trigger-quick-translation", async () => {
      // Reset translation state
      setTranslationInput("");
      setTranslationOutput("");
      setDetectedLanguage("Detecting...");
      setTranslationError(null);
      setIsTranslating(false);
      // Close any open panels first
      setShowSettings(false);
      setShowVideoConverter(false);
      setShowPortKiller(false);
      setShowColorPicker(false);
      setShowQRGenerator(false);
      setShowRegexTester(false);
      setShowGitDownloader(false);

      try {
        // Start text selection mode using the app handle version (works from hotkey context)
        await invoke("start_text_selection_from_hotkey");

        // Read the copied text from clipboard
        const clipboardText = await readText();

        if (clipboardText && clipboardText.trim()) {
          setTranslationInput(clipboardText);
          setShowTranslation(true);

          // Start translation immediately using the saved target language
          setIsTranslating(true);
          try {
            const result = await invoke<TranslationResult>("translate_text", {
              text: clipboardText,
              targetLang: settings.quick_translation_target_language,
            });
            setTranslationOutput(result.translated_text);
            setDetectedLanguage(result.detected_language);
            setTargetLanguage(settings.quick_translation_target_language);
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
          setTargetLanguage(settings.quick_translation_target_language);
        }
      } catch (e) {
        // User cancelled (pressed Escape), don't show translation window
        if (e !== "Cancelled") {
          console.error("Text selection error:", e);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [settings.quick_translation_target_language]);

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

  // Window size configuration based on active view
  // In command only mode, window always stays compact (no tool list shown)
  const isCommandOnlyCollapsed = settings.command_only_mode;
  const windowSizeConfig = useMemo(() => {
    if (showVideoConverter) {
      return { width: 900, minHeight: 400, maxHeight: 900 };
    } else if (showPortKiller) {
      return { width: 680, minHeight: 300, maxHeight: 600 };
    } else if (showTranslation) {
      return { width: 680, minHeight: 300, maxHeight: 600 };
    } else if (showSettings) {
      return { width: 680, minHeight: 200, maxHeight: 550 };
    } else if (showColorPicker) {
      return { width: 880, minHeight: 400, maxHeight: 700 };
    } else if (showQRGenerator) {
      return { width: showQRCustomization ? 1000 : 800, minHeight: 400, maxHeight: 700 };
    } else if (showRegexTester) {
      return { width: 1000, minHeight: 400, maxHeight: 700 };
    } else if (showGitDownloader) {
      return { width: 720, minHeight: 350, maxHeight: 720 };
    } else if (showYouTubeDownloader) {
      return { width: 720, minHeight: 400, maxHeight: 800 };
    }
    // Command palette - use smaller height in command only mode when collapsed
    if (isCommandOnlyCollapsed) {
      return { width: 680, minHeight: 62, maxHeight: 70 };
    }
    return { width: 680, minHeight: 200, maxHeight: 550 };
  }, [showVideoConverter, showPortKiller, showTranslation, showSettings, showColorPicker, showQRGenerator, showQRCustomization, showRegexTester, showGitDownloader, showYouTubeDownloader, isCommandOnlyCollapsed]);

  // Auto-resize window based on content
  const { contentRef } = useWindowAutoSize<HTMLDivElement>({
    config: windowSizeConfig,
    enabled: true,
  });

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
    // Escape is handled by the global handler
    if (e.key === "Escape") return;

    // Handle navigation only in command palette mode
    if (!showSettings && !showVideoConverter && !showPortKiller && !showTranslation && !showQRGenerator && !showRegexTester && !showGitDownloader && !showYouTubeDownloader) {
      // Command-only mode: execute command on Enter
      if (settings.command_only_mode) {
        if (e.key === "Enter" && query.trim()) {
          e.preventDefault();
          const commandToExecute = query;
          setQuery(""); // Clear input immediately
          await executeCommand(commandToExecute);
        }
        return;
      }

      // Normal mode: tool navigation
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

  // Quick Translation hotkey recording handler
  const handleQuickTranslationHotkeyKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setIsRecordingQuickTranslationHotkey(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    const code = e.code;
    let mappedKey = "";

    if (code.startsWith("Key")) {
      mappedKey = code.substring(3);
    } else if (code.startsWith("Digit")) {
      mappedKey = code.substring(5);
    } else if (code.startsWith("Numpad") && code.length > 6) {
      const numpadPart = code.substring(6);
      if (/^\d$/.test(numpadPart)) {
        mappedKey = "Num" + numpadPart;
      } else {
        mappedKey = "Num" + numpadPart;
      }
    } else if (/^F\d{1,2}$/.test(code)) {
      mappedKey = code;
    } else {
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

    if (!mappedKey || ["ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "MetaLeft", "MetaRight"].includes(code)) {
      return;
    }

    const isFunctionKey = /^F\d{1,2}$/.test(mappedKey);
    if (modifiers.length > 0 || isFunctionKey) {
      setSettings((prev) => ({
        ...prev,
        quick_translation_hotkey_modifiers: modifiers,
        quick_translation_hotkey_key: mappedKey,
      }));
      setIsRecordingQuickTranslationHotkey(false);
    }
  };

  // Quick Translation hotkey mouse button handler
  const handleQuickTranslationHotkeyMouseDown = (e: React.MouseEvent) => {
    if (e.button < 3) return;

    e.preventDefault();
    e.stopPropagation();

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    const mouseButtonNames: Record<number, string> = {
      3: "Mouse4",
      4: "Mouse5",
    };

    const buttonName = mouseButtonNames[e.button];
    if (buttonName) {
      setSettings((prev) => ({
        ...prev,
        quick_translation_hotkey_modifiers: modifiers,
        quick_translation_hotkey_key: buttonName,
      }));
      setIsRecordingQuickTranslationHotkey(false);
    }
  };

  // Universal Escape key handler - works from any state
  useEffect(() => {
    const handleGlobalEscape = async (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Don't handle if we're recording a hotkey (Escape cancels recording)
      if (isRecordingHotkey) {
        setIsRecordingHotkey(false);
        return;
      }
      if (isRecordingQuickTranslationHotkey) {
        setIsRecordingQuickTranslationHotkey(false);
        return;
      }

      // Close panels in order of priority (most specific first)
      if (showVideoConverter) {
        setShowVideoConverter(false);
        setVideoFile(null);
        setVideoFormat("mp4");
        setVideoQuality("high");
        setVideoAdvancedSettings({
          resolution: "Keep Original",
          frameRate: "Keep Original",
          codec: "H.264",
          keepAudio: true,
        });
        setShowVideoAdvanced(false);
        setVideoConverting(false);
        setVideoProgress(0);
        setVideoConversionStatus('idle');
      } else if (showPortKiller) {
        setShowPortKiller(false);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
      } else if (showTranslation) {
        setShowTranslation(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else if (showColorPicker) {
        setShowColorPicker(false);
        setPickedColor(null);
        setCopiedFormat(null);
      } else if (showQRGenerator) {
        setShowQRGenerator(false);
      } else if (showRegexTester) {
        setShowRegexTester(false);
      } else if (showGitDownloader) {
        // Don't reset if download is actively in progress
        const isDownloading = gitProgress.stage === 'fetching' ||
                             gitProgress.stage === 'downloading' ||
                             gitProgress.stage === 'extracting';
        if (!isDownloading) {
          setShowGitDownloader(false);
          setGitUrlInput("");
          setGitParsedUrl(null);
          setGitDownloadPath("");
          setGitDownloadOptions({
            extractFiles: true,
            flattenStructure: false,
            createSubfolder: true,
          });
          setGitProgress({
            stage: 'idle',
            percent: 0,
            message: '',
          });
        }
      } else if (showYouTubeDownloader) {
        const isDownloading = ytProgress.stage === 'downloading';
        // Always close the panel
        setShowYouTubeDownloader(false);
        // Only reset state if not downloading (download continues in background)
        if (!isDownloading) {
          setYtUrlInput("");
          setYtParsedUrl(null);
          setYtVideoInfo(null);
          setYtDownloadPath("");
          setYtDownloadOptions({
            quality: 'best',
            mode: 'video_audio',
          });
          setYtProgress({
            stage: 'idle',
            percent: 0,
            message: '',
          });
        }
      } else {
        // No panel open - hide the window
        await invoke("hide_window");
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [showVideoConverter, showPortKiller, showTranslation, showSettings, showColorPicker, showQRGenerator, showRegexTester, showGitDownloader, showYouTubeDownloader, gitProgress.stage, ytProgress.stage, isRecordingHotkey, isRecordingQuickTranslationHotkey]);

  // Color picker blur handler
  useEffect(() => {
    if (!showColorPicker) return;

    const handleBlur = () => {
      // Only reset state if not dragging (dragging causes temporary blur)
      if (!isDraggingRef.current) {
        setShowColorPicker(false);
        setPickedColor(null);
        setCopiedFormat(null);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showColorPicker]);

  // Video Converter blur handler (prevents flickering on reopen)
  useEffect(() => {
    if (!showVideoConverter) return;

    const handleBlur = () => {
      if (!isDraggingRef.current && !isDialogOpenRef.current) {
        setShowVideoConverter(false);
        setVideoFile(null);
        setVideoFormat("mp4");
        setVideoQuality("high");
        setVideoAdvancedSettings({
          resolution: "Keep Original",
          frameRate: "Keep Original",
          codec: "H.264",
          keepAudio: true,
        });
        setShowVideoAdvanced(false);
        setVideoConverting(false);
        setVideoProgress(0);
        setVideoConversionStatus('idle');
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showVideoConverter]);

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

  // Git Downloader blur handler
  // Don't reset if download is in progress - keep state so user can return to see progress
  useEffect(() => {
    if (!showGitDownloader) return;

    const handleBlur = () => {
      // Don't reset if download is actively in progress
      const isDownloading = gitProgress.stage === 'fetching' ||
                           gitProgress.stage === 'downloading' ||
                           gitProgress.stage === 'extracting';

      if (!isDraggingRef.current && !isDialogOpenRef.current && !isDownloading) {
        setShowGitDownloader(false);
        setGitUrlInput("");
        setGitParsedUrl(null);
        setGitDownloadPath("");
        setGitDownloadOptions({
          extractFiles: true,
          flattenStructure: false,
          createSubfolder: true,
        });
        setGitProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showGitDownloader, gitProgress.stage]);

  // YouTube Downloader blur handler
  // Close panel on blur, but preserve state if download is in progress
  useEffect(() => {
    if (!showYouTubeDownloader) return;

    const handleBlur = () => {
      if (isDraggingRef.current || isDialogOpenRef.current) return;

      const isDownloading = ytProgress.stage === 'downloading';

      // Always close the panel
      setShowYouTubeDownloader(false);

      // Only reset state if not downloading (download continues in background)
      if (!isDownloading) {
        setYtUrlInput("");
        setYtParsedUrl(null);
        setYtVideoInfo(null);
        setYtDownloadPath("");
        setYtDownloadOptions({
          quality: 'best',
          mode: 'video_audio',
        });
        setYtProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showYouTubeDownloader, ytProgress.stage]);

  // Command palette blur handler (hides window on blur)
  useEffect(() => {
    // Only handle blur when command palette is visible (no other panel is open)
    const isCommandPaletteVisible = !showVideoConverter && !showPortKiller && !showTranslation && !showSettings && !showColorPicker && !showQRGenerator && !showRegexTester && !showGitDownloader && !showYouTubeDownloader;
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
  }, [showVideoConverter, showPortKiller, showTranslation, showSettings, showColorPicker, showQRGenerator, showRegexTester, showGitDownloader, showYouTubeDownloader]);

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

  // Handle video file selection via dialog
  const handleVideoSelectFile = async () => {
    // Mark dialog as open to prevent blur handler from closing
    isDialogOpenRef.current = true;
    await invoke("set_auto_hide", { enabled: false });

    const result = await open({
      filters: VIDEO_FILE_FILTERS,
      multiple: false,
    });

    // Re-enable after dialog closes
    await invoke("set_auto_hide", { enabled: true });
    isDialogOpenRef.current = false;

    if (result) {
      const path = result as string;
      const name = path.split(/[\\/]/).pop() || "";

      // Get video metadata from backend
      try {
        const metadata = await invoke<{
          duration: number;
          size: number;
          width: number;
          height: number;
          frame_rate: number;
          codec: string;
        }>("get_video_metadata", { path });

        setVideoFile({
          name,
          path,
          size: metadata.size,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          frameRate: metadata.frame_rate,
          codec: metadata.codec,
        });
      } catch (e) {
        console.error("Failed to get video metadata:", e);
        // Still allow selection with minimal info
        setVideoFile({
          name,
          path,
          size: 0,
          duration: 0,
          width: 0,
          height: 0,
          frameRate: 0,
          codec: "unknown",
        });
      }
    }
  };

  // Handle video conversion
  const handleVideoConvert = async () => {
    if (!videoFile) return;

    const ext = videoFormat.toLowerCase();
    const defaultName = videoFile.name.replace(/\.[^.]+$/, `.${ext}`);

    // Mark dialog as open to prevent blur handler from closing
    isDialogOpenRef.current = true;
    await invoke("set_auto_hide", { enabled: false });

    const outputPath = await save({
      defaultPath: defaultName,
      filters: [{ name: videoFormat.toUpperCase(), extensions: [ext] }],
    });

    // Re-enable after dialog closes
    await invoke("set_auto_hide", { enabled: true });
    isDialogOpenRef.current = false;

    if (!outputPath) return;

    setVideoConverting(true);
    setVideoProgress(0);
    setVideoConversionStatus('converting');

    // Get bitrate and resolution from selected quality preset
    const selectedPreset = VIDEO_QUALITY_PRESETS.find(p => p.id === videoQuality);
    const bitrate = selectedPreset?.bitrate || 0;

    // Use quality preset resolution if Advanced Settings is "Keep Original" and preset has a specific resolution
    let resolution = videoAdvancedSettings.resolution;
    if (resolution === "Keep Original" && selectedPreset && selectedPreset.resolution !== "original") {
      // Convert preset resolution format (e.g., "1920x1080" -> "1080p", "1280x720" -> "720p")
      const resolutionMap: Record<string, string> = {
        "3840x2160": "4K",
        "1920x1080": "1080p",
        "1280x720": "720p",
        "854x480": "480p",
      };
      resolution = resolutionMap[selectedPreset.resolution] || "Keep Original";
    }

    try {
      await invoke("convert_video", {
        inputPath: videoFile.path,
        outputPath,
        options: {
          resolution,
          frame_rate: videoAdvancedSettings.frameRate,
          codec: videoAdvancedSettings.codec,
          keep_audio: videoAdvancedSettings.keepAudio,
          bitrate,
        },
      });

      // Show success state
      setVideoConversionStatus('success');
      setVideoProgress(100);

      // Wait a moment to show success, then close
      setTimeout(async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowVideoConverter(false);
        setVideoFile(null);
        setVideoFormat("mp4");
        setVideoQuality("high");
        setVideoAdvancedSettings({
          resolution: "Keep Original",
          frameRate: "Keep Original",
          codec: "H.264",
          keepAudio: true,
        });
        setShowVideoAdvanced(false);
        setVideoConverting(false);
        setVideoConversionStatus('idle');
        setVideoProgress(0);
      }, 1500);
    } catch (e) {
      console.error("Video conversion error:", e);
      setVideoConversionStatus('error');
      setStatus(String(e));

      // Reset after showing error
      setTimeout(() => {
        setVideoConverting(false);
        setVideoConversionStatus('idle');
        setVideoProgress(0);
        setStatus(null);
      }, 4000);
    }
  };

  // Handle video converter reset
  const handleVideoReset = () => {
    setVideoFile(null);
    setVideoFormat("mp4");
    setVideoQuality("high");
    setVideoAdvancedSettings({
      resolution: "Keep Original",
      frameRate: "Keep Original",
      codec: "H.264",
      keepAudio: true,
    });
    setShowVideoAdvanced(false);
    setVideoConverting(false);
    setVideoProgress(0);
    setVideoConversionStatus('idle');
  };

  // Git Downloader handlers
  const handleGitUrlChange = (url: string) => {
    setGitUrlInput(url);
    const parsed = parseGitHubUrl(url);
    setGitParsedUrl(parsed);
  };

  const handleGitPaste = async () => {
    try {
      const clipboardText = await readText();
      if (clipboardText) {
        handleGitUrlChange(clipboardText);
      }
    } catch (e) {
      console.error("Failed to read clipboard:", e);
    }
  };

  const handleGitSelectFolder = async () => {
    isDialogOpenRef.current = true;
    await invoke("set_auto_hide", { enabled: false });

    const result = await open({
      directory: true,
      multiple: false,
    });

    await invoke("set_auto_hide", { enabled: true });
    isDialogOpenRef.current = false;

    if (result) {
      setGitDownloadPath(result as string);
    }
  };

  const handleGitDownload = async () => {
    if (!gitParsedUrl || !gitDownloadPath) return;

    setGitProgress({
      stage: 'fetching',
      percent: 0,
      message: 'Connecting to GitHub...',
    });

    try {
      const result = await invoke<GitDownloadResult>("download_github_folder", {
        urlInfo: {
          owner: gitParsedUrl.owner,
          repo: gitParsedUrl.repo,
          branch: gitParsedUrl.branch,
          path: gitParsedUrl.path,
        },
        outputPath: gitDownloadPath,
        options: {
          extract_files: gitDownloadOptions.extractFiles,
          flatten_structure: gitDownloadOptions.flattenStructure,
          create_subfolder: gitDownloadOptions.createSubfolder,
        },
      });

      setGitProgress({
        stage: 'complete',
        percent: 100,
        message: `Successfully downloaded ${result.files_count} files`,
        processedFiles: result.files_count,
        outputPath: result.output_path,
      });
    } catch (e) {
      setGitProgress({
        stage: 'error',
        percent: 0,
        message: '',
        errorMessage: String(e),
      });
    }
  };

  const handleGitOpenFolder = async () => {
    const path = gitProgress.outputPath || gitDownloadPath;
    if (path) {
      try {
        await invoke("open_folder_in_explorer", { path });
      } catch (e) {
        console.error("Failed to open folder:", e);
      }
    }
  };

  const handleGitReset = async () => {
    // Cancel any ongoing download
    try {
      await invoke("cancel_git_download");
    } catch (e) {
      // Ignore errors if no download in progress
    }

    setGitUrlInput("");
    setGitParsedUrl(null);
    setGitDownloadPath("");
    setGitDownloadOptions({
      extractFiles: true,
      flattenStructure: false,
      createSubfolder: true,
    });
    setGitProgress({
      stage: 'idle',
      percent: 0,
      message: '',
    });
  };

  // Command-only mode: Execute command from natural language input
  const executeCommand = async (input: string) => {
    // Clear any existing timeout
    if (commandStatusTimeoutRef.current) {
      clearTimeout(commandStatusTimeoutRef.current);
      commandStatusTimeoutRef.current = null;
    }

    // Parse "download <github-url>" command
    const downloadMatch = input.match(/^download\s+(https?:\/\/github\.com\/[^\s]+)/i);
    if (downloadMatch) {
      const url = downloadMatch[1];
      const parsed = parseGitHubUrl(url);

      if (!parsed || !parsed.isValid) {
        setCommandStatus({ message: "Invalid GitHub URL", type: 'error' });
        commandStatusTimeoutRef.current = setTimeout(() => {
          setCommandStatus({ message: "Type a command...", type: 'idle' });
        }, 1000);
        return;
      }

      // Get downloads directory
      let downloadsPath: string;
      try {
        downloadsPath = await invoke<string>("get_downloads_path");
      } catch (e) {
        setCommandStatus({ message: "Could not find Downloads folder", type: 'error' });
        commandStatusTimeoutRef.current = setTimeout(() => {
          setCommandStatus({ message: "Type a command...", type: 'idle' });
        }, 1000);
        return;
      }

      // Start download
      setCommandStatus({ message: "Downloading... 0%", type: 'progress' });

      try {
        const result = await invoke<GitDownloadResult>("download_github_folder", {
          urlInfo: {
            owner: parsed.owner,
            repo: parsed.repo,
            branch: parsed.branch,
            path: parsed.path,
          },
          outputPath: downloadsPath,
          options: {
            extract_files: true,
            flatten_structure: false,
            create_subfolder: true,
          },
        });

        setCommandStatus({ message: result.output_path, type: 'success' });
        commandStatusTimeoutRef.current = setTimeout(() => {
          setCommandStatus({ message: "Type a command...", type: 'idle' });
        }, 1000);
      } catch (e) {
        setCommandStatus({ message: String(e), type: 'error' });
        commandStatusTimeoutRef.current = setTimeout(() => {
          setCommandStatus({ message: "Type a command...", type: 'idle' });
        }, 1000);
      }
      return;
    }

    // Unknown command
    setCommandStatus({ message: "Unknown command", type: 'error' });
    commandStatusTimeoutRef.current = setTimeout(() => {
      setCommandStatus({ message: "Type a command...", type: 'idle' });
    }, 1000);
  };

  // YouTube Downloader handlers - synchronous URL change handler
  const handleYtUrlChange = (url: string) => {
    setYtUrlInput(url);
    const parsed = parseYouTubeUrl(url);
    setYtParsedUrl(parsed);
    setYtValidationError(null);
    // Clear video info immediately when URL changes
    if (!parsed?.isValid) {
      setYtVideoInfo(null);
    }
  };

  // Debounced YouTube video info fetching
  useEffect(() => {
    // Clear video info and reset state when URL becomes invalid
    if (!showYouTubeDownloader || !ytParsedUrl || !ytParsedUrl.isValid) {
      return;
    }

    // Set validating state immediately
    setYtProgress({
      stage: 'validating',
      percent: 0,
      message: 'Fetching video info...',
    });

    // Capture the current URL for the async operation
    const urlToFetch = ytUrlInput;

    const timeoutId = setTimeout(async () => {
      try {
        const info = await invoke<YouTubeVideoInfo>("get_youtube_video_info", { url: urlToFetch });
        setYtVideoInfo(info);
        setYtProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
      } catch (e) {
        setYtVideoInfo(null);
        setYtValidationError(e instanceof Error ? e.message : String(e));
        setYtProgress({
          stage: 'idle',
          percent: 0,
          message: '',
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [showYouTubeDownloader, ytUrlInput, ytParsedUrl]);

  const handleYtPaste = async () => {
    try {
      const clipboardText = await readText();
      if (clipboardText) {
        handleYtUrlChange(clipboardText);
      }
    } catch (e) {
      console.error("Failed to read clipboard:", e);
    }
  };

  const handleYtSelectFolder = async () => {
    isDialogOpenRef.current = true;
    await invoke("set_auto_hide", { enabled: false });

    const result = await open({
      directory: true,
      multiple: false,
    });

    await invoke("set_auto_hide", { enabled: true });
    isDialogOpenRef.current = false;

    if (result) {
      setYtDownloadPath(result as string);
    }
  };

  const handleYtDownload = async () => {
    if (!ytParsedUrl?.isValid || !ytDownloadPath) return;

    setYtProgress({
      stage: 'downloading',
      percent: 0,
      message: 'Starting download...',
    });

    try {
      await invoke<string>("download_youtube_video", {
        url: ytUrlInput,
        outputPath: ytDownloadPath,
        options: {
          quality: ytDownloadOptions.quality,
          mode: ytDownloadOptions.mode,
        },
      });
      // Progress updates come via events, completion is handled there
    } catch (e) {
      setYtProgress({
        stage: 'error',
        percent: 0,
        message: '',
        errorMessage: String(e),
      });
    }
  };

  const handleYtOpenFolder = async () => {
    const path = ytProgress.outputPath || ytDownloadPath;
    if (path) {
      try {
        // Get directory from file path
        const dirPath = path.includes('\\') || path.includes('/')
          ? path.substring(0, Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')))
          : path;
        await invoke("open_folder_in_explorer", { path: dirPath || path });
      } catch (e) {
        console.error("Failed to open folder:", e);
      }
    }
  };

  const handleYtCancel = async () => {
    try {
      await invoke("cancel_youtube_download");
    } catch (e) {
      // Ignore errors
    }
    setYtProgress({
      stage: 'idle',
      percent: 0,
      message: '',
    });
  };

  const handleYtReset = async () => {
    await handleYtCancel();
    setYtUrlInput("");
    setYtParsedUrl(null);
    setYtVideoInfo(null);
    setYtValidationError(null);
    setYtDownloadPath("");
    setYtDownloadOptions({
      quality: 'best',
      mode: 'video_audio',
    });
    setYtProgress({
      stage: 'idle',
      percent: 0,
      message: '',
    });
  };

  return (
    <div
      ref={contentRef}
      className="select-none"
      spellCheck={false}
    >
      {/* Command Palette - Hidden when tools are open */}
      {!showVideoConverter && !showPortKiller && !showTranslation && !showSettings && !showColorPicker && !showQRGenerator && !showRegexTester && !showGitDownloader && !showYouTubeDownloader && (
        <CommandPalette
          query={query}
          setQuery={setQuery}
          filteredTools={filteredTools}
          selectedIndex={selectedIndex}
          status={status}
          quickResult={quickResult}
          currencyLoading={currencyLoading}
          commandOnlyMode={settings.command_only_mode}
          commandStatus={commandStatus}
          onToolExecute={executeTool}
          onKeyDown={handleKeyDown}
          onOpenSettings={() => setShowSettings(true)}
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
          isRecordingHotkey={isRecordingHotkey}
          setIsRecordingHotkey={setIsRecordingHotkey}
          hotkeyInputRef={hotkeyInputRef}
          onHotkeyKeyDown={handleHotkeyKeyDown}
          onHotkeyMouseDown={handleHotkeyMouseDown}
          onDragStart={handleDragStart}
        />
      )}

      {/* Video Converter Panel */}
      {showVideoConverter && (
        <VideoConverter
          videoFile={videoFile}
          setVideoFile={setVideoFile}
          selectedFormat={videoFormat}
          setSelectedFormat={setVideoFormat}
          selectedQuality={videoQuality}
          setSelectedQuality={setVideoQuality}
          advancedSettings={videoAdvancedSettings}
          setAdvancedSettings={setVideoAdvancedSettings}
          showAdvanced={showVideoAdvanced}
          setShowAdvanced={setShowVideoAdvanced}
          isConverting={videoConverting}
          conversionProgress={videoProgress}
          conversionStatus={videoConversionStatus}
          onSelectFile={handleVideoSelectFile}
          onConvert={handleVideoConvert}
          onReset={handleVideoReset}
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
          setTranslationInput={setTranslationInput}
          translationOutput={translationOutput}
          detectedLanguage={detectedLanguage}
          targetLanguage={targetLanguage}
          setTargetLanguage={(lang) => {
            setTargetLanguage(lang);
            setSettings((prev) => ({ ...prev, quick_translation_target_language: lang }));
          }}
          isTranslating={isTranslating}
          translationError={translationError}
          isSettingsOpen={isTranslationSettingsOpen}
          setIsSettingsOpen={setIsTranslationSettingsOpen}
          onDragStart={handleDragStart}
          hotkeyModifiers={settings.quick_translation_hotkey_modifiers}
          hotkeyKey={settings.quick_translation_hotkey_key}
          isRecordingHotkey={isRecordingQuickTranslationHotkey}
          setIsRecordingHotkey={setIsRecordingQuickTranslationHotkey}
          hotkeyInputRef={quickTranslationHotkeyInputRef}
          onHotkeyKeyDown={handleQuickTranslationHotkeyKeyDown}
          onHotkeyMouseDown={handleQuickTranslationHotkeyMouseDown}
          onClearHotkey={() => {
            setSettings((prev) => ({
              ...prev,
              quick_translation_hotkey_key: "",
            }));
          }}
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

      {/* Git Downloader Panel */}
      {showGitDownloader && (
        <GitDownloader
          urlInput={gitUrlInput}
          setUrlInput={handleGitUrlChange}
          parsedUrl={gitParsedUrl}
          downloadPath={gitDownloadPath}
          options={gitDownloadOptions}
          setOptions={setGitDownloadOptions}
          progress={gitProgress}
          onPaste={handleGitPaste}
          onSelectFolder={handleGitSelectFolder}
          onDownload={handleGitDownload}
          onOpenFolder={handleGitOpenFolder}
          onReset={handleGitReset}
          onDragStart={handleDragStart}
        />
      )}

      {/* YouTube Downloader Panel */}
      {showYouTubeDownloader && (
        <YouTubeDownloader
          urlInput={ytUrlInput}
          setUrlInput={handleYtUrlChange}
          parsedUrl={ytParsedUrl}
          videoInfo={ytVideoInfo}
          downloadPath={ytDownloadPath}
          options={ytDownloadOptions}
          setOptions={setYtDownloadOptions}
          progress={ytProgress}
          validationError={ytValidationError}
          onPaste={handleYtPaste}
          onSelectFolder={handleYtSelectFolder}
          onDownload={handleYtDownload}
          onOpenFolder={handleYtOpenFolder}
          onCancel={handleYtCancel}
          onReset={handleYtReset}
          onDragStart={handleDragStart}
        />
      )}
    </div>
  );
}

export default App;
