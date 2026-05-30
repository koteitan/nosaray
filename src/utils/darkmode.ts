// dark mode color converter, ported from https://github.com/koteitan/darkmode (main.js)

import { useColorModeValue } from "@chakra-ui/react";

type RGB = [number, number, number];

const SQRT6 = Math.sqrt(6);
const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);

const dirCmax = (z: number, dx: number, dy: number): number => {
  let tMax = Number.POSITIVE_INFINITY;
  const aR = (2 / SQRT6) * dx;
  const aG = (-1 / SQRT6) * dx + (1 / SQRT2) * dy;
  const aB = (-1 / SQRT6) * dx - (1 / SQRT2) * dy;
  for (const a of [aR, aG, aB]) {
    if (a !== 0) {
      const u = (1 + Math.sign(a)) / 2;
      const limit = (u - z / SQRT3) / a;
      tMax = Math.min(tMax, Math.max(0, limit));
    }
  }
  return Number.isFinite(tMax) ? tMax : 0;
};

const convertPixel = ([R, G, B]: RGB): RGB => {
  const X = (2 * R - G - B) / SQRT6;
  const Y = (G - B) / SQRT2;
  const Z = (R + G + B) / SQRT3;
  const Z2 = SQRT3 - Z;
  const C = Math.hypot(X, Y);
  const dx = C > 0 ? X / C : 0;
  const dy = C > 0 ? Y / C : 0;
  const cMaxZ = dirCmax(Z, dx, dy);
  const cMaxZ2 = dirCmax(Z2, dx, dy);
  const factor = cMaxZ !== 0 ? cMaxZ2 / cMaxZ : 0;
  const X2 = factor * X;
  const Y2 = factor * Y;
  const R2 = (2 * X2) / SQRT6 + Z2 / SQRT3;
  const G2 = -X2 / SQRT6 + Y2 / SQRT2 + Z2 / SQRT3;
  const B2 = -X2 / SQRT6 - Y2 / SQRT2 + Z2 / SQRT3;
  return [clamp01(R2), clamp01(G2), clamp01(B2)];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const hexToRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    Number.parseInt(full.slice(0, 2), 16) / 255,
    Number.parseInt(full.slice(2, 4), 16) / 255,
    Number.parseInt(full.slice(4, 6), 16) / 255,
  ];
};

const rgbToHex = ([r, g, b]: RGB): string => {
  const toHex = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const cache = new Map<string, string>();
export const toDarkHex = (hex: string): string => {
  const k = hex.toLowerCase();
  const cached = cache.get(k);
  if (cached !== undefined) return cached;
  const out = rgbToHex(convertPixel(hexToRgb(k)));
  cache.set(k, out);
  return out;
};

// Chakra default color tokens used in this app, mapped to their hex values.
const chakraColorHex: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  "gray.50": "#f7fafc",
  "gray.100": "#edf2f7",
  "gray.500": "#718096",
  "gray.600": "#4a5568",
  "gray.700": "#2d3748",
  "gray.800": "#1a202c",
  "green.300": "#68d391",
  "purple.100": "#e9d8fd",
  "purple.200": "#d6bcfa",
  "purple.500": "#805ad5",
  "blue.500": "#3182ce",
};

const colorToHex = (name: string): string => {
  if (name.startsWith("#")) return name;
  return chakraColorHex[name] ?? name;
};

// hook: returns the original color in light mode, and the dark-converted hex in dark mode
export const useDarkAware = (lightColor: string): string => {
  return useColorModeValue(lightColor, toDarkHex(colorToHex(lightColor)));
};
