import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  Search,
  X,
  Loader2,
  ArrowDown,
  Image,
  Music,
  Video,
  FileText,
  Upload,
  Check,
  Monitor,
  AlertCircle,
  Copy,
  File,
  ArrowRight,
  Repeat2,
  Network,
  Languages,
  Pipette,
  Settings as SettingsIcon,
  LucideIcon,
  DollarSign,
  Calculator,
  Ruler,
  ExternalLink,
  Volume2,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  action?: () => Promise<void>;
  isSettings?: boolean;
}

interface Settings {
  hotkey_modifiers: string[];
  hotkey_key: string;
  launch_at_startup: boolean;
  show_in_tray: boolean;
  automatic_updates: boolean;
  theme: "dark" | "light" | "system";
}

// Format options for converter
const FORMAT_OPTIONS = {
  image: ["PNG", "JPG", "WEBP", "GIF", "BMP", "ICO"],
  audio: ["MP3", "WAV", "FLAC", "AAC", "OGG", "M4A"],
  video: ["MP4", "AVI", "MOV", "GIF", "WEBM", "MKV"],
};

// File type filters for open dialog
const FILE_FILTERS = {
  image: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "tiff"] }],
  audio: [{ name: "Audio", extensions: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"] }],
  video: [{ name: "Video", extensions: ["mp4", "avi", "mov", "mkv", "webm", "wmv", "flv"] }],
};

type ConverterType = "image" | "audio" | "video";

interface SelectedFile {
  name: string;
  path: string;
  size: number;
}

interface PortProcess {
  pid: number;
  name: string;
  port: number;
  protocol: string;
}

const COMMON_PORTS = [3000, 3001, 5173, 8080, 8000, 4200, 5000, 1420];

// Currency conversion
interface CurrencyResult {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
}

interface CurrencyQuery {
  amount: number;
  from: string;
  to: string;
}

interface TranslationResult {
  translated_text: string;
  detected_language: string;
  target_language: string;
}

// Color formats for color picker
interface ColorFormats {
  hex: string;
  rgb: string;
  hsl: string;
  hsv: string;
  oklch: string;
  cmyk: string;
  lab: string;
  xyz: string;
}

// Color conversion utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

  rr *= 100;
  gg *= 100;
  bb *= 100;

  return {
    x: Math.round(rr * 0.4124 + gg * 0.3576 + bb * 0.1805),
    y: Math.round(rr * 0.2126 + gg * 0.7152 + bb * 0.0722),
    z: Math.round(rr * 0.0193 + gg * 0.1192 + bb * 0.9505),
  };
}

function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const xyz = rgbToXyz(r, g, b);
  let x = xyz.x / 95.047;
  let y = xyz.y / 100.0;
  let z = xyz.z / 108.883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  return {
    l: Math.round(116 * y - 16),
    a: Math.round(500 * (x - y)),
    b: Math.round(200 * (y - z)),
  };
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  if (r === 0 && g === 0 && b === 0) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const k = 1 - Math.max(rr, gg, bb);
  const c = (1 - rr - k) / (1 - k);
  const m = (1 - gg - k) / (1 - k);
  const y = (1 - bb - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
  // Convert RGB to linear RGB
  const toLinear = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // RGB to OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l__ = Math.cbrt(l_);
  const m__ = Math.cbrt(m_);
  const s__ = Math.cbrt(s_);

  const L = 0.2104542553 * l__ + 0.793617785 * m__ - 0.0040720468 * s__;
  const a = 1.9779984951 * l__ - 2.428592205 * m__ + 0.4505937099 * s__;
  const bb_ = 0.0259040371 * l__ + 0.7827717662 * m__ - 0.808675766 * s__;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bb_ * bb_);
  let H = Math.atan2(bb_, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 100),
    c: parseFloat(C.toFixed(2)),
    h: Math.round(H),
  };
}

function convertHexToFormats(hex: string): ColorFormats {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);

  return {
    hex: hex.toUpperCase(),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    oklch: `oklch(${oklch.l}% ${oklch.c} ${oklch.h})`,
    cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    lab: `lab(${lab.l}% ${lab.a} ${lab.b})`,
    xyz: `xyz(${xyz.x}%, ${xyz.y}%, ${xyz.z}%)`,
  };
}

