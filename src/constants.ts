import {
  Link,
  Wifi,
  Mail,
  Phone,
  Type,
  User,
  MapPin,
  Calendar,
  LucideIcon,
  Sparkles,
  Zap,
  Film,
  Clapperboard,
  Settings2,
  Monitor,
  Smartphone,
  Video,
  Music,
  FileVideo,
} from "lucide-react";
import type { QRCodeType, QRCodeData, UnitCategory, VideoFormat, VideoQualityPreset, YouTubeQuality, YouTubeDownloadMode } from "./types";

// Video Converter Constants
export const VIDEO_FORMATS: VideoFormat[] = [
  { id: "mp4", name: "MP4", extension: ".mp4", description: "Most compatible" },
  { id: "webm", name: "WebM", extension: ".webm", description: "Web optimized" },
  { id: "mov", name: "MOV", extension: ".mov", description: "Apple format" },
  { id: "avi", name: "AVI", extension: ".avi", description: "Legacy format" },
  { id: "mkv", name: "MKV", extension: ".mkv", description: "High quality" },
  { id: "gif", name: "GIF", extension: ".gif", description: "Animated image" },
];

export const VIDEO_QUALITY_PRESETS: VideoQualityPreset[] = [
  { id: "original", name: "Original", description: "Keep original quality", bitrate: 0, resolution: "original" },
  { id: "high", name: "High", description: "1080p, high bitrate", bitrate: 8000, resolution: "1920x1080" },
  { id: "medium", name: "Medium", description: "720p, balanced", bitrate: 4000, resolution: "1280x720" },
  { id: "low", name: "Low", description: "480p, smaller file", bitrate: 2000, resolution: "854x480" },
  { id: "web", name: "Web", description: "Optimized for web", bitrate: 1500, resolution: "1280x720" },
];

export const VIDEO_QUALITY_ICONS: Record<string, LucideIcon> = {
  original: Sparkles,
  high: Zap,
  medium: Film,
  low: Clapperboard,
  web: Settings2,
};

export const VIDEO_RESOLUTIONS = ["Keep Original", "4K", "1080p", "720p", "480p"];
export const VIDEO_FRAMERATES = ["Keep Original", "60 fps", "30 fps", "24 fps"];
export const VIDEO_CODECS = ["H.264", "H.265", "VP9", "AV1"];

export const VIDEO_FILE_FILTERS = [
  { name: "Video", extensions: ["mp4", "avi", "mov", "mkv", "webm", "wmv", "flv", "m4v"] }
];

// Common ports for port killer
export const COMMON_PORTS = [3000, 3001, 5173, 8080, 8000, 4200, 5000, 1420];

// QR Code types
export const QR_TYPES: { id: QRCodeType; label: string; icon: LucideIcon }[] = [
  { id: "url", label: "URL", icon: Link },
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "text", label: "Text", icon: Type },
  { id: "vcard", label: "Contact", icon: User },
  { id: "location", label: "Location", icon: MapPin },
  { id: "event", label: "Event", icon: Calendar },
];

export const DEFAULT_QR_DATA: QRCodeData = {
  url: { url: "" },
  wifi: { ssid: "", password: "", encryption: "WPA" },
  email: { email: "", subject: "" },
  phone: { phone: "" },
  text: { text: "" },
  vcard: { firstName: "", lastName: "", phone: "", email: "" },
  location: { latitude: "", longitude: "" },
  event: { title: "", location: "", startDate: "", endDate: "" },
};

// Language code to name mapping
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ru: "Russian",
  ar: "Arabic",
};

