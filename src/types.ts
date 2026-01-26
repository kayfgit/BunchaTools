import { LucideIcon } from "lucide-react";

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  action?: () => Promise<void>;
  isSettings?: boolean;
}

export interface Settings {
  hotkey_modifiers: string[];
  hotkey_key: string;
  launch_at_startup: boolean;
  show_in_tray: boolean;
  automatic_updates: boolean;
  theme: "dark" | "light" | "system";
  // Quick Translation settings
  quick_translation_hotkey_modifiers: string[];
  quick_translation_hotkey_key: string;
  quick_translation_target_language: string;
}

// Video Converter Types
export interface VideoFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
}

export interface VideoQualityPreset {
  id: string;
  name: string;
  description: string;
  bitrate: number; // in kbps, 0 for original
  resolution: string; // e.g., "1920x1080" or "original"
}

export interface VideoAdvancedSettings {
  resolution: string;
  frameRate: string;
  codec: string;
  keepAudio: boolean;
}

export interface VideoFileMetadata {
  name: string;
  path: string;
  size: number;
  duration: number; // in seconds
  width: number;
  height: number;
  frameRate: number;
  codec: string;
}

export interface PortProcess {
  pid: number;
  name: string;
  port: number;
  protocol: string;
}

export interface CurrencyResult {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
}

export interface CurrencyQuery {
  amount: number;
  from: string;
  to: string;
}

export interface TranslationResult {
  translated_text: string;
  detected_language: string;
  target_language: string;
}

export type QRCodeType = "url" | "wifi" | "email" | "phone" | "text" | "vcard" | "location" | "event";

export interface QRCodeData {
  url: { url: string };
  wifi: { ssid: string; password: string; encryption: "WPA" | "WEP" | "nopass" };
  email: { email: string; subject: string };
  phone: { phone: string };
  text: { text: string };
  vcard: { firstName: string; lastName: string; phone: string; email: string };
  location: { latitude: string; longitude: string };
  event: { title: string; location: string; startDate: string; endDate: string };
}

export interface ColorFormats {
  hex: string;
  rgb: string;
  hsl: string;
  hsv: string;
  oklch: string;
  cmyk: string;
  lab: string;
  xyz: string;
}

export interface UnitCategory {
  units: Record<string, number>;
  aliases: Record<string, string>;
}

export interface UnitConversionResult {
  amount: number;
  fromUnit: string;
  toUnit: string;
  result: number;
  category: string;
}

export interface QuickResult {
  type: "calculator" | "unit" | "currency" | "color";
  query: string;
  result: string;
  icon: LucideIcon;
  copyValue: string;
  isPreview?: boolean;
  colorPreview?: string;
}

export interface PartialUnitSuggestion {
  amount: number;
  fromUnit: string;
  toUnit: string;
  suggestedQuery: string;
}

export interface PartialCurrencySuggestion {
  amount: number;
  from: string;
  to: string;
  suggestedQuery: string;
}

// Git Downloader Types
export interface GitHubUrlInfo {
  owner: string;
  repo: string;
  branch: string;
  path: string; // folder path within repo (empty for root)
  isValid: boolean;
  fullUrl: string;
}

export interface GitDownloadOptions {
  extractFiles: boolean; // true = extract, false = keep as ZIP
  flattenStructure: boolean; // true = all files in root, no subdirs
  createSubfolder: boolean; // create folder with repo/folder name
}

export interface GitDownloadProgress {
  stage: 'idle' | 'fetching' | 'downloading' | 'extracting' | 'complete' | 'error';
  percent: number;
  message: string;
  totalFiles?: number;
  processedFiles?: number;
  errorMessage?: string;
  outputPath?: string;
}

export interface GitDownloadResult {
  success: boolean;
  files_count: number;
  total_size: number;
  output_path: string;
}
