import React from "react";
import {
  Network,
  Search,
  Loader2,
  Monitor,
  AlertCircle,
} from "lucide-react";
import type { PortProcess } from "../types";
import { COMMON_PORTS } from "../constants";

interface PortKillerProps {
  portInput: string;
  setPortInput: (port: string) => void;
  portProcesses: PortProcess[];
  isScanning: boolean;
  scannedPort: number | null;
  onScanPort: (port: number) => Promise<void>;
  onKillProcess: (pid: number) => Promise<void>;
  onDragStart: (e: React.MouseEvent) => void;
}

export function PortKiller({
  portInput,
  setPortInput,
  portProcesses,
  isScanning,
  scannedPort,
  onScanPort,
  onKillProcess,
  onDragStart,
}: PortKillerProps) {
  return (
    <div className="w-[680px] bg-buncha-bg rounded-lg overflow-hidden" onMouseDown={onDragStart}>
      {/* Tool Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
        <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
          <Network className="w-4 h-4" />
          <span>Port Killer</span>
        </div>
      </div>
      <div className="p-4">
        {/* Port Input */}
        <div className="text-buncha-text text-sm font-medium mb-3">Enter port number</div>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={portInput}
            onChange={(e) => setPortInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && portInput) {
                onScanPort(parseInt(portInput));
              }
            }}
            placeholder="e.g., 3000"
            className="flex-1 bg-buncha-surface border border-buncha-border rounded-lg px-4 py-2 text-buncha-text placeholder-buncha-text-muted outline-none focus:border-buncha-accent"
            data-no-drag
          />
          <button
            onClick={() => portInput && onScanPort(parseInt(portInput))}
            disabled={!portInput || isScanning}
            className="px-4 py-2 bg-buncha-accent text-white rounded-lg text-sm font-medium hover:bg-buncha-accent/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Scan
          </button>
        </div>

        {/* Common Ports */}
        <div className="text-buncha-text-muted text-xs mb-2">Common ports</div>
        <div className="flex flex-wrap gap-2 mb-6">
          {COMMON_PORTS.map((port) => (
            <button
              key={port}
              onClick={() => {
                setPortInput(port.toString());
                onScanPort(port);
              }}
              className="px-3 py-1.5 bg-buncha-surface border border-buncha-border rounded-lg text-buncha-text text-sm hover:border-buncha-text-muted transition-colors cursor-pointer"
            >
              {port}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="min-h-[140px] flex flex-col">
          {isScanning ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-buncha-text-muted">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Scanning port {scannedPort}...</span>
              </div>
            </div>
          ) : portProcesses.length > 0 ? (
            <div className="space-y-2">
              {portProcesses.map((process) => (
                <div
                  key={process.pid}
                  className="flex items-center justify-between p-3 bg-buncha-surface rounded-lg border border-buncha-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-buncha-bg flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-buncha-text-muted" />
                    </div>
                    <div>
                      <div className="text-buncha-text text-sm font-medium">{process.name}</div>
                      <div className="text-buncha-text-muted text-xs">
                        PID: {process.pid} | {process.protocol} :{process.port}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onKillProcess(process.pid)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Kill
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-buncha-text-muted">
                <AlertCircle className="w-10 h-10 mb-2 opacity-50" strokeWidth={1.5} />
                <span className="text-sm">
                  {scannedPort !== null
                    ? `No processes found on port ${scannedPort}`
                    : "No active processes found. Enter a port number to scan."}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
