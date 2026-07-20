export type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type ContrastVerdict = "fail-aa" | "pass";

function clampByte(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function parseHex(input: string): Rgba | null {
  const hex = input.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    const r = Number.parseInt(hex[0]! + hex[0]!, 16);
    const g = Number.parseInt(hex[1]! + hex[1]!, 16);
    const b = Number.parseInt(hex[2]! + hex[2]!, 16);
    const a = hex.length === 4 ? Number.parseInt(hex[3]! + hex[3]!, 16) / 255 : 1;
    if ([r, g, b, a].some((part) => Number.isNaN(part))) return null;
    return { r, g, b, a };
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b, a].some((part) => Number.isNaN(part))) return null;
    return { r, g, b, a };
  }
  return null;
}

function parseRgbFunction(input: string): Rgba | null {
  const match = input.match(/^rgba?\(\s*([^\)]+)\s*\)$/i);
  if (!match) return null;
  const parts = match[1]!
    .split(/[,\s/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const readChannel = (raw: string) => {
    if (raw.endsWith("%")) {
      return clampByte((Number.parseFloat(raw) / 100) * 255);
    }
    return clampByte(Number.parseFloat(raw));
  };

  const r = readChannel(parts[0]!);
  const g = readChannel(parts[1]!);
  const b = readChannel(parts[2]!);
  let a = 1;
  if (parts[3] !== undefined) {
    const alphaRaw = parts[3]!;
    a = alphaRaw.endsWith("%")
      ? clampAlpha(Number.parseFloat(alphaRaw) / 100)
      : clampAlpha(Number.parseFloat(alphaRaw));
  }
  if ([r, g, b, a].some((part) => Number.isNaN(part))) return null;
  return { r, g, b, a };
}

function hueToRgb(p: number, q: number, t: number) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function parseHslFunction(input: string): Rgba | null {
  const match = input.match(/^hsla?\(\s*([^\)]+)\s*\)$/i);
  if (!match) return null;
  const parts = match[1]!
    .split(/[,\s/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const hRaw = parts[0]!;
  const h = ((Number.parseFloat(hRaw) % 360) + 360) % 360;
  const s = parts[1]!.endsWith("%")
    ? Number.parseFloat(parts[1]!) / 100
    : Number.parseFloat(parts[1]!);
  const l = parts[2]!.endsWith("%")
    ? Number.parseFloat(parts[2]!) / 100
    : Number.parseFloat(parts[2]!);
  let a = 1;
  if (parts[3] !== undefined) {
    const alphaRaw = parts[3]!;
    a = alphaRaw.endsWith("%")
      ? clampAlpha(Number.parseFloat(alphaRaw) / 100)
      : clampAlpha(Number.parseFloat(alphaRaw));
  }
  if ([h, s, l, a].some((part) => Number.isNaN(part))) return null;

  const sat = Math.min(1, Math.max(0, s));
  const light = Math.min(1, Math.max(0, l));
  if (sat === 0) {
    const gray = clampByte(light * 255);
    return { r: gray, g: gray, b: gray, a };
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const hk = h / 360;
  return {
    r: clampByte(hueToRgb(p, q, hk + 1 / 3) * 255),
    g: clampByte(hueToRgb(p, q, hk) * 255),
    b: clampByte(hueToRgb(p, q, hk - 1 / 3) * 255),
    a,
  };
}

/**
 * Parse common computed-style color strings. Returns null for unsupported
 * formats (oklch/lab/color-mix/transparent/currentColor) so the crawler can
 * resolve those in-browser via canvas instead.
 */
export function parseCssColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  if (!value || value === "transparent" || value === "currentcolor") {
    return null;
  }
  if (value.startsWith("#")) {
    return parseHex(value);
  }
  if (value.startsWith("rgb")) {
    return parseRgbFunction(value);
  }
  if (value.startsWith("hsl")) {
    return parseHslFunction(value);
  }
  return null;
}

function channelToLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance for an opaque sRGB color. */
export function relativeLuminance(rgb: Pick<Rgba, "r" | "g" | "b">): number {
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colors. */
export function contrastRatio(
  foreground: Pick<Rgba, "r" | "g" | "b">,
  background: Pick<Rgba, "r" | "g" | "b">,
): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG large text: ≥ 18pt (~24px) regular, or ≥ 14pt (~18.66px) bold.
 * Uses CSS px assuming 96dpi (1pt = 1.333px).
 */
export function isLargeText(fontSizePx: number, fontWeight: number | string): boolean {
  const weight =
    typeof fontWeight === "string"
      ? fontWeight === "bold" || fontWeight === "bolder"
        ? 700
        : Number.parseInt(fontWeight, 10) || 400
      : fontWeight;
  if (fontSizePx >= 24) return true;
  if (fontSizePx >= 18.66 && weight >= 700) return true;
  return false;
}

export function meetsWcagAa(ratio: number, large: boolean): boolean {
  return large ? ratio >= 3 : ratio >= 4.5;
}

export function classifyFailure(ratio: number, large: boolean): ContrastVerdict {
  return meetsWcagAa(ratio, large) ? "pass" : "fail-aa";
}

/** Alpha-composite `fg` over opaque `bg`. */
export function blendOver(fg: Rgba, bg: Pick<Rgba, "r" | "g" | "b">): Rgba {
  const a = clampAlpha(fg.a);
  if (a >= 0.999) {
    return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  }
  if (a <= 0.001) {
    return { r: bg.r, g: bg.g, b: bg.b, a: 1 };
  }
  return {
    r: clampByte(fg.r * a + bg.r * (1 - a)),
    g: clampByte(fg.g * a + bg.g * (1 - a)),
    b: clampByte(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

export function rgbaToCss({ r, g, b, a }: Rgba): string {
  if (a >= 0.999) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}
