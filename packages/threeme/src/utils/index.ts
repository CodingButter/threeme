export { hexToRgb } from "@/utils/color.ts";
export { faceCamera } from "@/utils/transform";
export { EventManager, type Listener } from "@/utils/EventManager";
export { BetterFetch } from "@/utils/BetterFetch";
export { RemoteFile } from "@/utils/RemoteFile";
export function createElementNS<T>(name: string): T {
  return document.createElementNS("http://www.w3.org/2000/xhtml", name) as T;
}

export function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0 && value !== 0;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
