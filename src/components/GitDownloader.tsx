import React from "react";
import {
  GitBranch,
  FolderGit2,
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
} from "lucide-react";
import type { GitHubUrlInfo, GitDownloadOptions, GitDownloadProgress } from "../types";
import { formatGitHubPath } from "../utils";

interface GitDownloaderProps {
  urlInput: string;
  setUrlInput: (url: string) => void;
  parsedUrl: GitHubUrlInfo | null;
  downloadPath: string;
  options: GitDownloadOptions;
  setOptions: (options: GitDownloadOptions) => void;
  progress: GitDownloadProgress;
  onPaste: () => Promise<void>;
  onSelectFolder: () => Promise<void>;
  onDownload: () => Promise<void>;
  onOpenFolder: () => Promise<void>;
  onReset: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function GitDownloader({
  urlInput,
  setUrlInput,
  parsedUrl,
  downloadPath,
  options,
  setOptions,
  progress,
  onPaste,
  onSelectFolder,
  onDownload,
  onOpenFolder,
  onReset,
  onDragStart,
}: GitDownloaderProps) {
  const [showOptions, setShowOptions] = React.useState(false);
  const [justCopied, setJustCopied] = React.useState(false);

  const isIdle = progress.stage === 'idle';
  const isDownloading = progress.stage === 'fetching' || progress.stage === 'downloading' || progress.stage === 'extracting';
  const isComplete = progress.stage === 'complete';
  const isError = progress.stage === 'error';
  const canDownload = parsedUrl?.isValid && downloadPath && isIdle;

  const handlePaste = async () => {
    await onPaste();
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  return (
    <div className="w-[720px] bg-buncha-bg rounded-lg overflow-hidden" onMouseDown={onDragStart}>
      {/* Tool Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <GitBranch className="w-4 h-4 text-buncha-accent" />
          <span>Git Downloader</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {!isDownloading && !isComplete && !isError ? (
          <div className="space-y-5">
            {/* URL Input Section */}
            <div>
              <label className="text-xs font-medium text-buncha-text-muted uppercase tracking-wider mb-2 block">
                Repository URL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://github.com/user/repo/tree/branch/folder"
                    className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-sm text-buncha-text placeholder:text-buncha-text-muted/50 focus:outline-none focus:ring-2 focus:ring-buncha-accent/30 focus:border-buncha-accent transition-all"
                  />
                  {parsedUrl?.isValid && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
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
            </div>

            {/* Parsed URL Info Card */}
            {parsedUrl?.isValid && (
              <div className="bg-buncha-surface/20 border border-buncha-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-buncha-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FolderGit2 className="w-6 h-6 text-buncha-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-buncha-text truncate">
                        {parsedUrl.owner}/{parsedUrl.repo}
                      </p>
                      <span className="px-2 py-0.5 bg-buncha-surface/50 rounded-md text-xs text-buncha-text-muted">
                        {parsedUrl.branch}
                      </span>
                    </div>
                    <p className="text-xs text-buncha-text-muted flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      {formatGitHubPath(parsedUrl.path)}
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
                  <span className="text-sm font-medium text-buncha-text">Options</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-buncha-text-muted transition-transform ${showOptions ? "rotate-180" : ""}`}
                />
              </button>

              {showOptions && (
                <div className="mt-3 space-y-3 p-4 bg-buncha-surface/20 rounded-xl border border-buncha-border animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Extract Files Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-buncha-text block">Extract files</label>
                      <p className="text-xs text-buncha-text-muted">Uncheck to download as ZIP archive</p>
                    </div>
                    <button
                      onClick={() => setOptions({ ...options, extractFiles: !options.extractFiles })}
                      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                        options.extractFiles ? "bg-buncha-accent" : "bg-buncha-surface"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          options.extractFiles ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Create Subfolder Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-buncha-text block">Create subfolder</label>
                      <p className="text-xs text-buncha-text-muted">Create a folder with the repository name</p>
                    </div>
                    <button
                      onClick={() => setOptions({ ...options, createSubfolder: !options.createSubfolder })}
                      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                        options.createSubfolder ? "bg-buncha-accent" : "bg-buncha-surface"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          options.createSubfolder ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Flatten Structure Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-buncha-text block">Flatten structure</label>
                      <p className="text-xs text-buncha-text-muted">Put all files in root folder (no subdirectories)</p>
                    </div>
                    <button
                      onClick={() => setOptions({ ...options, flattenStructure: !options.flattenStructure })}
                      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                        options.flattenStructure ? "bg-buncha-accent" : "bg-buncha-surface"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          options.flattenStructure ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
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
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all cursor-pointer ${
                  canDownload
                    ? "bg-buncha-accent hover:bg-buncha-accent/90 text-white hover:scale-[1.02] active:scale-[0.98]"
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
              <div className="w-20 h-20 bg-buncha-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                <Loader2 className="w-10 h-10 text-buncha-accent animate-spin" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">
                {progress.stage === 'fetching' ? 'Connecting...' :
                 progress.stage === 'downloading' ? 'Downloading...' :
                 'Extracting...'}
              </h3>
              {parsedUrl && (
                <p className="text-sm text-buncha-text-muted">
                  {parsedUrl.owner}/{parsedUrl.repo}
                  {parsedUrl.path && <span className="text-buncha-accent"> / {parsedUrl.path}</span>}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-2 bg-buncha-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-buncha-accent to-purple-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-buncha-text-muted">
                <span>{progress.percent}% complete</span>
                <span>{progress.message}</span>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="text-center mt-4">
              <button
                onClick={onReset}
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
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">Download Complete!</h3>
              <p className="text-sm text-buncha-text-muted">
                {progress.processedFiles} files downloaded successfully
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
              <h3 className="text-lg font-semibold mb-1 text-buncha-text">Download Failed</h3>
              <p className="text-sm text-buncha-text-muted max-w-sm mx-auto">
                {progress.errorMessage || "An error occurred while downloading. Please check the URL and try again."}
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
                ? `Ready to download${parsedUrl.path ? ` folder: /${parsedUrl.path}` : ' entire repository'}`
                : "Paste a GitHub URL to get started"}
          </span>
          <span>Downloads via GitHub API</span>
        </div>
      </div>
    </div>
  );
}
