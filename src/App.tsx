import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
  action?: () => Promise<void>;
  isSettings?: boolean;
}

interface Settings {
  hotkey_modifiers: string[];
  hotkey_key: string;
  launch_at_startup: boolean;
}

const BASE_HEIGHT = 60;
const RESULTS_HEIGHT = 300;
const SETTINGS_HEIGHT = 250;

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

  // Define tools
  const tools: Tool[] = [
    {
      id: "color-picker",
      name: "Color Picker",
      description: "Pick any color from your screen",
      icon: "🎨",
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
      id: "settings",
      name: "Settings",
      description: "Configure BunchaTools preferences",
      icon: "⚙️",
      keywords: ["settings", "preferences", "config", "options", "hotkey", "startup"],
      isSettings: true,
    },
  ];

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await invoke<Settings>("get_settings");
        setSettings(s);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const unlisten = listen("focus-search", () => {
      setQuery("");
      setSelectedIndex(0);
      setStatus(null);
      setShowSettings(false);
      inputRef.current?.focus();
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (query.trim() === "") {
      setFilteredTools([]);
      setSelectedIndex(0);
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
    }
  }, [query]);

  // Resize window based on view
  useEffect(() => {
    const resizeWindow = async () => {
      const appWindow = getCurrentWindow();
      let newHeight = BASE_HEIGHT;

      if (showSettings) {
        newHeight = SETTINGS_HEIGHT;
      } else if (query.length > 0) {
        newHeight = RESULTS_HEIGHT;
      }

      await appWindow.setSize(new LogicalSize(600, newHeight));
    };
    resizeWindow();
  }, [query.length > 0, showSettings]);

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
      if (showSettings) {
        setShowSettings(false);
      } else {
        invoke("hide_window");
        setQuery("");
      }
    } else if (!showSettings) {
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
  const showResults = query.length > 0 && !showSettings;
  const calculatorResult = query ? evaluateExpression(query) : null;

  return (
    <div className="p-2">
      {/* Search Bar */}
      <div
        className={`bg-buncha-bg border border-buncha-border shadow-2xl ${
          showResults || showSettings ? "rounded-t-buncha" : "rounded-buncha"
        }`}
      >
        <div className="flex items-center px-4 py-3">
          <svg
            className="w-5 h-5 text-buncha-text-muted mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={showSettings ? "Settings" : query}
            onChange={(e) => !showSettings && setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status || "Search for tools..."}
            readOnly={showSettings}
            className={`bg-transparent text-base outline-none ${
              calculatorResult ? "" : "flex-1"
            } ${
              status
                ? "text-buncha-accent placeholder-buncha-accent"
                : "text-buncha-text placeholder-buncha-text-muted"
            } ${showSettings ? "cursor-default" : ""}`}
            style={calculatorResult ? { width: `${query.length + 0.5}ch` } : undefined}
            autoFocus
          />
          {calculatorResult && (
            <span className="text-buncha-text-muted text-base whitespace-nowrap flex-1 ml-1">
              = {calculatorResult}
            </span>
          )}
          {(query || showSettings) && (
            <button
              onClick={() => {
                setQuery("");
                setShowSettings(false);
              }}
              className="text-buncha-text-muted hover:text-buncha-text ml-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-buncha-bg border border-t-0 border-buncha-border rounded-b-buncha shadow-2xl">
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
                className={`px-4 py-2 rounded-lg border cursor-pointer min-w-32 text-center transition-colors ${
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
                className={`w-12 h-6 rounded-full transition-colors relative ${
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
                className="px-4 py-2 bg-buncha-accent text-white rounded-lg text-sm font-medium hover:bg-buncha-accent/80 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="bg-buncha-bg border border-t-0 border-buncha-border rounded-b-buncha shadow-2xl max-h-60 overflow-y-auto">
          {filteredTools.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-1 text-xs text-buncha-text-muted uppercase tracking-wider">
                Results
              </div>
              {filteredTools.map((tool, index) => (
                <div
                  key={tool.id}
                  onClick={() => executeTool(tool)}
                  className={`flex items-center px-4 py-2 cursor-pointer ${
                    index === selectedIndex
                      ? "bg-buncha-surface"
                      : "hover:bg-buncha-surface"
                  }`}
                >
                  <span className="text-xl mr-3">{tool.icon}</span>
                  <div className="flex-1">
                    <div className="text-buncha-text text-sm font-medium">
                      {tool.name}
                    </div>
                    <div className="text-buncha-text-muted text-xs">
                      {tool.description}
                    </div>
                  </div>
                  <span className="text-buncha-text-muted text-xs">
                    {tool.isSettings ? "Settings" : "Tool"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-buncha-text-muted">
              No tools found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
