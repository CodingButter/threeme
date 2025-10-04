export { hexToRgb } from "@/utils/color.ts";
export { faceCamera } from "@/utils/transform";

export function createElementNS<T>(name: string): T {
  return document.createElementNS("http://www.w3.org/2000/xhtml", name) as T;
}

export function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0 && value !== 0;
}
