import React from "react";
import {
  Video,
  Upload,
  Check,
  X,
  Play,
  Clock,
  HardDrive,
  Settings2,
  ChevronDown,
  Zap,
  RotateCcw,
} from "lucide-react";
import type { VideoFileMetadata, VideoAdvancedSettings } from "../types";
import {
  VIDEO_FORMATS,
  VIDEO_QUALITY_PRESETS,
  VIDEO_QUALITY_ICONS,
  VIDEO_RESOLUTIONS,
  VIDEO_FRAMERATES,
  VIDEO_CODECS,
} from "../constants";
import { formatFileSize, formatDuration, estimateOutputSize } from "../utils";

interface VideoConverterProps {
  videoFile: VideoFileMetadata | null;
  setVideoFile: (file: VideoFileMetadata | null) => void;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  selectedQuality: string;
  setSelectedQuality: (quality: string) => void;
  advancedSettings: VideoAdvancedSettings;
  setAdvancedSettings: (settings: VideoAdvancedSettings) => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  isConverting: boolean;
  conversionProgress: number;
  conversionStatus: 'idle' | 'converting' | 'success' | 'error';
  onSelectFile: () => Promise<void>;
  onConvert: () => Promise<void>;
  onReset: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function VideoConverter({
  videoFile,
  setVideoFile,
  selectedFormat,
  setSelectedFormat,
  selectedQuality,
  setSelectedQuality,
  advancedSettings,
  setAdvancedSettings,
  showAdvanced,
  setShowAdvanced,
  isConverting,
  conversionProgress,
  conversionStatus,
  onSelectFile,
  onConvert,
  onReset,
  onDragStart,
}: VideoConverterProps) {
  // Get the selected quality preset for estimated output calculation
  const selectedPreset = VIDEO_QUALITY_PRESETS.find(p => p.id === selectedQuality);
  const estimatedSize = videoFile && selectedPreset && selectedPreset.bitrate > 0
    ? estimateOutputSize(videoFile.duration, selectedPreset.bitrate, advancedSettings.keepAudio)
    : 0;

  return (
    <div className="bg-buncha-bg border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={onDragStart}>
      {/* Tool Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <Video className="w-4 h-4 text-buncha-accent" />
          <span>Video Converter</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {!isConverting ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - File, Format & Advanced Settings */}
            <div className="space-y-5">
              {/* File Upload Area */}
              <div>
                <label className="text-xs font-medium text-buncha-text-muted uppercase tracking-wider mb-2 block">
                  Source Video
                </label>
                {videoFile ? (
                  <div className="relative group">
                    <div className="bg-buncha-surface/30 border border-buncha-border rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        {/* Video Thumbnail Placeholder */}
                        <div className="w-24 h-16 bg-buncha-surface rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-buncha-accent/20 to-purple-500/20" />
                          <Play className="w-6 h-6 text-buncha-accent relative z-10" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-buncha-text">{videoFile.name}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-buncha-text-muted">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatFileSize(videoFile.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(videoFile.duration)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setVideoFile(null)}
                          className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4 text-buncha-text-muted" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={onSelectFile}
                    className="w-full border-2 border-dashed border-buncha-border hover:border-buncha-accent/50 rounded-xl p-8 text-center transition-colors cursor-pointer group"
                  >
                    <div className="w-14 h-14 bg-buncha-surface/50 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-buncha-accent/10 transition-colors">
                      <Upload className="w-7 h-7 text-buncha-text-muted group-hover:text-buncha-accent transition-colors" />
                    </div>
                    <p className="text-sm font-medium mb-1 text-buncha-text">Drop video here or click to browse</p>
                    <p className="text-xs text-buncha-text-muted">Supports MP4, MOV, AVI, MKV, WebM</p>
                  </button>
                )}
              </div>

              {/* Output Format Selection */}
              <div>
                <label className="text-xs font-medium text-buncha-text-muted uppercase tracking-wider mb-2 block">
                  Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_FORMATS.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`relative p-3 rounded-xl border transition-all text-left cursor-pointer ${
                        selectedFormat === format.id
                          ? "border-buncha-accent bg-buncha-accent/5 ring-1 ring-buncha-accent/20"
                          : "border-buncha-border hover:border-buncha-accent/30 hover:bg-buncha-surface/30"
                      }`}
                    >
                      {selectedFormat === format.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-3.5 h-3.5 text-buncha-accent" />
                        </div>
                      )}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                        selectedFormat === format.id ? "bg-buncha-accent/10" : "bg-buncha-surface/50"
                      }`}>
                        <Video className={`w-4 h-4 ${
                          selectedFormat === format.id ? "text-buncha-accent" : "text-buncha-text-muted"
                        }`} />
                      </div>
                      <p className="font-semibold text-sm text-buncha-text">{format.name}</p>
                      <p className="text-[10px] text-buncha-text-muted">{format.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-buncha-border hover:border-buncha-accent/30 hover:bg-buncha-surface/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-buncha-text-muted" />
                    <span className="text-sm font-medium text-buncha-text">Advanced Settings</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-buncha-text-muted transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  />
                </button>

                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-2 gap-3 p-4 bg-buncha-surface/20 rounded-xl border border-buncha-border animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Resolution */}
                    <div>
                      <label className="text-xs font-medium text-buncha-text-muted mb-1.5 block">Resolution</label>
                      <select
                        value={advancedSettings.resolution}
                        onChange={(e) => setAdvancedSettings({ ...advancedSettings, resolution: e.target.value })}
                        className="w-full bg-buncha-surface/50 border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text focus:outline-none focus:ring-2 focus:ring-buncha-accent/20 focus:border-buncha-accent"
                      >
                        {VIDEO_RESOLUTIONS.map((res) => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                    </div>

                    {/* Frame Rate */}
                    <div>
                      <label className="text-xs font-medium text-buncha-text-muted mb-1.5 block">Frame Rate</label>
                      <select
                        value={advancedSettings.frameRate}
                        onChange={(e) => setAdvancedSettings({ ...advancedSettings, frameRate: e.target.value })}
                        className="w-full bg-buncha-surface/50 border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text focus:outline-none focus:ring-2 focus:ring-buncha-accent/20 focus:border-buncha-accent"
                      >
                        {VIDEO_FRAMERATES.map((fps) => (
                          <option key={fps} value={fps}>{fps}</option>
                        ))}
                      </select>
                    </div>

                    {/* Codec */}
                    <div>
                      <label className="text-xs font-medium text-buncha-text-muted mb-1.5 block">Codec</label>
                      <select
                        value={advancedSettings.codec}
                        onChange={(e) => setAdvancedSettings({ ...advancedSettings, codec: e.target.value })}
                        className="w-full bg-buncha-surface/50 border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text focus:outline-none focus:ring-2 focus:ring-buncha-accent/20 focus:border-buncha-accent"
                      >
                        {VIDEO_CODECS.map((codec) => (
                          <option key={codec} value={codec}>{codec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Audio Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-buncha-text-muted">Keep Audio</label>
                      <button
                        onClick={() => setAdvancedSettings({ ...advancedSettings, keepAudio: !advancedSettings.keepAudio })}
                        className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                          advancedSettings.keepAudio ? "bg-buncha-accent" : "bg-buncha-surface"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                            advancedSettings.keepAudio ? "right-0.5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Quality Presets Only */}
            <div className="space-y-5">
              {/* Quality Presets */}
              <div>
                <label className="text-xs font-medium text-buncha-text-muted uppercase tracking-wider mb-2 block">
                  Quality Preset
                </label>
                <div className="space-y-2">
                  {VIDEO_QUALITY_PRESETS.map((preset) => {
                    const Icon = VIDEO_QUALITY_ICONS[preset.id];
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedQuality(preset.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedQuality === preset.id
                            ? "border-buncha-accent bg-buncha-accent/5 ring-1 ring-buncha-accent/20"
                            : "border-buncha-border hover:border-buncha-accent/30 hover:bg-buncha-surface/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              selectedQuality === preset.id ? "bg-buncha-accent/10" : "bg-buncha-surface/50"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${selectedQuality === preset.id ? "text-buncha-accent" : "text-buncha-text-muted"}`} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-sm text-buncha-text">{preset.name}</p>
                            <p className="text-xs text-buncha-text-muted">{preset.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-buncha-text-muted font-mono">
                            {preset.bitrate > 0 ? `${preset.bitrate / 1000} Mbps` : "—"}
                          </span>
                          {selectedQuality === preset.id && <Check className="w-4 h-4 text-buncha-accent" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Converting State */
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-buncha-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                <Video className={`w-10 h-10 text-buncha-accent ${conversionStatus === 'converting' ? 'animate-pulse' : ''}`} />
                {conversionStatus === 'converting' && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">
                {conversionStatus === 'success' ? 'Conversion Complete!' :
                 conversionStatus === 'error' ? 'Conversion Failed' : 'Converting...'}
              </h3>
              <p className="text-sm text-buncha-text-muted">
                {videoFile?.name} → {selectedFormat.toUpperCase()}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-2 bg-buncha-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    conversionStatus === 'success' ? 'bg-green-500' :
                    conversionStatus === 'error' ? 'bg-red-500' :
                    'bg-gradient-to-r from-buncha-accent to-purple-500'
                  }`}
                  style={{ width: `${conversionProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-buncha-text-muted">
                <span>{conversionProgress}% complete</span>
                {conversionStatus === 'converting' && <span>Processing...</span>}
              </div>
            </div>

            {/* Cancel Button */}
            {conversionStatus === 'converting' && (
              <div className="text-center mt-6">
                <button
                  onClick={onReset}
                  className="px-4 py-2 text-sm text-buncha-text-muted hover:text-buncha-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Convert Button */}
        {!isConverting && videoFile && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-buncha-text-muted hover:text-buncha-text transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={onConvert}
              className="flex items-center gap-2 px-6 py-3 bg-buncha-accent hover:bg-buncha-accent/90 text-white font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Convert to {selectedFormat.toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-buncha-surface/20 border-t border-buncha-border">
        <div className="flex items-center justify-between text-xs text-buncha-text-muted">
          <span>
            {estimatedSize > 0
              ? `Estimated output: ~${formatFileSize(estimatedSize)}`
              : videoFile
                ? "Estimated output: varies (original quality)"
                : "Select a video to convert"}
          </span>
          <span>Processing locally on your machine</span>
        </div>
      </div>
    </div>
  );
}
