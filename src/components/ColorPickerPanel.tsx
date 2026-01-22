import React from "react";
import {
  Pipette,
  Copy,
  Check,
} from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ColorFormats } from "../types";

interface ColorPickerPanelProps {
  pickedColor: ColorFormats;
  copiedFormat: string | null;
  setCopiedFormat: (format: string | null) => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function ColorPickerPanel({
  pickedColor,
  copiedFormat,
  setCopiedFormat,
  onDragStart,
}: ColorPickerPanelProps) {
  return (
    <div className="bg-buncha-bg rounded-lg overflow-hidden" onMouseDown={onDragStart}>
      {/* Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <Pipette className="w-4 h-4" />
          <span>Color Details</span>
        </div>
      </div>

      {/* Content - Two Column Layout */}
      <div className="p-6 flex gap-8">
        {/* Left Side - Color Preview */}
        <div className="flex-shrink-0 w-80">
          <div className="relative group">
            <div
              className="w-full rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ backgroundColor: pickedColor.hex, minHeight: "420px" }}
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-black/10" />

            {/* Color Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60 mb-1">Primary Color</p>
                  <p className="text-2xl font-mono font-semibold text-white">{pickedColor.hex}</p>
                </div>
                <button
                  onClick={async () => {
                    await writeText(pickedColor.hex);
                    setCopiedFormat("preview");
                    setTimeout(() => setCopiedFormat(null), 2000);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedFormat === "preview" ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-white/80" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Color Formats */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-buncha-text-muted mb-4">Available Formats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "HEX", value: pickedColor.hex, description: "Hexadecimal" },
              { label: "RGB", value: pickedColor.rgb, description: "Red Green Blue" },
              { label: "HSL", value: pickedColor.hsl, description: "Hue Saturation Lightness" },
              { label: "HSV", value: pickedColor.hsv, description: "Hue Saturation Value" },
              { label: "OKLCH", value: pickedColor.oklch, description: "Perceptual color space" },
              { label: "CMYK", value: pickedColor.cmyk, description: "Cyan Magenta Yellow Black" },
              { label: "LAB", value: pickedColor.lab, description: "Lightness A B" },
              { label: "XYZ", value: pickedColor.xyz, description: "CIE XYZ color space" },
            ].map((format) => (
              <div
                key={format.label}
                className="group/format bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border hover:border-buncha-accent/50 rounded-lg py-2 pl-3 transition-all duration-200 cursor-pointer"
                onClick={async () => {
                  await writeText(format.value);
                  setCopiedFormat(format.label);
                  setTimeout(() => setCopiedFormat(null), 2000);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold text-buncha-accent">{format.label}</span>
                      {copiedFormat === format.label && <Check className="w-3 h-3 text-green-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-buncha-text-muted mb-2">{format.description}</p>
                    <p className="font-mono text-sm text-buncha-text truncate">{format.value}</p>
                  </div>
                  <button
                    className="p-1.5 hover:bg-buncha-bg rounded-lg transition-colors opacity-0 group-hover/format:opacity-100 flex-shrink-0 cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await writeText(format.value);
                      setCopiedFormat(format.label);
                      setTimeout(() => setCopiedFormat(null), 2000);
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 text-buncha-text-muted" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
