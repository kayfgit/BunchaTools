import React from "react";
import {
  Youtube,
  Download,
  FolderOpen,
  Clipboard,
  Check,
  ChevronDown,
  Settings2,
  RotateCcw,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  User,
} from "lucide-react";
import type {
  YouTubeVideoInfo,
  YouTubeDownloadOptions,
  YouTubeDownloadProgress,
  YouTubeUrlInfo,
} from "../types";
import { formatDuration } from "../utils";
import { YOUTUBE_QUALITY_OPTIONS, YOUTUBE_DOWNLOAD_MODES } from "../constants";

interface YouTubeDownloaderProps {
  urlInput: string;
  setUrlInput: (url: string) => void;
  parsedUrl: YouTubeUrlInfo | null;
  videoInfo: YouTubeVideoInfo | null;
  downloadPath: string;
  options: YouTubeDownloadOptions;
  setOptions: (options: YouTubeDownloadOptions) => void;
  progress: YouTubeDownloadProgress;
  validationError: string | null;
  onPaste: () => Promise<void>;
  onSelectFolder: () => Promise<void>;
  onDownload: () => Promise<void>;
  onOpenFolder: () => Promise<void>;
  onCancel: () => Promise<void>;
  onReset: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function YouTubeDownloader({
  urlInput,
  setUrlInput,
  parsedUrl,
  videoInfo,
  downloadPath,
  options,
  setOptions,
  progress,
  validationError,
  onPaste,
  onSelectFolder,
  onDownload,
  onOpenFolder,
  onCancel,
  onReset,
  onDragStart,
}: YouTubeDownloaderProps) {
  const [showOptions, setShowOptions] = React.useState(false);
  const [justCopied, setJustCopied] = React.useState(false);

  const isIdle = progress.stage === "idle" || progress.stage === "validating";
  const isValidating = progress.stage === "validating";
  const isDownloading = progress.stage === "downloading";
  const isComplete = progress.stage === "complete";
  const isError = progress.stage === "error";
  const canDownload = parsedUrl?.isValid && downloadPath && isIdle;

  const handlePaste = async () => {
    await onPaste();
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  return (
    <div
      className="w-[720px] bg-buncha-bg rounded-lg overflow-hidden"
      onMouseDown={onDragStart}
    >
      {/* Tool Header */}
      <div
        className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center"
        data-drag-region
      >
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <Youtube className="w-4 h-4 text-red-500" />
          <span>YouTube Downloader</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {!isDownloading && !isComplete && !isError ? (
          <div className="space-y-5">
            {/* URL Input Section */}
            <div>
              <label className="text-xs font-medium text-buncha-text-muted uppercase tracking-wider mb-2 block">
                Video URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-sm text-buncha-text placeholder:text-buncha-text-muted/50 focus:outline-none focus:ring-2 focus:ring-buncha-accent/30 focus:border-buncha-accent transition-all"
                  />
                  {isValidating ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-buncha-accent animate-spin" />
                    </div>
                  ) : parsedUrl?.isValid && videoInfo?.isValid ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  ) : parsedUrl?.isValid && validationError ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={handlePaste}
                  className="flex items-center gap-2 px-4 py-3 bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border rounded-xl text-sm text-buncha-text-muted hover:text-buncha-text transition-all cursor-pointer"
                >
                  {justCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clipboard className="w-4 h-4" />
                  )}
                  <span>Paste</span>
                </button>
              </div>
              {/* Validation Error Message */}
              {parsedUrl?.isValid && validationError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationError.includes("yt-dlp")
                    ? "yt-dlp not found. Please install it first."
                    : validationError || "Failed to fetch video info"}
                </p>
              )}
            </div>

            {/* Video Info Card */}
            {videoInfo?.isValid && (
              <div className="bg-buncha-surface/20 border border-buncha-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-32 h-18 bg-buncha-surface rounded-lg overflow-hidden flex-shrink-0 relative">
                    {videoInfo.thumbnail ? (
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Youtube className="w-8 h-8 text-buncha-text-muted" />
                      </div>
                    )}
                    {/* Duration badge */}
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white font-medium">
                      {formatDuration(videoInfo.duration)}
                    </div>
                  </div>
                  {/* Video Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-buncha-text line-clamp-2 mb-2">
                      {videoInfo.title}
                    </p>
                    <p className="text-xs text-buncha-text-muted flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {videoInfo.channel}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Download Location */}
            <div>
              <label className="text-xs font-medium text-buncha-text-muted uppercase tracking-wider mb-2 block">
                Download To
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-sm text-buncha-text-muted truncate">
                  {downloadPath || "Select a folder..."}
                </div>
                <button
                  onClick={onSelectFolder}
                  className="flex items-center gap-2 px-4 py-3 bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border rounded-xl text-sm text-buncha-text-muted hover:text-buncha-text transition-all cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Browse</span>
                </button>
              </div>
            </div>

            {/* Options Panel */}
            <div>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-buncha-border hover:border-buncha-accent/30 hover:bg-buncha-surface/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-buncha-text-muted" />
                  <span className="text-sm font-medium text-buncha-text">
                    Options
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-buncha-text-muted transition-transform ${showOptions ? "rotate-180" : ""}`}
                />
              </button>

              {showOptions && (
                <div className="mt-3 space-y-4 p-4 bg-buncha-surface/20 rounded-xl border border-buncha-border animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Quality Selection */}
                  <div>
                    <label className="text-sm font-medium text-buncha-text block mb-2">
                      Quality
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {YOUTUBE_QUALITY_OPTIONS.map((quality) => {
                        const Icon = quality.icon;
                        const isSelected = options.quality === quality.id;
                        return (
                          <button
                            key={quality.id}
                            onClick={() =>
                              setOptions({ ...options, quality: quality.id })
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                              isSelected
                                ? "bg-buncha-accent text-white"
                                : "bg-buncha-surface/50 text-buncha-text-muted hover:bg-buncha-surface hover:text-buncha-text border border-buncha-border"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {quality.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Download Mode Selection */}
                  <div>
                    <label className="text-sm font-medium text-buncha-text block mb-2">
                      Download Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {YOUTUBE_DOWNLOAD_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = options.mode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() =>
                              setOptions({ ...options, mode: mode.id })
                            }
                            className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg text-sm transition-all cursor-pointer ${
                              isSelected
                                ? "bg-buncha-accent text-white"
                                : "bg-buncha-surface/50 text-buncha-text-muted hover:bg-buncha-surface hover:text-buncha-text border border-buncha-border"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">
                              {mode.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 text-sm text-buncha-text-muted hover:text-buncha-text transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={onDownload}
                disabled={!canDownload}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all ${
                  canDownload
                    ? "bg-buncha-accent hover:bg-buncha-accent/90 text-white hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    : "bg-buncha-surface/50 text-buncha-text-muted cursor-not-allowed"
                }`}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        ) : isDownloading ? (
          /* Downloading State */
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">
                Downloading...
              </h3>
              {videoInfo && (
                <p className="text-sm text-buncha-text-muted max-w-sm mx-auto truncate px-4">
                  {videoInfo.title}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-2 bg-buncha-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-red-500 to-pink-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-buncha-text-muted">
                <span>{progress.percent.toFixed(1)}% complete</span>
                <div className="flex items-center gap-3">
                  {progress.downloadSpeed && (
                    <span>{progress.downloadSpeed}</span>
                  )}
                  {progress.eta && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {progress.eta}
                    </span>
                  )}
                </div>
              </div>
              {progress.fileSize && (
                <p className="text-center text-xs text-buncha-text-muted">
                  Total size: {progress.fileSize}
                </p>
              )}
            </div>

            {/* Cancel Button */}
            <div className="text-center mt-4">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-all cursor-pointer"
              >
                Cancel Download
              </button>
            </div>
          </div>
        ) : isComplete ? (
          /* Success State */
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">
                Download Complete!
              </h3>
              <p className="text-sm text-buncha-text-muted">
                Video downloaded successfully
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onOpenFolder}
                className="flex items-center gap-2 px-5 py-3 bg-buncha-accent hover:bg-buncha-accent/90 text-white font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open Folder
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-5 py-3 bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border text-buncha-text font-medium rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Another
              </button>
            </div>
          </div>
        ) : (
          /* Error State */
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">
                Download Failed
              </h3>
              <p className="text-sm text-buncha-text-muted max-w-sm mx-auto">
                {progress.errorMessage ||
                  "An error occurred while downloading. Please check the URL and try again."}
              </p>
            </div>

            {/* Retry Button */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-5 py-3 bg-buncha-accent hover:bg-buncha-accent/90 text-white font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-5 py-3 bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border text-buncha-text font-medium rounded-xl transition-all cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-buncha-surface/20 border-t border-buncha-border">
        <div className="flex items-center justify-between text-xs text-buncha-text-muted">
          <span>
            {isComplete
              ? `Downloaded to: ${progress.outputPath || downloadPath}`
              : parsedUrl?.isValid
                ? `Ready to download: ${options.mode === "audio_only" ? "Audio" : options.mode === "video_only" ? "Video" : "Video + Audio"} @ ${options.quality.toUpperCase()}`
                : "Paste a YouTube URL to get started"}
          </span>
          <span>Powered by yt-dlp</span>
        </div>
      </div>
    </div>
  );
}
