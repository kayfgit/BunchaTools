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

// ============ Reverse Color Conversion Utilities ============

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

export function labToRgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const y3 = Math.pow(y, 3);
  const x3 = Math.pow(x, 3);
  const z3 = Math.pow(z, 3);

  y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
  x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
  z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;

  x *= 95.047;
  y *= 100.0;
  z *= 108.883;

  x /= 100;
  y /= 100;
  z /= 100;

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bb = x * 0.0557 + y * -0.204 + z * 1.057;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bb = bb > 0.0031308 ? 1.055 * Math.pow(bb, 1 / 2.4) - 0.055 : 12.92 * bb;

  return {
    r: Math.round(Math.max(0, Math.min(255, r * 255))),
    g: Math.round(Math.max(0, Math.min(255, g * 255))),
    b: Math.round(Math.max(0, Math.min(255, bb * 255))),
  };
}

export function xyzToRgb(x: number, y: number, z: number): { r: number; g: number; b: number } {
  x /= 100;
  y /= 100;
  z /= 100;

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.204 + z * 1.057;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.round(Math.max(0, Math.min(255, r * 255))),
    g: Math.round(Math.max(0, Math.min(255, g * 255))),
    b: Math.round(Math.max(0, Math.min(255, b * 255))),
  };
}

export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const L = l / 100;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l__ = l_ * l_ * l_;
  const m__ = m_ * m_ * m_;
  const s__ = s_ * s_ * s_;

  let r = 4.0767416621 * l__ - 3.3077115913 * m__ + 0.2309699292 * s__;
  let g = -1.2684380046 * l__ + 2.6097574011 * m__ - 0.3413193965 * s__;
  let bb = -0.0041960863 * l__ - 0.7034186147 * m__ + 1.707614701 * s__;

  const toSrgb = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  r = toSrgb(r);
  g = toSrgb(g);
  bb = toSrgb(bb);

  return {
    r: Math.round(Math.max(0, Math.min(255, r * 255))),
    g: Math.round(Math.max(0, Math.min(255, g * 255))),
    b: Math.round(Math.max(0, Math.min(255, bb * 255))),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// ============ Color Query Parsing ============

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'oklch' | 'cmyk' | 'lab' | 'xyz';

export interface ColorConversionResult {
  fromFormat: ColorFormat;
  toFormat: ColorFormat;
  rgb: { r: number; g: number; b: number };
  result: string;
  displayQuery: string;
}

export function parseAnyColor(input: string): { format: ColorFormat; rgb: { r: number; g: number; b: number } } | null {
  const trimmed = input.trim().toLowerCase();

  const hexMatch = trimmed.match(/^#?([a-f0-9]{3}|[a-f0-9]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return { format: 'hex', rgb: hexToRgb('#' + hex) };
  }

  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,\s]\s*[\d.]+)?\s*\)$/);
  if (rgbMatch) {
    return {
      format: 'rgb',
      rgb: {
        r: Math.min(255, parseInt(rgbMatch[1])),
        g: Math.min(255, parseInt(rgbMatch[2])),
        b: Math.min(255, parseInt(rgbMatch[3])),
      },
    };
  }

  const hslMatch = trimmed.match(/^hsla?\s*\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*(?:[,\s]\s*[\d.]+)?\s*\)$/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) % 360;
    const s = Math.min(100, parseFloat(hslMatch[2]));
    const l = Math.min(100, parseFloat(hslMatch[3]));
    return { format: 'hsl', rgb: hslToRgb(h, s, l) };
  }

  const hsvMatch = trimmed.match(/^hs[vb]\s*\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*\)$/);
  if (hsvMatch) {
    const h = parseFloat(hsvMatch[1]) % 360;
    const s = Math.min(100, parseFloat(hsvMatch[2]));
    const v = Math.min(100, parseFloat(hsvMatch[3]));
    return { format: 'hsv', rgb: hsvToRgb(h, s, v) };
  }

  const oklchMatch = trimmed.match(/^oklch\s*\(\s*([\d.]+)%?\s+([.\d]+)\s+([\d.]+)\s*\)$/);
  if (oklchMatch) {
    const l = parseFloat(oklchMatch[1]);
    const c = parseFloat(oklchMatch[2]);
    const h = parseFloat(oklchMatch[3]) % 360;
    return { format: 'oklch', rgb: oklchToRgb(l, c, h) };
  }

  const cmykMatch = trimmed.match(/^cmyk\s*\(\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*\)$/);
  if (cmykMatch) {
    const c = Math.min(100, parseFloat(cmykMatch[1]));
    const m = Math.min(100, parseFloat(cmykMatch[2]));
    const y = Math.min(100, parseFloat(cmykMatch[3]));
    const k = Math.min(100, parseFloat(cmykMatch[4]));
    return { format: 'cmyk', rgb: cmykToRgb(c, m, y, k) };
  }

  const labMatch = trimmed.match(/^lab\s*\(\s*([\d.]+)%?\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/);
  if (labMatch) {
    const l = parseFloat(labMatch[1]);
    const a = parseFloat(labMatch[2]);
    const b = parseFloat(labMatch[3]);
    return { format: 'lab', rgb: labToRgb(l, a, b) };
  }

  const xyzMatch = trimmed.match(/^xyz\s*\(\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*\)$/);
  if (xyzMatch) {
    const x = parseFloat(xyzMatch[1]);
    const y = parseFloat(xyzMatch[2]);
    const z = parseFloat(xyzMatch[3]);
    return { format: 'xyz', rgb: xyzToRgb(x, y, z) };
  }

  return null;
}

