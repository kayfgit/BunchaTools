import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import type { Settings } from "../types";

interface SettingsPanelProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  isRecordingHotkey: boolean;
  setIsRecordingHotkey: (recording: boolean) => void;
  hotkeyInputRef: React.RefObject<HTMLDivElement | null>;
  onHotkeyKeyDown: (e: React.KeyboardEvent) => void;
  onHotkeyMouseDown: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function SettingsPanel({
  settings,
  setSettings,
  isRecordingHotkey,
  setIsRecordingHotkey,
  hotkeyInputRef,
  onHotkeyKeyDown,
  onHotkeyMouseDown,
  onDragStart,
}: SettingsPanelProps) {
  return (
    <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={onDragStart}>
      {/* Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </div>
      </div>
      <div className="p-4 space-y-1">
        {/* Keyboard Shortcut */}
        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="text-buncha-text font-medium mb-0.5">Keyboard Shortcut</h3>
            <p className="text-sm text-buncha-text-muted">Global hotkey to open command palette</p>
          </div>
          <div
            ref={hotkeyInputRef}
            tabIndex={0}
            onClick={() => setIsRecordingHotkey(true)}
            onKeyDown={isRecordingHotkey ? onHotkeyKeyDown : undefined}
            onMouseDown={isRecordingHotkey ? onHotkeyMouseDown : undefined}
            onBlur={() => setIsRecordingHotkey(false)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isRecordingHotkey
                ? "bg-buncha-accent/20 border-buncha-accent"
                : "bg-buncha-surface border-buncha-border hover:border-buncha-text-muted"
            }`}
          >
            {isRecordingHotkey ? (
              <span className="text-sm text-buncha-accent">Press keys...</span>
            ) : (
              [...settings.hotkey_modifiers, settings.hotkey_key].map((key, i) => (
                <span key={i} className="text-sm font-medium text-buncha-text">
                  {key}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Launch at Startup */}
        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="text-buncha-text font-medium mb-0.5">Launch at Startup</h3>
            <p className="text-sm text-buncha-text-muted">Automatically start when you log in</p>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                launch_at_startup: !prev.launch_at_startup,
              }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              settings.launch_at_startup
                ? "bg-buncha-accent"
                : "bg-buncha-surface border border-buncha-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.launch_at_startup
                  ? "right-0.5"
                  : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Show in System Tray */}
        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="text-buncha-text font-medium mb-0.5">Show in System Tray</h3>
            <p className="text-sm text-buncha-text-muted">Display icon in system tray</p>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                show_in_tray: !prev.show_in_tray,
              }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              settings.show_in_tray
                ? "bg-buncha-accent"
                : "bg-buncha-surface border border-buncha-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.show_in_tray
                  ? "right-0.5"
                  : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Automatic Updates */}
        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="text-buncha-text font-medium mb-0.5">Automatic Updates</h3>
            <p className="text-sm text-buncha-text-muted">Keep the app up to date automatically</p>
          </div>
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                automatic_updates: !prev.automatic_updates,
              }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              settings.automatic_updates
                ? "bg-buncha-accent"
                : "bg-buncha-surface border border-buncha-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.automatic_updates
                  ? "right-0.5"
                  : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between py-3">
          <div>
            <h3 className="text-buncha-text font-medium mb-0.5">Theme</h3>
            <p className="text-sm text-buncha-text-muted">Choose your preferred theme</p>
          </div>
          <select
            value={settings.theme}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                theme: e.target.value as "dark" | "light" | "system",
              }))
            }
            className="px-3 py-1.5 bg-buncha-surface rounded-lg border border-buncha-border text-sm text-buncha-text outline-none cursor-pointer hover:border-buncha-text-muted transition-colors"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>
    </div>
  );
}
