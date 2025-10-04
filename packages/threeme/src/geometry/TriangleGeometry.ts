import { BufferGeometry } from "./BufferGeometry";

export class TriangleGeometry extends BufferGeometry {
  constructor(size = 1) {
    const s = size;
    // XY plane, CCW winding, centered-ish
    const positions = new Float32Array([
      -0.5 * s,
      -0.5 * s,
      0,
      0.5 * s,
      -0.5 * s,
      0,
      0.0 * s,
      0.5 * s,
      0,
    ]);

    // Flat normals pointing +Z (out of the screen)
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);

    const uvs = new Float32Array([
      0,
      0, // vertex 0
      1,
      0, // vertex 1
      0.5,
      1, // vertex 2
    ]);

    const indices = new Uint16Array([0, 1, 2]);

    super(positions, indices, normals, uvs);
  }
}