// Unit conversion definitions
export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  length: {
    units: {
      meters: 1,
      kilometers: 1000,
      centimeters: 0.01,
      millimeters: 0.001,
      miles: 1609.344,
      yards: 0.9144,
      feet: 0.3048,
      inches: 0.0254,
    },
    aliases: {
      m: "meters", meter: "meters", metre: "meters", metres: "meters",
      km: "kilometers", kilometer: "kilometers", kilometre: "kilometres",
      cm: "centimeters", centimeter: "centimeters",
      mm: "millimeters", millimeter: "millimeters",
      mi: "miles", mile: "miles",
      yd: "yards", yard: "yards",
      ft: "feet", foot: "feet",
      in: "inches", inch: "inches",
    },
  },
  weight: {
    units: {
      kilograms: 1,
      grams: 0.001,
      milligrams: 0.000001,
      pounds: 0.453592,
      ounces: 0.0283495,
      tons: 1000,
    },
    aliases: {
      kg: "kilograms", kilogram: "kilograms", kilo: "kilograms", kilos: "kilograms",
      g: "grams", gram: "grams",
      mg: "milligrams", milligram: "milligrams",
      lb: "pounds", lbs: "pounds", pound: "pounds",
      oz: "ounces", ounce: "ounces",
      ton: "tons", t: "tons",
    },
  },
  temperature: {
    units: { celsius: 1, fahrenheit: 1, kelvin: 1 },
    aliases: {
      c: "celsius", "°c": "celsius",
      f: "fahrenheit", "°f": "fahrenheit",
      k: "kelvin",
    },
  },
  volume: {
    units: {
      liters: 1,
      milliliters: 0.001,
      gallons: 3.78541,
      quarts: 0.946353,
      pints: 0.473176,
      cups: 0.236588,
    },
    aliases: {
      l: "liters", liter: "liters", litre: "liters", litres: "liters",
      ml: "milliliters", milliliter: "milliliters",
      gal: "gallons", gallon: "gallons",
      qt: "quarts", quart: "quarts",
      pt: "pints", pint: "pints",
      cup: "cups",
    },
  },
  time: {
    units: {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
      weeks: 604800,
    },
    aliases: {
      s: "seconds", sec: "seconds", second: "seconds",
      min: "minutes", minute: "minutes", mins: "minutes",
      h: "hours", hr: "hours", hour: "hours", hrs: "hours",
      d: "days", day: "days",
      w: "weeks", week: "weeks", wk: "weeks",
    },
  },
};

// Default conversion targets for each unit (most common conversions)
export const DEFAULT_UNIT_TARGETS: Record<string, string> = {
  // Length - metric to imperial and vice versa
  meters: "feet", feet: "meters", kilometers: "miles", miles: "kilometers",
  centimeters: "inches", inches: "centimeters", millimeters: "inches",
  yards: "meters",
  // Weight
  kilograms: "pounds", pounds: "kilograms", grams: "ounces", ounces: "grams",
  milligrams: "grams", tons: "pounds",
  // Temperature
  fahrenheit: "celsius", celsius: "fahrenheit", kelvin: "celsius",
  // Volume
  liters: "gallons", gallons: "liters", milliliters: "cups",
  cups: "milliliters", quarts: "liters", pints: "liters",
  // Time
  seconds: "minutes", minutes: "hours", hours: "minutes",
  days: "hours", weeks: "days",
};

// Common currency aliases
export const CURRENCY_ALIASES: Record<string, string> = {
  // Names to codes
  dollar: "USD", dollars: "USD", usd: "USD",
  euro: "EUR", euros: "EUR", eur: "EUR",
  pound: "GBP", pounds: "GBP", gbp: "GBP", sterling: "GBP",
  yen: "JPY", jpy: "JPY",
  yuan: "CNY", cny: "CNY", rmb: "CNY", renminbi: "CNY",
  won: "KRW", krw: "KRW",
  rupee: "INR", rupees: "INR", inr: "INR",
  franc: "CHF", francs: "CHF", chf: "CHF",
  real: "BRL", reais: "BRL", brl: "BRL",
  peso: "MXN", pesos: "MXN", mxn: "MXN",
  ruble: "RUB", rubles: "RUB", rub: "RUB",
  lira: "TRY", try: "TRY",
  rand: "ZAR", zar: "ZAR",
  krona: "SEK", kronor: "SEK", sek: "SEK",
  krone: "NOK", kroner: "NOK", nok: "NOK",
  // Direct codes
  aud: "AUD", cad: "CAD", nzd: "NZD", sgd: "SGD", hkd: "HKD",
  dkk: "DKK", pln: "PLN", czk: "CZK", huf: "HUF", ils: "ILS",
  thb: "THB", myr: "MYR", php: "PHP", idr: "IDR",
};

// YouTube Downloader Constants
export const YOUTUBE_QUALITY_OPTIONS: { id: YouTubeQuality; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'best', label: 'Best', description: 'Highest available', icon: Sparkles },
  { id: '4k', label: '4K', description: '2160p Ultra HD', icon: Monitor },
  { id: '1080p', label: '1080p', description: 'Full HD', icon: Zap },
  { id: '720p', label: '720p', description: 'HD', icon: Film },
  { id: '480p', label: '480p', description: 'Standard', icon: Clapperboard },
  { id: '360p', label: '360p', description: 'Low', icon: Smartphone },
];

export const YOUTUBE_DOWNLOAD_MODES: { id: YouTubeDownloadMode; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'video_audio', label: 'Video + Audio', description: 'Full video with sound', icon: Video },
  { id: 'audio_only', label: 'Audio Only', description: 'Extract audio (MP3)', icon: Music },
  { id: 'video_only', label: 'Video Only', description: 'Video without audio', icon: FileVideo },
];
