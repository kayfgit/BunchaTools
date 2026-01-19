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
}

export type ConverterType = "image" | "audio" | "video";

export interface SelectedFile {
  name: string;
  path: string;
  size: number;
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