// Language code to name mapping
const LANGUAGE_NAMES: Record<string, string> = {
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
interface UnitCategory {
  units: Record<string, number>; // unit name -> conversion factor to base unit
  aliases: Record<string, string>; // alias -> unit name
}

const UNIT_CATEGORIES: Record<string, UnitCategory> = {
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

interface UnitConversionResult {
  amount: number;
  fromUnit: string;
  toUnit: string;
  result: number;
  category: string;
}

// Parse unit conversion query like "10 feet to meters"
function parseUnitQuery(query: string): UnitConversionResult | null {
  const cleaned = query.toLowerCase().trim();
  const match = cleaned.match(/^([\d.,]+)\s*([a-z°]+)\s+(?:in|to)\s+([a-z°]+)$/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(",", "."));
  if (isNaN(amount)) return null;

  const fromInput = match[2];
  const toInput = match[3];

  // Find units in categories
  for (const [categoryName, category] of Object.entries(UNIT_CATEGORIES)) {
    const fromUnit = category.aliases[fromInput] || (category.units[fromInput] ? fromInput : null);
    const toUnit = category.aliases[toInput] || (category.units[toInput] ? toInput : null);

    if (fromUnit && toUnit && category.units[fromUnit] && category.units[toUnit]) {
      let result: number;

      // Special handling for temperature
      if (categoryName === "temperature") {
        if (fromUnit === "celsius" && toUnit === "fahrenheit") {
          result = (amount * 9/5) + 32;
        } else if (fromUnit === "fahrenheit" && toUnit === "celsius") {
          result = (amount - 32) * 5/9;
        } else if (fromUnit === "celsius" && toUnit === "kelvin") {
          result = amount + 273.15;
        } else if (fromUnit === "kelvin" && toUnit === "celsius") {
          result = amount - 273.15;
        } else if (fromUnit === "fahrenheit" && toUnit === "kelvin") {
          result = (amount - 32) * 5/9 + 273.15;
        } else if (fromUnit === "kelvin" && toUnit === "fahrenheit") {
          result = (amount - 273.15) * 9/5 + 32;
        } else {
          result = amount; // Same unit
        }
      } else {
        // Standard conversion: amount * fromFactor / toFactor
        const fromFactor = category.units[fromUnit];
        const toFactor = category.units[toUnit];
        result = (amount * fromFactor) / toFactor;
      }

      return { amount, fromUnit, toUnit, result, category: categoryName };
    }
  }

  return null;
}

// Quick result interface for unified display
interface QuickResult {
  type: "calculator" | "unit" | "currency";
  query: string;
  result: string;
  icon: LucideIcon;
  copyValue: string;
  isPreview?: boolean; // True if this is a suggested preview
}

// Default conversion targets for each unit (most common conversions)
const DEFAULT_UNIT_TARGETS: Record<string, string> = {
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

// Build a map of all unit names/aliases for fuzzy matching
function getAllUnitNames(): string[] {
  const names: string[] = [];
  for (const category of Object.values(UNIT_CATEGORIES)) {
    names.push(...Object.keys(category.units));
    names.push(...Object.keys(category.aliases));
  }
  return [...new Set(names)]; // Remove duplicates
}

// Find the canonical unit name from an alias
function getCanonicalUnit(input: string): string | null {
  for (const category of Object.values(UNIT_CATEGORIES)) {
    if (category.units[input]) return input;
    if (category.aliases[input]) return category.aliases[input];
  }
  return null;
}

// Parse partial unit query like "10 fahr" and suggest completion
interface PartialUnitSuggestion {
  amount: number;
  fromUnit: string;
  toUnit: string;
  suggestedQuery: string;
}

function parsePartialUnitQuery(query: string): PartialUnitSuggestion | null {
  const cleaned = query.toLowerCase().trim();

  // Match patterns like "10 fahr" or "10fahr" (number followed by partial unit name)
  const match = cleaned.match(/^([\d.,]+)\s*([a-z°]+)$/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  const partialUnit = match[2];
  if (partialUnit.length < 2) return null; // Need at least 2 chars to suggest

  // Find matching units that start with the partial input
  const allUnits = getAllUnitNames();
  const matches = allUnits.filter(u => u.startsWith(partialUnit) && u !== partialUnit);

  if (matches.length === 0) return null;

  // Sort by length (prefer shorter/more common units) and take the first match
  matches.sort((a, b) => a.length - b.length);
  const bestMatch = matches[0];

  // Get canonical unit name
  const fromUnit = getCanonicalUnit(bestMatch);
  if (!fromUnit) return null;

  // Get default target
  const toUnit = DEFAULT_UNIT_TARGETS[fromUnit];
  if (!toUnit) return null;

  return {
    amount,
    fromUnit,
    toUnit,
    suggestedQuery: `${amount} ${fromUnit} to ${toUnit}`,
  };
}

// Parse partial currency query like "10 yen" and suggest completion
// This will be called after CURRENCY_ALIASES is defined
interface PartialCurrencySuggestion {
  amount: number;
  from: string;
  to: string;
  suggestedQuery: string;
}

// Common currency aliases
const CURRENCY_ALIASES: Record<string, string> = {
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

// Get all currency names/aliases for fuzzy matching
function getAllCurrencyNames(): string[] {
  return Object.keys(CURRENCY_ALIASES);
}

// Parse partial currency query and suggest completion to USD (global standard)
function parsePartialCurrencyQuery(query: string): PartialCurrencySuggestion | null {
  const cleaned = query.toLowerCase().trim();

  // Match patterns like "10 yen" or "10yen" (number followed by currency name)
  const match = cleaned.match(/^([\d.,]+)\s*([a-z]+)$/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  const partialCurrency = match[2];
  if (partialCurrency.length < 2) return null;

  // Find matching currencies that start with the partial input
  const allCurrencies = getAllCurrencyNames();
  const matches = allCurrencies.filter(c => c.startsWith(partialCurrency) && c !== partialCurrency);

  // Also check for exact matches (e.g., "yen" is complete)
  const exactMatch = CURRENCY_ALIASES[partialCurrency];

  if (matches.length === 0 && !exactMatch) return null;

  // Prefer exact match, otherwise use the first partial match
  let currencyName: string;
  if (exactMatch) {
    currencyName = partialCurrency;
  } else {
    // Sort by length (prefer shorter names) and take the first
    matches.sort((a, b) => a.length - b.length);
    currencyName = matches[0];
  }

  const fromCode = CURRENCY_ALIASES[currencyName];
  if (!fromCode) return null;

  // Default target is USD (global standard), unless from is USD then use EUR
  const toCode = fromCode === "USD" ? "EUR" : "USD";
  const toName = toCode.toLowerCase();

  return {
    amount,
    from: fromCode,
    to: toCode,
    suggestedQuery: `${amount} ${currencyName} to ${toName}`,
  };
}

// Parse currency query like "20 usd in yen" or "100 eur to usd"
function parseCurrencyQuery(query: string): CurrencyQuery | null {
  const cleaned = query.toLowerCase().trim();

  // Pattern: <amount> <currency> (in|to) <currency>
  const match = cleaned.match(/^([\d.,]+)\s*([a-z]+)\s+(?:in|to)\s+([a-z]+)$/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;

  const fromInput = match[2];
  const toInput = match[3];

  const from = CURRENCY_ALIASES[fromInput] || fromInput.toUpperCase();
  const to = CURRENCY_ALIASES[toInput] || toInput.toUpperCase();

  // Basic validation - currency codes are 3 letters
  if (from.length !== 3 || to.length !== 3) return null;
  if (from === to) return null;

  return { amount, from, to };
}

// Safe calculator function that evaluates basic math expressions
function evaluateExpression(expr: string): string | null {
  // Remove all spaces
  const cleaned = expr.replace(/\s/g, "");

  // Check if it looks like a math expression (must contain at least one operator)
  if (!/^[\d.]+[+\-*/^][\d.+\-*/^()]+$/.test(cleaned) && !/^\(.*\)$/.test(cleaned)) {
    // Also check for expressions starting with negative numbers or parentheses
    if (!/^-?[\d.]+[+\-*/^]/.test(cleaned) && !/^\(/.test(cleaned)) {
      return null;
    }
  }

  // Only allow safe characters: digits, operators, parentheses, decimal point
  if (!/^[\d+\-*/^().]+$/.test(cleaned)) {
    return null;
  }

  try {
    // Replace ^ with ** for exponentiation
    const withPower = cleaned.replace(/\^/g, "**");

    // Use Function constructor for safer evaluation (still sandboxed to math)
    // This is safer than eval() as it doesn't have access to local scope
    const result = new Function(`"use strict"; return (${withPower})`)();

    // Check if result is a valid number
    if (typeof result !== "number" || !isFinite(result)) {
      return null;
    }

    // Format the result (limit decimal places, add thousand separators with dots)
    const rounded = Number.isInteger(result)
      ? result
      : parseFloat(result.toFixed(10));

    // Format with dots as thousand separators
    const formatted = rounded.toLocaleString('de-DE');

    return formatted;
  } catch {
    return null;
  }
}

function App() {
  const [query, setQuery] = useState("");
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    hotkey_modifiers: ["Alt"],
    hotkey_key: "Q",
    launch_at_startup: false,
    show_in_tray: true,
    automatic_updates: false,
    theme: "dark",
  });
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hotkeyInputRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const settingsInitialized = useRef(false);

  // Converter state
  const [showConverter, setShowConverter] = useState(false);
  const [converterType, setConverterType] = useState<ConverterType | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [targetFormat, setTargetFormat] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');

  // Port killer state
  const [showPortKiller, setShowPortKiller] = useState(false);
  const [portInput, setPortInput] = useState("");
  const [portProcesses, setPortProcesses] = useState<PortProcess[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPort, setScannedPort] = useState<number | null>(null);

  // Currency converter state
  const [currencyResult, setCurrencyResult] = useState<CurrencyResult | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [lastCurrencyQuery, setLastCurrencyQuery] = useState<string>("");

  // Quick Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationInput, setTranslationInput] = useState("");
  const [translationOutput, setTranslationOutput] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("Detecting...");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslationSettingsOpen, setIsTranslationSettingsOpen] = useState(false);

  // Quick result state (calculator, unit conversion, currency)
  const [quickResult, setQuickResult] = useState<QuickResult | null>(null);

  // Color Picker Details state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickedColor, setPickedColor] = useState<ColorFormats | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Define tools
  const tools: Tool[] = [
    {
      id: "color-picker",
      name: "Color Picker",
      description: "Pick any color from your screen",
      icon: Pipette,
      keywords: ["color", "picker", "eyedropper", "hex", "rgb", "colour"],
      action: async () => {
        try {
          const color = await invoke<string>("pick_color");
          const formats = convertHexToFormats(color);
          setPickedColor(formats);
          setCopiedFormat(null);
          setShowColorPicker(true);
          setQuery("");
          await invoke("set_auto_hide", { enabled: true });
          await invoke("show_window");
        } catch (e) {
          if (e !== "Cancelled") {
            console.error("Color picker error:", e);
          }
        }
      },
    },
    {
      id: "omni-converter",
      name: "Omni Converter",
      description: "Convert images, audio, and video files",
      icon: Repeat2,
      keywords: ["convert", "converter", "video", "audio", "image", "mp4", "mp3", "png", "jpg", "wav", "gif", "webp", "avi", "mkv"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowConverter(true);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
        setQuery("");
      },
    },
    {
      id: "port-killer",
      name: "Port Killer",
      description: "Free up ports that didn't close properly",
      icon: Network,
      keywords: ["port", "kill", "process", "free", "localhost", "server", "3000", "8080", "1420", "network", "tcp"],
      action: async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowPortKiller(true);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
        setQuery("");
      },
    },
    {
      id: "quick-translation",
      name: "Quick Translate",
      description: "Instant translation of highlighted text",
      icon: Languages,
      keywords: ["translate", "translation", "language", "japanese", "english", "spanish", "french", "german", "chinese", "korean"],
      action: async () => {
        setQuery("");
        // Reset translation state
        setTranslationInput("");
        setTranslationOutput("");
        setDetectedLanguage("Detecting...");
        setTranslationError(null);
        setIsTranslating(false);

        try {
          // Start text selection mode - window hides, cursor changes to I-beam
          // User selects text, Ctrl+C is simulated, window shows after mouse release
          await invoke("start_text_selection");

          // Read the copied text from clipboard
          const clipboardText = await readText();

          if (clipboardText && clipboardText.trim()) {
            setTranslationInput(clipboardText);
            setShowTranslation(true);

            // Start translation immediately
            setIsTranslating(true);
            try {
              const result = await invoke<TranslationResult>("translate_text", {
                text: clipboardText,
                targetLang: targetLanguage,
              });
              setTranslationOutput(result.translated_text);
              setDetectedLanguage(result.detected_language);
              setIsTranslating(false);
            } catch (translationErr) {
              setTranslationError(String(translationErr));
              setIsTranslating(false);
            }
          } else {
            // No text was selected/copied
            setShowTranslation(true);
            setTranslationInput("");
            setDetectedLanguage("No text selected");
          }
        } catch (e) {
          // User cancelled (pressed Escape), don't show translation window
          if (e !== "Cancelled") {
            console.error("Text selection error:", e);
          }
        }
      },
    },
    {
      id: "settings",
      name: "Settings",
      description: "Configure BunchaTools preferences",
      icon: SettingsIcon,
      keywords: ["settings", "preferences", "config", "options", "hotkey", "startup"],
      isSettings: true,
    },
  ];

  // Load settings on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const s = await invoke<Settings>("get_settings");
        setSettings(s);
        // Mark as initialized after a tick to avoid triggering auto-save
        setTimeout(() => {
          settingsInitialized.current = true;
        }, 0);
      } catch (e) {
        console.error("Failed to initialize:", e);
      }
    };
    initialize();
  }, []);

  // Auto-save settings when they change
  useEffect(() => {
    if (!settingsInitialized.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        await invoke("save_settings", { settings });
      } catch (e) {
        console.error("Failed to auto-save settings:", e);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [settings]);

  // Listen for conversion progress events
  useEffect(() => {
    const unlisten = listen<number>("conversion-progress", (event) => {
      setConversionProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen("focus-search", async () => {
      await invoke("set_auto_hide", { enabled: true });
      setQuery("");
      setSelectedIndex(0);
      setStatus(null);
      setShowSettings(false);
      setShowConverter(false);
      setConverterType(null);
      setSelectedFile(null);
      setTargetFormat(null);
      setShowPortKiller(false);
      setPortInput("");
      setPortProcesses([]);
      setScannedPort(null);
      setCurrencyResult(null);
      setLastCurrencyQuery("");
      setShowTranslation(false);
      setTranslationInput("");
      setTranslationOutput("");
      setDetectedLanguage("Detecting...");
      setTranslationError(null);
      setIsTranslationSettingsOpen(false);
      setShowColorPicker(false);
      setPickedColor(null);
      setCopiedFormat(null);
      inputRef.current?.focus();
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (query.trim() === "") {
      setFilteredTools(tools);
      setSelectedIndex(0);
      setQuickResult(null);
      setCurrencyResult(null);
      setLastCurrencyQuery("");
    } else {
      const q = query.toLowerCase();
      const filtered = tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q) ||
          tool.keywords.some((k) => k.includes(q))
      );
      setFilteredTools(filtered);
      setSelectedIndex(0);

      // Check for calculator result first
      const calcResult = evaluateExpression(query);
      if (calcResult) {
        setQuickResult({
          type: "calculator",
          query: query,
          result: calcResult,
          icon: Calculator,
          copyValue: calcResult.replace(/\./g, "").replace(/,/g, "."), // Convert from de-DE format to number
        });
        setCurrencyResult(null);
        return;
      }

      // Check for unit conversion
      const unitResult = parseUnitQuery(query);
      if (unitResult) {
        const formattedResult = unitResult.result.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3,
        });
        setQuickResult({
          type: "unit",
          query: query,
          result: `${formattedResult} ${unitResult.toUnit}`,
          icon: Ruler,
          copyValue: unitResult.result.toString(),
        });
        setCurrencyResult(null);
        return;
      }

      // Check for currency query
      const currencyQuery = parseCurrencyQuery(query);
      if (currencyQuery && query !== lastCurrencyQuery) {
        setLastCurrencyQuery(query);
        setCurrencyLoading(true);
        setQuickResult(null);
        invoke<CurrencyResult>("convert_currency", {
          amount: currencyQuery.amount,
          from: currencyQuery.from,
          to: currencyQuery.to,
        })
          .then((result) => {
            setCurrencyResult(result);
            setCurrencyLoading(false);
            // Set quick result for currency
            const formattedResult = result.result.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            setQuickResult({
              type: "currency",
              query: query,
              result: `${formattedResult} ${result.to}`,
              icon: DollarSign,
              copyValue: result.result.toFixed(2),
            });
          })
          .catch(() => {
            setCurrencyResult(null);
            setCurrencyLoading(false);
            setQuickResult(null);
          });
      } else if (currencyQuery && currencyResult) {
        // Keep existing currency quick result
        const formattedResult = currencyResult.result.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setQuickResult({
          type: "currency",
          query: query,
          result: `${formattedResult} ${currencyResult.to}`,
          icon: DollarSign,
          copyValue: currencyResult.result.toFixed(2),
        });
      } else if (!currencyQuery) {
        setCurrencyResult(null);

        // No exact match found - check for partial queries and show preview
        // Check for partial unit query (e.g., "10 fahr" → "10 fahrenheit to celsius")
        const partialUnit = parsePartialUnitQuery(query);
        if (partialUnit) {
          // Compute the result for the suggested query
          const suggestedResult = parseUnitQuery(partialUnit.suggestedQuery);
          if (suggestedResult) {
            const formattedResult = suggestedResult.result.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 3,
            });
            setQuickResult({
              type: "unit",
              query: partialUnit.suggestedQuery,
              result: `${formattedResult} ${suggestedResult.toUnit}`,
              icon: Ruler,
              copyValue: suggestedResult.result.toString(),
              isPreview: true,
            });
            return;
          }
        }

        // Check for partial currency query (e.g., "10 yen" → "10 yen to usd")
        const partialCurrency = parsePartialCurrencyQuery(query);
        if (partialCurrency) {
          // Show loading state for currency preview
          setCurrencyLoading(true);
          invoke<CurrencyResult>("convert_currency", {
            amount: partialCurrency.amount,
            from: partialCurrency.from,
            to: partialCurrency.to,
          })
            .then((result) => {
              setCurrencyLoading(false);
              const formattedResult = result.result.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              setQuickResult({
                type: "currency",
                query: partialCurrency.suggestedQuery,
                result: `${formattedResult} ${result.to}`,
                icon: DollarSign,
                copyValue: result.result.toFixed(2),
                isPreview: true,
              });
            })
            .catch(() => {
              setCurrencyLoading(false);
              setQuickResult(null);
            });
          return;
        }

        setQuickResult(null);
      }
    }
  }, [query]);

  // Resize window based on active view
  useEffect(() => {
    const resizeWindow = async () => {
      const appWindow = getCurrentWindow();
      let height = 500; // Default height for command palette
      let width = 680; // Default width

      if (showConverter) {
        height = 450;
      } else if (showPortKiller) {
        height = 450;
      } else if (showTranslation) {
        height = isTranslationSettingsOpen ? 480 : 400;
      } else if (showSettings) {
        height = 460;
      } else if (showColorPicker) {
        height = 600;
        width = 880;
      }

      await appWindow.setSize(new LogicalSize(width, height));
    };
    resizeWindow();
  }, [showSettings, showConverter, showPortKiller, showTranslation, isTranslationSettingsOpen, showColorPicker]);

  const executeTool = async (tool: Tool) => {
    if (tool.isSettings) {
      setShowSettings(true);
      setQuery("");
    } else if (tool.action) {
      setQuery("");
      await tool.action();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showConverter) {
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
      } else if (showPortKiller) {
        setShowPortKiller(false);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
      } else if (showTranslation) {
        setShowTranslation(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else {
        invoke("hide_window");
        setQuery("");
      }
    } else if (!showSettings && !showConverter && !showPortKiller && !showTranslation) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredTools.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && filteredTools.length > 0) {
        e.preventDefault();
        await executeTool(filteredTools[selectedIndex]);
      }
    }
  };

  const handleHotkeyKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setIsRecordingHotkey(false);
      return;
    }

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    // Use e.code for reliable key detection (works better with Alt combinations)
    const code = e.code;
    let mappedKey = "";

    // Handle letter keys (KeyA, KeyB, etc.)
    if (code.startsWith("Key")) {
      mappedKey = code.substring(3); // "KeyQ" -> "Q"
    }
    // Handle digit keys (Digit0, Digit1, etc.)
    else if (code.startsWith("Digit")) {
      mappedKey = code.substring(5); // "Digit1" -> "1"
    }
    // Handle numpad keys
    else if (code.startsWith("Numpad") && code.length > 6) {
      const numpadPart = code.substring(6);
      if (/^\d$/.test(numpadPart)) {
        mappedKey = "Num" + numpadPart;
      } else {
        mappedKey = "Num" + numpadPart;
      }
    }
    // Handle function keys
    else if (/^F\d{1,2}$/.test(code)) {
      mappedKey = code;
    }
    // Handle special keys
    else {
      const specialKeys: Record<string, string> = {
        Space: "Space",
        Enter: "Enter",
        Tab: "Tab",
        Backspace: "Backspace",
        Delete: "Delete",
        Insert: "Insert",
        Home: "Home",
        End: "End",
        PageUp: "PageUp",
        PageDown: "PageDown",
        ArrowUp: "Up",
        ArrowDown: "Down",
        ArrowLeft: "Left",
        ArrowRight: "Right",
        Backquote: "`",
        Minus: "-",
        Equal: "=",
        BracketLeft: "[",
        BracketRight: "]",
        Backslash: "\\",
        Semicolon: ";",
        Quote: "'",
        Comma: ",",
        Period: ".",
        Slash: "/",
      };
      mappedKey = specialKeys[code] || "";
    }

    // Skip if only modifiers were pressed or no valid key
    if (!mappedKey || ["ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "MetaLeft", "MetaRight"].includes(code)) {
      return;
    }

    // Require at least one modifier for non-function keys
    const isFunctionKey = /^F\d{1,2}$/.test(mappedKey);
    if (modifiers.length > 0 || isFunctionKey) {
      setSettings((prev) => ({
        ...prev,
        hotkey_modifiers: modifiers,
        hotkey_key: mappedKey,
      }));
      setIsRecordingHotkey(false);
    }
  };

  // Handle mouse buttons for hotkey recording (side buttons)
  const handleHotkeyMouseDown = (e: React.MouseEvent) => {
    // Only handle extra buttons (side buttons are typically 3 and 4)
    if (e.button < 3) return;

    e.preventDefault();
    e.stopPropagation();

    const modifiers: string[] = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Win");

    // Map mouse buttons to names
    const mouseButtonNames: Record<number, string> = {
      3: "Mouse4", // Back button
      4: "Mouse5", // Forward button
    };

    const buttonName = mouseButtonNames[e.button];
    if (buttonName) {
      setSettings((prev) => ({
        ...prev,
        hotkey_modifiers: modifiers,
        hotkey_key: buttonName,
      }));
      setIsRecordingHotkey(false);
    }
  };

  // Global escape key handler for panels without input focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) {
          setShowSettings(false);
        }
      }
    };

    if (showSettings) {
      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [showSettings]);

  // Color picker escape key and blur handler
  useEffect(() => {
    if (!showColorPicker) return;

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowColorPicker(false);
        setPickedColor(null);
        setCopiedFormat(null);
        await invoke("hide_window");
      }
    };

    const handleBlur = () => {
      // Only reset state if not dragging (dragging causes temporary blur)
      if (!isDraggingRef.current) {
        setShowColorPicker(false);
        setPickedColor(null);
        setCopiedFormat(null);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [showColorPicker]);

  // Omni Converter blur handler (prevents flickering on reopen)
  useEffect(() => {
    if (!showConverter) return;

    const handleBlur = () => {
      if (!isDraggingRef.current) {
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showConverter]);

  // Port Killer blur handler (prevents flickering on reopen)
  useEffect(() => {
    if (!showPortKiller) return;

    const handleBlur = () => {
      if (!isDraggingRef.current) {
        setShowPortKiller(false);
        setPortInput("");
        setPortProcesses([]);
        setScannedPort(null);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [showPortKiller]);

  // Port killer functions
  const handleScanPort = async (port: number) => {
    setIsScanning(true);
    setScannedPort(port);
    try {
      const processes = await invoke<PortProcess[]>("scan_port", { port });
      setPortProcesses(processes);
    } catch (e) {
      console.error("Scan port error:", e);
      setPortProcesses([]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleKillProcess = async (pid: number) => {
    try {
      await invoke("kill_port_process", { pid });
      // Re-scan to update the list
      if (scannedPort !== null) {
        await handleScanPort(scannedPort);
      }
      setStatus("Process killed");
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      console.error("Kill process error:", e);
      setStatus(`Failed: ${e}`);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // Handle window dragging - only drag from elements with data-drag-region
  const handleDragStart = async (e: React.MouseEvent) => {
    // Only start drag if clicking directly on a drag region (not on buttons inside it)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-region]') || target.closest('button, input')) return;

    // Set dragging flag to prevent auto-hide during drag
    isDraggingRef.current = true;
    await invoke("set_dragging", { dragging: true });

    try {
      await getCurrentWindow().startDragging();
    } finally {
      // Clear dragging flag after drag ends
      isDraggingRef.current = false;
      await invoke("set_dragging", { dragging: false });
    }
  };

  // Helper to get file extension
  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "";
  };

  // Helper to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle file selection via dialog
  const handleSelectFile = async () => {
    if (!converterType) return;
    const result = await open({
      filters: FILE_FILTERS[converterType],
      multiple: false,
    });
    if (result) {
      // Get file info
      const path = result as string;
      const name = path.split(/[\\/]/).pop() || "";
      // We'll estimate size client-side or could add a backend command
      setSelectedFile({ name, path, size: 0 });
      setTargetFormat(null);
    }
  };

  // Handle conversion
  const handleConvert = async () => {
    if (!selectedFile || !targetFormat || !converterType) return;

    const ext = targetFormat.toLowerCase();
    const defaultName = selectedFile.name.replace(/\.[^.]+$/, `.${ext}`);

    const outputPath = await save({
      defaultPath: defaultName,
      filters: [{ name: targetFormat, extensions: [ext] }],
    });

    if (!outputPath) return;

    setIsConverting(true);
    setConversionProgress(0);
    setConversionStatus('converting');

    try {
      if (converterType === "image") {
        await invoke("convert_image", { inputPath: selectedFile.path, outputPath });
      } else {
        await invoke("convert_media", { inputPath: selectedFile.path, outputPath });
      }

      // Show success state
      setConversionStatus('success');
      setConversionProgress(100);

      // Wait a moment to show success, then close
      setTimeout(async () => {
        await invoke("set_auto_hide", { enabled: true });
        setShowConverter(false);
        setConverterType(null);
        setSelectedFile(null);
        setTargetFormat(null);
        setIsConverting(false);
        setConversionStatus('idle');
        setConversionProgress(0);
      }, 1500);
    } catch (e) {
      console.error("Conversion error:", e);
      setConversionStatus('error');
      // Show error in status bar
      setStatus(String(e));

      // Reset after showing error
      setTimeout(() => {
        setIsConverting(false);
        setConversionStatus('idle');
        setConversionProgress(0);
        setStatus(null);
      }, 4000);
    }
  };

  return (
    <div className="p-2 select-none">
      {/* Command Palette - Hidden when tools are open */}
      {!showConverter && !showPortKiller && !showTranslation && !showSettings && !showColorPicker && (
        <div
          className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden"
          onMouseDown={handleDragStart}
        >
          {/* Search Input */}
          <div className="relative border-b border-buncha-border py-4" data-drag-region>
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Search className="w-5 h-5 text-buncha-text-muted" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status || "Search for tools..."}
              className={`ml-15 w-145 py-1 bg-transparent text-lg outline-none ${
                status
                  ? "text-buncha-accent placeholder-buncha-accent"
                  : "text-buncha-text placeholder-buncha-text-muted"
              }`}
              autoFocus
            />
          </div>

          {/* Results List */}
          <div className="max-h-[340px] overflow-y-auto scrollbar-hidden">
            {/* Quick Result Display */}
            {quickResult && (
              <div className="py-2 border-b border-buncha-border">
                <div className={`px-5 py-4 border-l-2 ${quickResult.isPreview ? 'bg-buncha-surface/30 border-buncha-text-muted' : 'bg-buncha-accent/5 border-buncha-accent'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${quickResult.isPreview ? 'bg-buncha-surface/50' : 'bg-buncha-accent/10'}`}>
                      <quickResult.icon className={`w-6 h-6 ${quickResult.isPreview ? 'text-buncha-text-muted' : 'text-buncha-accent'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-buncha-text-muted">{quickResult.query}</p>
                        {quickResult.isPreview && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-buncha-surface rounded text-buncha-text-muted">
                            Preview
                          </span>
                        )}
                      </div>
                      <h3 className={`text-2xl font-bold ${quickResult.isPreview ? 'text-buncha-text' : 'text-buncha-accent'}`}>{quickResult.result}</h3>
                    </div>
                    <button
                      onClick={async () => {
                        await writeText(quickResult.copyValue);
                        setStatus("Copied!");
                        setTimeout(() => setStatus(null), 1500);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${quickResult.isPreview ? 'bg-buncha-surface hover:bg-buncha-surface/80 text-buncha-text-muted' : 'bg-buncha-accent/10 hover:bg-buncha-accent/20 text-buncha-accent'}`}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Currency Loading State */}
            {currencyLoading && !quickResult && (
              <div className="py-2 border-b border-buncha-border">
                <div className="px-5 py-4 bg-buncha-accent/5 border-l-2 border-buncha-accent">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-buncha-accent/10">
                      <Loader2 className="w-6 h-6 text-buncha-accent animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-buncha-text-muted mb-1">{query}</p>
                      <h3 className="text-2xl font-bold text-buncha-accent">Converting...</h3>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {filteredTools.length > 0 ? (
              <div className="py-2">
                {filteredTools.map((tool, index) => {
                  const IconComponent = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => executeTool(tool)}
                      className={`group px-5 py-4 transition-all cursor-pointer flex items-center gap-4 ${
                        index === selectedIndex
                          ? "bg-buncha-surface/50"
                          : "hover:bg-buncha-surface/50"
                      }`}
                    >
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                        index === selectedIndex
                          ? "bg-buncha-accent/20"
                          : "bg-buncha-accent/10 group-hover:bg-buncha-accent/20"
                      }`}>
                        <IconComponent className="w-6 h-6 text-buncha-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-0.5 transition-colors ${
                          index === selectedIndex
                            ? "text-buncha-accent"
                            : "text-buncha-text group-hover:text-buncha-accent"
                        }`}>
                          {tool.name}
                        </h3>
                        <p className="text-sm text-buncha-text-muted line-clamp-1">
                          {tool.description}
                        </p>
                      </div>
                      <ArrowRight className={`w-5 h-5 text-buncha-text-muted transition-all ${
                        index === selectedIndex
                          ? "opacity-100 translate-x-1"
                          : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
                      }`} />
                    </div>
                  );
                })}
              </div>
            ) : !quickResult && !currencyLoading && (
              <div className="py-16 px-5 text-center">
                <div className="w-16 h-16 rounded-full bg-buncha-surface/50 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-buncha-text-muted" />
                </div>
                <p className="text-buncha-text-muted mb-1">No tools found</p>
                <p className="text-sm text-buncha-text-muted/70">Try searching for "converter" or "translate"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-buncha-border px-5 py-3 bg-buncha-surface/30" data-drag-region>
            <div className="flex items-center justify-between text-xs text-buncha-text-muted">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                    <span className="font-medium">↑</span>
                  </div>
                  <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                    <span className="font-medium">↓</span>
                  </div>
                  <span>to navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                    <span className="font-medium">↵</span>
                  </div>
                  <span>to select</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 bg-buncha-surface rounded border border-buncha-border">
                  <span className="font-medium">esc</span>
                </div>
                <span>to close</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={handleDragStart}>
          {/* Header */}
          <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-between" data-drag-region>
            <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
              <SettingsIcon className="w-4 h-4" />
              <span>Settings</span>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-buncha-text-muted hover:text-buncha-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-1">
            {/* Keyboard Shortcut */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-buncha-text font-medium mb-0.5">Keyboard Shortcut</h3>
                <p className="text-sm text-buncha-text-muted">Global hotkey to open command palette</p>
              </div>
              <div
                ref={hotkeyInputRef}
                tabIndex={0}
                onClick={() => setIsRecordingHotkey(true)}
                onKeyDown={isRecordingHotkey ? handleHotkeyKeyDown : undefined}
                onMouseDown={isRecordingHotkey ? handleHotkeyMouseDown : undefined}
                onBlur={() => setIsRecordingHotkey(false)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isRecordingHotkey
                    ? "bg-buncha-accent/20 border-buncha-accent"
                    : "bg-buncha-surface border-buncha-border hover:border-buncha-text-muted"
                }`}
              >
                {isRecordingHotkey ? (
                  <span className="text-sm text-buncha-accent">Press keys...</span>
                ) : (
                  [...settings.hotkey_modifiers, settings.hotkey_key].map((key, i) => (
                    <span key={i} className="text-sm font-medium text-buncha-text">
                      {key}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Launch at Startup */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-buncha-text font-medium mb-0.5">Launch at Startup</h3>
                <p className="text-sm text-buncha-text-muted">Automatically start when you log in</p>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    launch_at_startup: !prev.launch_at_startup,
                  }))
                }
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.launch_at_startup
                    ? "bg-buncha-accent"
                    : "bg-buncha-surface border border-buncha-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.launch_at_startup
                      ? "right-0.5"
                      : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Show in System Tray */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-buncha-text font-medium mb-0.5">Show in System Tray</h3>
                <p className="text-sm text-buncha-text-muted">Display icon in Windows notification area</p>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    show_in_tray: !prev.show_in_tray,
                  }))
                }
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.show_in_tray
                    ? "bg-buncha-accent"
                    : "bg-buncha-surface border border-buncha-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.show_in_tray
                      ? "right-0.5"
                      : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Automatic Updates */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-buncha-text font-medium mb-0.5">Automatic Updates</h3>
                <p className="text-sm text-buncha-text-muted">Keep the app up to date automatically</p>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    automatic_updates: !prev.automatic_updates,
                  }))
                }
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.automatic_updates
                    ? "bg-buncha-accent"
                    : "bg-buncha-surface border border-buncha-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.automatic_updates
                      ? "right-0.5"
                      : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-buncha-text font-medium mb-0.5">Theme</h3>
                <p className="text-sm text-buncha-text-muted">Choose your preferred theme</p>
              </div>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: e.target.value as "dark" | "light" | "system",
                  }))
                }
                className="px-3 py-1.5 bg-buncha-surface rounded-lg border border-buncha-border text-sm text-buncha-text outline-none cursor-pointer hover:border-buncha-text-muted transition-colors"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Converter Panel */}
      {showConverter && (
        <div className="bg-buncha-bg border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={handleDragStart}>
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
                    onClick={handleSelectFile}
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
                            onClick={handleConvert}
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
      )}

      {/* Port Killer Panel */}
      {showPortKiller && (
        <div className="bg-buncha-bg border border-buncha-border rounded-buncha shadow-2xl" onMouseDown={handleDragStart}>
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
                    handleScanPort(parseInt(portInput));
                  }
                }}
                placeholder="e.g., 3000"
                className="flex-1 bg-buncha-surface border border-buncha-border rounded-lg px-4 py-2 text-buncha-text placeholder-buncha-text-muted outline-none focus:border-buncha-accent"
                data-no-drag
              />
              <button
                onClick={() => portInput && handleScanPort(parseInt(portInput))}
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
                    handleScanPort(port);
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
                        onClick={() => handleKillProcess(process.pid)}
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
      )}

      {/* Quick Translation Panel */}
      {showTranslation && (
        <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={handleDragStart}>
          {/* Header */}

          <div className="bg-buncha-surface/30 border-b border-buncha-border px-4 py-3 flex items-center justify-center" data-drag-region>
            <div className="flex items-center gap-2 text-sm text-buncha-text-muted">
              <Languages className="w-4 h-4" />
              <span>Quick Translation</span>
            </div>
            <button
              onClick={() => setIsTranslationSettingsOpen(!isTranslationSettingsOpen)}
              className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4 text-buncha-text-muted hover:text-buncha-text transition-colors" />
            </button>
          </div>

          {/* Settings Panel (conditionally shown) */}
          {isTranslationSettingsOpen && (
            <div className="px-6 py-4 border-b border-buncha-border/50 bg-buncha-surface/20">
              <div>
                <label className="text-sm text-buncha-text-muted mb-2 block">Target language</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full bg-buncha-bg border border-buncha-border rounded-lg px-3 py-2 text-sm text-buncha-text focus:outline-none focus:border-buncha-accent transition-all cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="it">Italian</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                  <option value="ko">Korean</option>
                  <option value="ru">Russian</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>
          )}

          {/* Main Translation Content */}
          <div className="p-6">
            {/* Source Text */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-buncha-accent uppercase tracking-wider">
                  {detectedLanguage}
                </span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group">
                    <Volume2 className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
                  </button>
                  <button
                    onClick={() => translationInput && writeText(translationInput)}
                    className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group"
                  >
                    <Copy className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
                  </button>
                </div>
              </div>
              <p className="text-lg leading-relaxed text-buncha-text/90 select-text min-h-[28px]">
                {translationInput || <span className="text-buncha-text-muted italic">No text selected</span>}
              </p>
            </div>

            {/* Divider */}
            <div className="relative py-3 mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-buncha-border/50" />
              </div>
              <div className="relative flex justify-center">
                <div className="bg-buncha-bg px-3">
                  {isTranslating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-buncha-accent" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-buncha-text-muted" />
                  )}
                </div>
              </div>
            </div>

            {/* Translated Text */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-buncha-accent uppercase tracking-wider">{LANGUAGE_NAMES[targetLanguage] || targetLanguage}</span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group">
                    <Volume2 className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
                  </button>
                  <button
                    onClick={() => translationOutput && writeText(translationOutput)}
                    className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group"
                  >
                    <Copy className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
                  </button>
                  <button className="p-1.5 hover:bg-buncha-surface rounded-lg transition-colors cursor-pointer group">
                    <ExternalLink className="w-4 h-4 text-buncha-text-muted group-hover:text-buncha-text transition-colors" />
                  </button>
                </div>
              </div>
              <p className="text-lg leading-relaxed font-medium text-buncha-text select-text min-h-[28px]">
                {translationError ? (
                  <span className="text-red-400">{translationError}</span>
                ) : isTranslating ? (
                  <span className="text-buncha-text-muted italic font-normal">Translating...</span>
                ) : translationOutput ? (
                  translationOutput
                ) : (
                  <span className="text-buncha-text-muted italic font-normal">Translation will appear here</span>
                )}
              </p>
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-6 py-3 border-t border-buncha-border/50 bg-buncha-surface/20">
            <p className="text-xs text-buncha-text-muted text-center">
              Translation powered by MyMemory
            </p>
          </div>
        </div>
      )}

      {/* Color Picker Details Panel */}
      {showColorPicker && pickedColor && (
        <div className="bg-buncha-bg border border-buncha-border rounded-2xl shadow-2xl overflow-hidden" onMouseDown={handleDragStart}>
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
                    className="group/format bg-buncha-surface/30 hover:bg-buncha-surface/50 border border-buncha-border hover:border-buncha-accent/50 rounded-lg py-2 pl-3 pr-6 transition-all duration-200 cursor-pointer"
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
      )}

    </div>
  );
}

export default App;
