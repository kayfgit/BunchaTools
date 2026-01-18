import type {
  ColorFormats,
  UnitConversionResult,
  PartialUnitSuggestion,
  PartialCurrencySuggestion,
  CurrencyQuery,
  QRCodeType,
  QRCodeData,
} from "./types";
import { UNIT_CATEGORIES, DEFAULT_UNIT_TARGETS, CURRENCY_ALIASES } from "./constants";

// ============ Color Conversion Utilities ============

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
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

export function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
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

export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
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

export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
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

export function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
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

export function convertHexToFormats(hex: string): ColorFormats {
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

// ============ QR Code Content Generator ============

export function generateQRContent(type: QRCodeType, data: QRCodeData): string {
  switch (type) {
    case "url":
      return data.url.url;
    case "wifi": {
      const { ssid, password, encryption } = data.wifi;
      return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
    }
    case "email": {
      const { email, subject } = data.email;
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      const queryString = params.toString();
      return `mailto:${email}${queryString ? "?" + queryString : ""}`;
    }
    case "phone":
      return `tel:${data.phone.phone}`;
    case "text":
      return data.text.text;
    case "vcard": {
      const v = data.vcard;
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${v.lastName};${v.firstName}`,
        `FN:${v.firstName} ${v.lastName}`,
        v.phone ? `TEL:${v.phone}` : "",
        v.email ? `EMAIL:${v.email}` : "",
        "END:VCARD"
      ].filter(Boolean).join("\n");
    }
    case "location": {
      const { latitude, longitude } = data.location;
      return `geo:${latitude},${longitude}`;
    }
    case "event": {
      const e = data.event;
      const formatDate = (d: string) => d ? d.replace(/[-:]/g, "").replace("T", "") + "00" : "";
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${e.title}`,
        e.location ? `LOCATION:${e.location}` : "",
        `DTSTART:${formatDate(e.startDate)}`,
        `DTEND:${formatDate(e.endDate)}`,
        "END:VEVENT",
        "END:VCALENDAR"
      ].filter(Boolean).join("\n");
    }
    default:
      return "";
  }
}

// ============ Unit Conversion Utilities ============

// Build a map of all unit names/aliases for fuzzy matching
export function getAllUnitNames(): string[] {
  const names: string[] = [];
  for (const category of Object.values(UNIT_CATEGORIES)) {
    names.push(...Object.keys(category.units));
    names.push(...Object.keys(category.aliases));
  }
  return [...new Set(names)]; // Remove duplicates
}

// Find the canonical unit name from an alias
export function getCanonicalUnit(input: string): string | null {
  for (const category of Object.values(UNIT_CATEGORIES)) {
    if (category.units[input]) return input;
    if (category.aliases[input]) return category.aliases[input];
  }
  return null;
}

// Parse unit conversion query like "10 feet to meters"
export function parseUnitQuery(query: string): UnitConversionResult | null {
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

// Parse partial unit query like "10 fahr" and suggest completion
export function parsePartialUnitQuery(query: string): PartialUnitSuggestion | null {
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

// ============ Currency Conversion Utilities ============

// Get all currency names/aliases for fuzzy matching
export function getAllCurrencyNames(): string[] {
  return Object.keys(CURRENCY_ALIASES);
}

// Parse partial currency query and suggest completion to USD (global standard)
export function parsePartialCurrencyQuery(query: string): PartialCurrencySuggestion | null {
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
export function parseCurrencyQuery(query: string): CurrencyQuery | null {
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

// ============ Calculator Utility ============

// Safe calculator function that evaluates basic math expressions
export function evaluateExpression(expr: string): string | null {
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

// ============ File Helper Utilities ============

// Helper to get file extension
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() || "";
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
