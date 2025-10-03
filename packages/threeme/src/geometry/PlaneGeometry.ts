// src/geometry/PlaneGeometry.ts
import { BufferGeometry } from "./BufferGeometry";

/**
 * Plane in the XY plane, centered at the origin, facing +Z.
 * - CCW winding (outside face) to match Box/Sphere.
 * - Smooth normals pointing +Z.
 * - Positions + Indices (+ Normals); UVs can be added later.
 */
export class PlaneGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    const ws = Math.max(1, Math.floor(widthSegments));
    const hs = Math.max(1, Math.floor(heightSegments));

    const vertsX = ws + 1;
    const vertsY = hs + 1;
    const vertexCount = vertsX * vertsY;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    // choose index type
    const indexCount = ws * hs * 6; // 2 tris per quad
    const IndexCtor = vertexCount > 65_535 ? Uint32Array : Uint16Array;
    const indices = new IndexCtor(indexCount);

    // half-dimensions for centering
    const hx = width * 0.5;
    const hy = height * 0.5;

    // fill positions/normals
    let p = 0;
    for (let iy = 0; iy < vertsY; iy++) {
      const vy = iy / hs; // 0..1
      const y = -hy + vy * height; // -hy .. +hy
      for (let ix = 0; ix < vertsX; ix++) {
        const vx = ix / ws; // 0..1
        const x = -hx + vx * width; // -hx .. +hx

        positions[p] = x;
        normals[p++] = 0;
        positions[p] = y;
        normals[p++] = 0;
        positions[p] = 0;
        normals[p++] = 1; // +Z normal
      }
    }

    // indices (CCW in XY plane: a,b,d and a,d,c)
    let t = 0;
    for (let iy = 0; iy < hs; iy++) {
      for (let ix = 0; ix < ws; ix++) {
        const a = iy * vertsX + ix;
        const b = a + 1;
        const c = (iy + 1) * vertsX + ix;
        const d = c + 1;

        indices[t++] = a as any;
        indices[t++] = b as any;
        indices[t++] = d as any;
        indices[t++] = a as any;
        indices[t++] = d as any;
        indices[t++] = c as any;
      }
    }

    super(positions, indices, normals);
  }
}
