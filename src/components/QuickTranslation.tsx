import React, { useEffect } from "react";
import {
  Languages,
  Settings as SettingsIcon,
  Volume2,
  Copy,
  Loader2,
  ArrowDown,
  X,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { LANGUAGE_NAMES } from "../constants";

interface QuickTranslationProps {
  translationInput: string;
  setTranslationInput: (text: string) => void;
  translationOutput: string;
  detectedLanguage: string;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  isTranslating: boolean;
  translationError: string | null;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  onDragStart: (e: React.MouseEvent) => void;
  // Hotkey settings props
  hotkeyModifiers: string[];
  hotkeyKey: string;
  isRecordingHotkey: boolean;
  setIsRecordingHotkey: (recording: boolean) => void;
  hotkeyInputRef: React.RefObject<HTMLDivElement | null>;
  onHotkeyKeyDown: (e: React.KeyboardEvent) => void;
  onHotkeyMouseDown: (e: React.MouseEvent) => void;
  onClearHotkey: () => void;
}

export function QuickTranslation({
  translationInput,
  setTranslationInput,
  translationOutput,
  detectedLanguage,
  targetLanguage,
  setTargetLanguage,
  isTranslating,
  translationError,
  isSettingsOpen,
  setIsSettingsOpen,
  onDragStart,
  hotkeyModifiers,
  hotkeyKey,
  isRecordingHotkey,
  setIsRecordingHotkey,
  hotkeyInputRef,
  onHotkeyKeyDown,
  onHotkeyMouseDown,
  onClearHotkey,
}: QuickTranslationProps) {
  // Focus the hotkey input when recording starts
  useEffect(() => {
    if (isRecordingHotkey && hotkeyInputRef.current) {
      hotkeyInputRef.current.focus();
    }
  }, [isRecordingHotkey, hotkeyInputRef]);

  // Format the hotkey display
  const formatHotkey = () => {
    if (!hotkeyKey) return "Not set";
    const parts = [...hotkeyModifiers, hotkeyKey];
    return parts.join(" + ");
  };
  return (
    <div className="w-[680px] bg-buncha-bg rounded-lg overflow-hidden" onMouseDown={onDragStart}>
      {/* Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-between" data-drag-region>
        {/* Spacer to balance the settings button */}
        <div className="w-8" />
        {/* Centered title */}
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <Languages className="w-4 h-4" />
          <span>Quick Translation</span>
        </div>
        {/* Settings button on far right */}
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-buncha-text-muted hover:text-buncha-text transition-colors" />
        </button>
      </div>

      {/* Settings Panel (conditionally shown) */}
      {isSettingsOpen && (
        <div className="px-6 py-4 border-b border-buncha-border/50 bg-buncha-surface/20 space-y-4">
          {/* Target Language */}
          <div>
            <label className="text-sm text-buncha-text-muted mb-2 block">Target language</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full bg-buncha-bg border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text focus:outline-none focus:border-buncha-accent transition-all cursor-pointer"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="it">Italian</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="ko">Korean</option>
              <option value="ru">Russian</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          {/* Quick Translation Hotkey */}
          <div>
            <label className="text-sm text-buncha-text-muted mb-2 block">Keyboard shortcut</label>
            <p className="text-xs text-buncha-text-muted/70 mb-2">
              Press this hotkey anywhere to instantly translate selected text
            </p>
            <div className="flex items-center gap-2">
              <div
                ref={hotkeyInputRef}
                tabIndex={0}
                onClick={() => setIsRecordingHotkey(true)}
                onKeyDown={isRecordingHotkey ? onHotkeyKeyDown : undefined}
                onMouseDown={isRecordingHotkey ? onHotkeyMouseDown : undefined}
                className={`flex-1 bg-buncha-bg border rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ${
                  isRecordingHotkey
                    ? "border-buncha-accent ring-1 ring-buncha-accent text-buncha-accent"
                    : "border-buncha-border text-buncha-text hover:border-buncha-accent/50"
                }`}
              >
                {isRecordingHotkey ? (
                  <span className="animate-pulse">Press a key combination...</span>
                ) : (
                  <span className={hotkeyKey ? "" : "text-buncha-text-muted"}>
                    {formatHotkey()}
                  </span>
                )}
              </div>
              {hotkeyKey && (
                <button
                  onClick={onClearHotkey}
                  className="p-2 hover:bg-buncha-surface rounded-lg transition-colors text-buncha-text-muted hover:text-buncha-text cursor-pointer"
                  title="Clear hotkey"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Translation Content */}
      <div className="p-6">
        {/* Source Text */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-buncha-accent uppercase tracking-wider">
              {detectedLanguage || "Source"}
            </span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group">
                <Volume2 className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
              </button>
              <button
                onClick={() => translationInput && writeText(translationInput)}
                className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group"
              >
                <Copy className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
              </button>
            </div>
          </div>
          <textarea
            value={translationInput}
            onChange={(e) => setTranslationInput(e.target.value)}
            placeholder="Type or paste text to translate..."
            className="w-full bg-transparent text-lg text-buncha-text/90 resize-none min-h-[20px] focus:outline-none placeholder:text-buncha-text-muted placeholder:italic"
          />
        </div>

        {/* Divider */}
        <div className="relative py-1 mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-buncha-border/50" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-buncha-bg px-3">
              {isTranslating ? (
                <Loader2 className="w-5 h-5 animate-spin text-buncha-accent" />
              ) : (
                <ArrowDown className="w-5 h-5 text-buncha-text-muted" />
              )}
            </div>
          </div>
        </div>

        {/* Translated Text */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-buncha-accent uppercase tracking-wider">{LANGUAGE_NAMES[targetLanguage] || targetLanguage}</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group">
                <Volume2 className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
              </button>
              <button
                onClick={() => translationOutput && writeText(translationOutput)}
                className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group"
              >
                <Copy className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
              </button>
            </div>
          </div>
          <p className="mb-4 text-lg font-medium text-buncha-text select-text min-h-[28px]">
            {translationError ? (
              <span className="text-red-400">{translationError}</span>
            ) : isTranslating ? (
              <span className="text-buncha-text-muted italic font-normal">Translating...</span>
            ) : translationOutput ? (
              translationOutput
            ) : (
              <span className="text-buncha-text-muted italic font-normal">Translation will appear here</span>
            )}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-buncha-border/50 bg-buncha-surface/20">
        <p className="text-xs text-buncha-text-muted text-center">
          Translation powered by MyMemory
        </p>
      </div>
    </div>
  );
}
