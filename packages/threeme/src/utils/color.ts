import type { Rgb } from "@/core";
import { INV_255 } from "@/core/constants";

export function hexToRgb(hex: number): Rgb {
  const r = ((hex >> 16) & 0xff) * INV_255;
  const g = ((hex >> 8) & 0xff) * INV_255;
  const b = (hex & 0xff) * INV_255;
  return [r, g, b];
}
