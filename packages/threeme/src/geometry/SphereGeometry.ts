// src/geometry/SphereGeometry.ts
import { BufferGeometry } from "./BufferGeometry";

/**
 * UV-sphere centered at origin.
 * - CCW winding (outside faces), matching BoxGeometry.
 * - Smooth outward normals (unit length).
 * - Positions + Indices (+ Normals) only; UVs/tangents can be added later.
 */
export class SphereGeometry extends BufferGeometry {
  constructor(radius = 0.5, widthSegments = 16, heightSegments = 12) {
    const ws = Math.max(3, Math.floor(widthSegments)); // longitudes
    const hs = Math.max(2, Math.floor(heightSegments)); // latitudes

    // vertex grid (ws+1) by (hs+1)
    const vertsX = ws + 1;
    const vertsY = hs + 1;
    const vertexCount = vertsX * vertsY;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    // choose index type based on vertex count
    const indexCount = ws * hs * 6; // 2 tris per quad, 3 indices each
    const IndexCtor = vertexCount > 65_535 ? Uint32Array : Uint16Array;
    const indices = new IndexCtor(indexCount);

    // ---- fill positions + normals ----
    // iy: 0..hs (south → north), ix: 0..ws (0..2π)
    let p = 0;
    let uvIndex = 0;
    for (let iy = 0; iy < vertsY; iy++) {
      const v = iy / hs; // 0..1
      const phi = v * Math.PI; // 0..π (lat)
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let ix = 0; ix < vertsX; ix++) {
        const u = ix / ws; // 0..1
        const theta = u * Math.PI * 2; // 0..2π (lon)
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        // unit sphere normal (outward)
        const nx = sinPhi * cosTheta;
        const ny = cosPhi;
        const nz = sinPhi * sinTheta;

        // position = normal * radius
        positions[p] = radius * nx;
        normals[p++] = nx;
        positions[p] = radius * ny;
        normals[p++] = ny;
        positions[p] = radius * nz;
        normals[p++] = nz;

        // UVs
        uvs[uvIndex++] = u;
        uvs[uvIndex++] = 1 - v; // v flipped
      }
    }

    // ---- fill indices with CCW winding (outside faces) ----
    // quad: (a b; c d) with
    // a = (iy, ix), b = (iy, ix+1), c = (iy+1, ix), d = (iy+1, ix+1)
    // triangles: a,b,d and a,d,c  (CCW when viewed from outside)
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

    super(positions, indices, normals, uvs);
  }
}
