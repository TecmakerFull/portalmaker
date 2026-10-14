// =============================================================================
// PORTALMAKER — Utilidades de Color y Accesibilidad WCAG AA (4.5:1)
// Garantiza legibilidad perfecta en cualquier combinación de colores elegida
// por el dueño de la tienda (ej: amarillo sobre blanco, blanco sobre amarillo).
// =============================================================================

/** Convierte color HEX (#RGB o #RRGGBB) a valores RGB numéricos (0..255) */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 31, g: 41, b: 55 }; // fallback neutro #1F2937
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 31, g: 41, b: 55 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** Convierte componentes RGB a string hexadecimal (#RRGGBB) */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calcula la luminancia relativa según WCAG 2.1 (0 = negro, 1 = blanco)
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Calcula el ratio de contraste entre dos colores HEX según WCAG 2.1 (1:1 a 21:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Determina el color de texto óptimo para colocar ENCIMA de un fondo (bgHex).
 * Si el fondo es claro (como amarillo #FACC15, blanco, celeste pastel),
 * retorna un texto oscuro (#111827).
 * Si el fondo es oscuro (azul marino, verde bosque, carbón),
 * retorna blanco (#FFFFFF).
 */
export function getReadableTextColor(bgHex: string): string {
  const contrastWithDark = getContrastRatio(bgHex, '#111827');
  const contrastWithWhite = getContrastRatio(bgHex, '#FFFFFF');

  // Si tiene al menos 4.5:1 con el oscuro o mayor contraste con oscuro, usar oscuro
  if (contrastWithDark >= contrastWithWhite) {
    return '#111827';
  }
  return '#FFFFFF';
}

/**
 * Convierte RGB a HSL
 */
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
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convierte HSL a RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = (h % 360) / 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Ajusta un color de acento/marca (colorHex) para que sea 100% legible cuando se use como TEXTO
 * sobre un fondo específico (bgHex), cumpliendo mínimo WCAG AA (4.5:1).
 *
 * Si el fondo es blanco y el color es amarillo (#FACC15), oscurece el tono conservando
 * el matiz amarillo/dorado (resultando en un dorado ámbar profundo #854D0E) para que se lea perfectamente.
 * Si el fondo es oscuro, aclara el color si hiciera falta.
 */
export function getAccessibleColorOnBg(colorHex: string, bgHex: string, targetRatio = 4.5): string {
  const currentRatio = getContrastRatio(colorHex, bgHex);
  if (currentRatio >= targetRatio) {
    return colorHex;
  }

  const bgLum = getLuminance(bgHex);
  const isLightBg = bgLum > 0.45;
  const rgb = hexToRgb(colorHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  let bestHex = colorHex;
  let bestRatio = currentRatio;

  // Si el fondo es claro, oscurecemos el tono (disminuimos lightness)
  if (isLightBg) {
    for (let l = hsl.l; l >= 10; l -= 2) {
      const candidateRgb = hslToRgb(hsl.h, Math.min(hsl.s + 10, 100), l);
      const candidateHex = rgbToHex(candidateRgb.r, candidateRgb.g, candidateRgb.b);
      const ratio = getContrastRatio(candidateHex, bgHex);
      if (ratio >= targetRatio) {
        return candidateHex;
      }
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestHex = candidateHex;
      }
    }
  } else {
    // Si el fondo es oscuro, aclaramos el tono (aumentamos lightness)
    for (let l = hsl.l; l <= 95; l += 2) {
      const candidateRgb = hslToRgb(hsl.h, hsl.s, l);
      const candidateHex = rgbToHex(candidateRgb.r, candidateRgb.g, candidateRgb.b);
      const ratio = getContrastRatio(candidateHex, bgHex);
      if (ratio >= targetRatio) {
        return candidateHex;
      }
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestHex = candidateHex;
      }
    }
  }

  return bestHex;
}
