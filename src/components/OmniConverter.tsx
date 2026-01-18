import React from "react";
import {
  Repeat2,
  Image,
  Music,
  Video,
  FileText,
  Upload,
  Check,
  X,
  File,
} from "lucide-react";
import type { ConverterType, SelectedFile } from "../types";
import { FORMAT_OPTIONS } from "../constants";
import { getFileExtension, formatFileSize } from "../utils";

interface OmniConverterProps {
  converterType: ConverterType | null;
  setConverterType: (type: ConverterType | null) => void;
  selectedFile: SelectedFile | null;
  setSelectedFile: (file: SelectedFile | null) => void;
  targetFormat: string | null;
  setTargetFormat: (format: string | null) => void;
  isConverting: boolean;
  conversionProgress: number;
  conversionStatus: 'idle' | 'converting' | 'success' | 'error';
  onSelectFile: () => Promise<void>;
  onConvert: () => Promise<void>;
  onDragStart: (e: React.MouseEvent) => void;
}

export function OmniConverter({
  converterType,
  setConverterType,
  selectedFile,
  setSelectedFile,
  targetFormat,
  setTargetFormat,
  isConverting,
  conversionProgress,
  conversionStatus,
  onSelectFile,
  onConvert,
  onDragStart,
}: OmniConverterProps) {
  return (
    <div className="bg-buncha-bg border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={onDragStart}>
      {/* Tool Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <Repeat2 className="w-4 h-4" />
          <span>Omni Converter</span>
        </div>
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
                onClick={onSelectFile}
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
                        onClick={onConvert}
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
  );
}