export function formatRgbTo(rgb: { r: number; g: number; b: number }, format: ColorFormat): string {
  switch (format) {
    case 'hex':
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'hsl': {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    case 'hsv': {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      return `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
    }
    case 'oklch': {
      const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      return `oklch(${oklch.l}% ${oklch.c} ${oklch.h})`;
    }
    case 'cmyk': {
      const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
      return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
    }
    case 'lab': {
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
      return `lab(${lab.l}% ${lab.a} ${lab.b})`;
    }
    case 'xyz': {
      const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
      return `xyz(${xyz.x}%, ${xyz.y}%, ${xyz.z}%)`;
    }
    default:
      return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
}

const COLOR_FORMAT_ALIASES: Record<string, ColorFormat> = {
  hex: 'hex',
  hexadecimal: 'hex',
  rgb: 'rgb',
  rgba: 'rgb',
  hsl: 'hsl',
  hsla: 'hsl',
  hsv: 'hsv',
  hsb: 'hsv',
  oklch: 'oklch',
  cmyk: 'cmyk',
  lab: 'lab',
  xyz: 'xyz',
};

export function parseColorQuery(query: string): ColorConversionResult | null {
  const trimmed = query.trim().toLowerCase();

  const match = trimmed.match(/^(.+?)\s+(?:to|in)\s+(\w+)$/);
  if (!match) return null;

  const colorPart = match[1].trim();
  const targetFormatInput = match[2].trim();

  const toFormat = COLOR_FORMAT_ALIASES[targetFormatInput];
  if (!toFormat) return null;

  const parsed = parseAnyColor(colorPart);
  if (!parsed) return null;

  if (parsed.format === toFormat) return null;

  const result = formatRgbTo(parsed.rgb, toFormat);

  return {
    fromFormat: parsed.format,
    toFormat,
    rgb: parsed.rgb,
    result,
    displayQuery: `${colorPart} to ${toFormat}`,
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

// ============ Video Converter Utilities ============

// Format video duration as MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Estimate output file size based on bitrate and duration
export function estimateOutputSize(
  duration: number,
  bitrate: number,
  hasAudio: boolean
): number {
  // bitrate in kbps, duration in seconds
  // Returns estimated size in bytes
  if (bitrate === 0) return 0; // Original quality - can't estimate
  const videoBits = bitrate * 1000 * duration;
  const audioBits = hasAudio ? 128 * 1000 * duration : 0; // assume 128kbps audio
  return Math.floor((videoBits + audioBits) / 8);
}
