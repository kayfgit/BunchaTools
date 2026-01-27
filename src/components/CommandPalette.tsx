import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  ArrowRight,
  Check,
  Settings,
  ChevronRight,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { Tool, QuickResult } from "../types";

export interface CommandStatus {
  message: string;
  type: 'idle' | 'progress' | 'success' | 'error' | 'help';
}

interface CommandPaletteProps {
  query: string;
  setQuery: (query: string) => void;
  filteredTools: Tool[];
  selectedIndex: number;
  status: string | null;
  quickResult: QuickResult | null;
  currencyLoading: boolean;
  commandOnlyMode: boolean;
  commandStatus: CommandStatus;
  calcResult: string | null;
  onToolExecute: (tool: Tool) => Promise<void>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onOpenSettings: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  toolItemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onDragStart: (e: React.MouseEvent) => void;
}

export function CommandPalette({
  query,
  setQuery,
  filteredTools,
  selectedIndex,
  status,
  quickResult,
  currencyLoading,
  commandOnlyMode,
  commandStatus,
  calcResult,
  onToolExecute,
  onKeyDown,
  onOpenSettings,
  inputRef,
  toolItemRefs,
  onDragStart,
}: CommandPaletteProps) {
  // In command only mode, never show tool suggestions - only the command input
  const isExpanded = !commandOnlyMode;
  const [copied, setCopied] = useState(false);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const [inputTextWidth, setInputTextWidth] = useState(0);

  // Measure input text width for calculator result positioning
  useEffect(() => {
    if (textMeasureRef.current && commandOnlyMode && query) {
      setInputTextWidth(textMeasureRef.current.offsetWidth);
    } else {
      setInputTextWidth(0);
    }
  }, [query, commandOnlyMode]);

  // Reset copied state when quickResult changes
  useEffect(() => {
    setCopied(false);
  }, [quickResult?.copyValue]);

  // Determine placeholder text and color for command-only mode
  const getCommandPlaceholder = () => {
    if (!commandOnlyMode) return status || "Search for tools...";
    if (status) return status;
    return commandStatus.message;
  };

  const getCommandPlaceholderClass = () => {
    if (!commandOnlyMode) {
      return status
        ? "text-buncha-accent placeholder-buncha-accent"
        : "text-buncha-text placeholder-buncha-text-muted";
    }
    if (status) return "text-buncha-accent placeholder-buncha-accent";
    switch (commandStatus.type) {
      case 'success':
        return "text-buncha-text placeholder-green-500";
      case 'error':
        return "text-buncha-text placeholder-red-500";
      case 'help':
        return "text-buncha-text placeholder-cyan-400";
      default:
        return "text-buncha-text placeholder-buncha-text-muted";
    }
  };

  return (
    <div
      className="w-[680px] bg-buncha-bg rounded-lg overflow-hidden"
      onMouseDown={onDragStart}
    >
      {/* Search Input */}
      <div className={`relative py-4 ${isExpanded ? 'border-b border-buncha-border' : ''}`} data-drag-region>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {commandOnlyMode ? (
            <ChevronRight className="w-5 h-5 text-buncha-text-muted" />
          ) : (
            <Search className="w-5 h-5 text-buncha-text-muted" />
          )}
        </div>
        <div className="ml-15 relative">
          {/* Hidden span to measure text width */}
          <span
            ref={textMeasureRef}
            className="absolute invisible whitespace-pre text-lg"
            aria-hidden="true"
          >
            {query}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={getCommandPlaceholder()}
            className={`w-145 py-1 bg-transparent text-lg outline-none ${getCommandPlaceholderClass()}`}
            autoFocus
          />
          {commandOnlyMode && calcResult && query && (
            <span
              className="absolute top-1/2 -translate-y-1/2 text-lg text-buncha-text-muted pointer-events-none"
              style={{ left: `${inputTextWidth + 8}px` }}
            >
              = {calcResult}
            </span>
          )}
        </div>
        {commandOnlyMode && (
          <button
            onClick={onOpenSettings}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-buncha-text-muted hover:text-buncha-text hover:bg-buncha-surface transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results List - Hidden in compact mode when no query */}
      {isExpanded && (
        <div className="max-h-[340px] overflow-y-auto scrollbar-hidden">
          {/* Quick Result Display */}
          {quickResult && (
            <div className="py-2 border-b border-buncha-border">
              <div className={`px-5 py-4 border-l-2 ${quickResult.isPreview ? 'bg-buncha-surface/30 border-buncha-text-muted' : 'bg-buncha-accent/5 border-buncha-accent'}`}>
                <div className="flex items-center gap-4">
                  {/* Color swatch or icon */}
                  {quickResult.type === 'color' && quickResult.colorPreview ? (
                    <div
                      className="w-12 h-12 rounded-xl border border-buncha-border"
                      style={{ backgroundColor: quickResult.colorPreview }}
                    />
                  ) : (
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${quickResult.isPreview ? 'bg-buncha-surface/50' : 'bg-buncha-accent/10'}`}>
                      <quickResult.icon className={`w-6 h-6 ${quickResult.isPreview ? 'text-buncha-text-muted' : 'text-buncha-accent'}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-buncha-text-muted">{quickResult.query}</p>
                      {quickResult.isPreview && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-buncha-surface rounded text-buncha-text-muted">
                          Preview
                        </span>
                      )}
                    </div>
                    <h3 className={`text-2xl font-bold ${quickResult.isPreview ? 'text-buncha-text' : 'text-buncha-accent'}`}>{quickResult.result}</h3>
                  </div>
                  <button
                    onClick={async () => {
                      await writeText(quickResult.copyValue);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                      copied
                        ? 'bg-green-500/20 text-green-500'
                        : quickResult.isPreview
                          ? 'bg-buncha-surface hover:bg-buncha-surface/80 text-buncha-text-muted'
                          : 'bg-buncha-accent/10 hover:bg-buncha-accent/20 text-buncha-accent'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Currency Loading State */}
          {currencyLoading && !quickResult && (
            <div className="py-2 border-b border-buncha-border">
              <div className="px-5 py-4 bg-buncha-accent/5 border-l-2 border-buncha-accent">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-buncha-accent/10">
                    <Loader2 className="w-6 h-6 text-buncha-accent animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-buncha-text-muted mb-1">{query}</p>
                    <h3 className="text-2xl font-bold text-buncha-accent">Converting...</h3>
                  </div>
                </div>
              </div>
            </div>
          )}
          {filteredTools.length > 0 ? (
            <div className="py-2">
              {filteredTools.map((tool, index) => {
                const IconComponent = tool.icon;
                return (
                  <div
                    key={tool.id}
                    ref={(el) => { toolItemRefs.current[index] = el; }}
                    onClick={() => onToolExecute(tool)}
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
          ) : !quickResult && !currencyLoading && (
            <div className="py-16 px-5 text-center">
              <div className="w-16 h-16 rounded-full bg-buncha-surface/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-buncha-text-muted" />
              </div>
              <p className="text-buncha-text-muted mb-1">No tools found</p>
              <p className="text-sm text-buncha-text-muted/70">Try searching for "converter" or "translate"</p>
            </div>
          )}
        </div>
      )}

      {/* Footer - Hidden in compact mode when no query */}
      {isExpanded && (
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
      )}
    </div>
  );
}
