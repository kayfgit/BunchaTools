import React from "react";
import {
  Palette,
  Copy,
  Check,
  Download,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import QRCodeLib from "qrcode";
import jsPDF from "jspdf";
import type { QRCodeType, QRCodeData } from "../types";
import { QR_TYPES } from "../constants";
import { generateQRContent } from "../utils";

interface QRGeneratorProps {
  qrType: QRCodeType;
  setQRType: (type: QRCodeType) => void;
  qrData: QRCodeData;
  setQRData: (data: QRCodeData) => void;
  qrForegroundColor: string;
  setQRForegroundColor: (color: string) => void;
  qrBackgroundColor: string;
  setQRBackgroundColor: (color: string) => void;
  showCustomization: boolean;
  setShowCustomization: (show: boolean) => void;
  qrImageDataUrl: string;
  qrCopied: boolean;
  setQRCopied: (copied: boolean) => void;
  selectedExportFormat: "PNG" | "SVG" | "PDF";
  setSelectedExportFormat: (format: "PNG" | "SVG" | "PDF") => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function QRGenerator({
  qrType,
  setQRType,
  qrData,
  setQRData,
  qrForegroundColor,
  setQRForegroundColor,
  qrBackgroundColor,
  setQRBackgroundColor,
  showCustomization,
  setShowCustomization,
  qrImageDataUrl,
  qrCopied,
  setQRCopied,
  selectedExportFormat,
  setSelectedExportFormat,
  onDragStart,
}: QRGeneratorProps) {
  const handleCopy = async () => {
    if (qrImageDataUrl) {
      try {
        // Convert data URL to blob and copy as image
        const response = await fetch(qrImageDataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        setQRCopied(true);
        setTimeout(() => setQRCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy image:", err);
      }
    }
  };

  const handleExport = async () => {
    if (!qrImageDataUrl) return;

    const outputPath = await save({
      defaultPath: `qrcode-${qrType}.${selectedExportFormat.toLowerCase()}`,
      filters: [{ name: selectedExportFormat, extensions: [selectedExportFormat.toLowerCase()] }],
    });

    if (!outputPath) return;

    try {
      if (selectedExportFormat === "PNG") {
        const base64Data = qrImageDataUrl.split(",")[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        await invoke("save_binary_file", { path: outputPath, data: Array.from(bytes) });
      } else if (selectedExportFormat === "SVG") {
        const content = generateQRContent(qrType, qrData);
        const svgString = await QRCodeLib.toString(content, {
          type: "svg",
          color: { dark: qrForegroundColor, light: qrBackgroundColor },
          width: 300,
          margin: 2,
        });
        await invoke("save_text_file", { path: outputPath, content: svgString });
      } else if (selectedExportFormat === "PDF") {
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const imgWidth = 100;
        const imgX = (210 - imgWidth) / 2;
        const imgY = 50;
        pdf.addImage(qrImageDataUrl, "PNG", imgX, imgY, imgWidth, imgWidth);
        const pdfData = pdf.output("arraybuffer");
        await invoke("save_binary_file", { path: outputPath, data: Array.from(new Uint8Array(pdfData)) });
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  return (
    <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={onDragStart}>
      {/* Header */}
      <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center" data-drag-region>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-buncha-text-muted">QR Code Generator</span>
        </div>
        <button
          onClick={() => setShowCustomization(!showCustomization)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${showCustomization ? "bg-buncha-accent/20 text-buncha-accent" : "hover:bg-buncha-surface text-buncha-text-muted hover:text-buncha-text"}`}
        >
          <Palette className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6">
        <div className="flex gap-6">
          {/* Left Side - Input */}
          <div className="flex-1 space-y-5">
            {/* QR Type Selector */}
            <div>
              <label className="text-sm font-medium text-buncha-text-muted mb-3 block">QR Code Type</label>
              <div className="grid grid-cols-4 gap-2">
                {QR_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setQRType(type.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        qrType === type.id
                          ? "bg-buncha-accent/10 border-buncha-accent text-buncha-accent"
                          : "bg-buncha-surface/30 border-transparent hover:bg-buncha-surface/50 text-buncha-text-muted hover:text-buncha-text"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Input Fields */}
            <div className="space-y-3">
              {qrType === "url" && (
                <div>
                  <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Website URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={qrData.url.url}
                    onChange={(e) => setQRData({ ...qrData, url: { url: e.target.value } })}
                    className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                  />
                </div>
              )}

              {qrType === "wifi" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Network Name (SSID)</label>
                    <input
                      type="text"
                      placeholder="My WiFi Network"
                      value={qrData.wifi.ssid}
                      onChange={(e) => setQRData({ ...qrData, wifi: { ...qrData.wifi, ssid: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={qrData.wifi.password}
                      onChange={(e) => setQRData({ ...qrData, wifi: { ...qrData.wifi, password: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Security</label>
                    <select
                      value={qrData.wifi.encryption}
                      onChange={(e) => setQRData({ ...qrData, wifi: { ...qrData.wifi, encryption: e.target.value as "WPA" | "WEP" | "nopass" } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </div>
                </>
              )}

              {qrType === "email" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Email Address</label>
                    <input
                      type="email"
                      placeholder="hello@example.com"
                      value={qrData.email.email}
                      onChange={(e) => setQRData({ ...qrData, email: { ...qrData.email, email: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Subject (Optional)</label>
                    <input
                      type="text"
                      placeholder="Hello!"
                      value={qrData.email.subject}
                      onChange={(e) => setQRData({ ...qrData, email: { ...qrData.email, subject: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                </>
              )}

              {qrType === "phone" && (
                <div>
                  <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={qrData.phone.phone}
                    onChange={(e) => setQRData({ ...qrData, phone: { phone: e.target.value } })}
                    className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                  />
                </div>
              )}

              {qrType === "text" && (
                <div>
                  <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Text Content</label>
                  <textarea
                    rows={4}
                    placeholder="Enter any text you want to encode..."
                    value={qrData.text.text}
                    onChange={(e) => setQRData({ ...qrData, text: { text: e.target.value } })}
                    className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all resize-none"
                  />
                </div>
              )}

              {qrType === "vcard" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-buncha-text-muted mb-2 block">First Name</label>
                      <input
                        type="text"
                        placeholder="John"
                        value={qrData.vcard.firstName}
                        onChange={(e) => setQRData({ ...qrData, vcard: { ...qrData.vcard, firstName: e.target.value } })}
                        className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={qrData.vcard.lastName}
                        onChange={(e) => setQRData({ ...qrData, vcard: { ...qrData.vcard, lastName: e.target.value } })}
                        className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Phone</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={qrData.vcard.phone}
                      onChange={(e) => setQRData({ ...qrData, vcard: { ...qrData.vcard, phone: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Email</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={qrData.vcard.email}
                      onChange={(e) => setQRData({ ...qrData, vcard: { ...qrData.vcard, email: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                </>
              )}

              {qrType === "location" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Latitude</label>
                    <input
                      type="text"
                      placeholder="37.7749"
                      value={qrData.location.latitude}
                      onChange={(e) => setQRData({ ...qrData, location: { ...qrData.location, latitude: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Longitude</label>
                    <input
                      type="text"
                      placeholder="-122.4194"
                      value={qrData.location.longitude}
                      onChange={(e) => setQRData({ ...qrData, location: { ...qrData.location, longitude: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                </div>
              )}

              {qrType === "event" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Event Name</label>
                    <input
                      type="text"
                      placeholder="Team Meeting"
                      value={qrData.event.title}
                      onChange={(e) => setQRData({ ...qrData, event: { ...qrData.event, title: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Start</label>
                      <input
                        type="datetime-local"
                        value={qrData.event.startDate}
                        onChange={(e) => setQRData({ ...qrData, event: { ...qrData.event, startDate: e.target.value } })}
                        className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-buncha-text-muted mb-2 block">End</label>
                      <input
                        type="datetime-local"
                        value={qrData.event.endDate}
                        onChange={(e) => setQRData({ ...qrData, event: { ...qrData.event, endDate: e.target.value } })}
                        className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-buncha-text-muted mb-2 block">Location (Optional)</label>
                    <input
                      type="text"
                      placeholder="Conference Room A"
                      value={qrData.event.location}
                      onChange={(e) => setQRData({ ...qrData, event: { ...qrData.event, location: e.target.value } })}
                      className="w-full bg-buncha-surface/30 border border-buncha-border rounded-xl px-4 py-3 text-buncha-text placeholder:text-buncha-text-muted focus:outline-none focus:ring-2 focus:ring-buncha-accent/50 focus:border-buncha-accent transition-all"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Customization Panel */}
            {showCustomization && (
              <div className="bg-buncha-surface/20 border border-buncha-border rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-medium text-buncha-text">Customize Colors</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-buncha-text-muted mb-2 block">Foreground</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={qrForegroundColor}
                        onChange={(e) => setQRForegroundColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-buncha-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={qrForegroundColor}
                        onChange={(e) => setQRForegroundColor(e.target.value)}
                        className="flex-1 bg-buncha-surface/30 border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text uppercase"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-buncha-text-muted mb-2 block">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={qrBackgroundColor}
                        onChange={(e) => setQRBackgroundColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-buncha-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={qrBackgroundColor}
                        onChange={(e) => setQRBackgroundColor(e.target.value)}
                        className="flex-1 bg-buncha-surface/30 border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - QR Code Preview */}
          <div className="w-72 flex flex-col">
            <div className="bg-buncha-surface/20 border border-buncha-border rounded-2xl p-6 flex flex-col items-center">
              {/* QR Code Preview */}
              <div
                className="w-48 h-48 rounded-xl flex items-center justify-center mb-4 overflow-hidden"
                style={{ backgroundColor: qrBackgroundColor }}
              >
                {qrImageDataUrl ? (
                  <img src={qrImageDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-buncha-text-muted text-sm text-center px-4">
                    Enter data to generate QR code
                  </div>
                )}
              </div>

              <p className="text-xs text-buncha-text-muted text-center mb-4">QR code updates in real-time</p>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleCopy}
                  disabled={!qrImageDataUrl}
                  className="text-white flex-1 flex items-center justify-center gap-2 bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {qrCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span>{qrCopied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={!qrImageDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 bg-buncha-accent hover:bg-buncha-accent/90 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Export Options */}
            <div className="mt-4 bg-buncha-surface/20 border border-buncha-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-buncha-text mb-3">Export Format</h3>
              <div className="grid grid-cols-3 gap-2">
                {(["PNG", "SVG", "PDF"] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedExportFormat(format)}
                    className={`text-white px-3 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                      selectedExportFormat === format
                        ? "bg-buncha-accent text-white"
                        : "bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border hover:border-buncha-accent/50"
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
