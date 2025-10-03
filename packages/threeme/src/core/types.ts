// src/core/types.ts
export type Hex = number; // 0xRRGGBB
export type Rgb = readonly [number, number, number]; // 0..1
export type Rgba = readonly [number, number, number, number];
export type TypedArray = Float32Array | Uint16Array | Uint32Array | Int32Array;
export enum DrawMode {
  Triangles = 0x0004,
  Lines = 0x0001,
}
export interface Disposable {
  dispose(): void;
}
export interface Updatable {
  updateMatrix(): void;
}
