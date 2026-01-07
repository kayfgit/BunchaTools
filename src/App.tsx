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
  action: () => Promise<void>;
}

const BASE_HEIGHT = 60;
const RESULTS_HEIGHT = 300;

function App() {
  const [query, setQuery] = useState("");
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  ];

  useEffect(() => {
    // Listen for focus-search event from backend
    const unlisten = listen("focus-search", () => {
      setQuery("");
      setSelectedIndex(0);
      setStatus(null);
      inputRef.current?.focus();
    });

    // Initial focus
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

  // Resize window based on whether results are shown
  useEffect(() => {
    const resizeWindow = async () => {
      const appWindow = getCurrentWindow();
      const showResults = query.length > 0;
      const newHeight = showResults ? RESULTS_HEIGHT : BASE_HEIGHT;
      await appWindow.setSize(new LogicalSize(600, newHeight));
    };
    resizeWindow();
  }, [query.length > 0]);

  const executeTool = async (tool: Tool) => {
    setQuery("");
    await tool.action();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      invoke("hide_window");
      setQuery("");
    } else if (e.key === "ArrowDown") {
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
  };

  const showResults = query.length > 0;

  return (
    <div className="p-2">
      <div
        className={`bg-buncha-bg border border-buncha-border shadow-2xl ${
          showResults ? "rounded-t-buncha" : "rounded-buncha"
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status || "Search for tools..."}
            className={`flex-1 bg-transparent text-base outline-none ${
              status ? "text-buncha-accent placeholder-buncha-accent" : "text-buncha-text placeholder-buncha-text-muted"
            }`}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
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
                  <span className="text-buncha-text-muted text-xs">Tool</span>
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
