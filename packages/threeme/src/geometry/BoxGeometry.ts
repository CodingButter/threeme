// src/geometry/BoxGeometry.ts
import { BufferGeometry } from "./BufferGeometry";

export class BoxGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, depth = 1) {
    const hx = width * 0.5,
      hy = height * 0.5,
      hz = depth * 0.5;

    // prettier-ignore
    const positions = new Float32Array([
      // +X
       hx,-hy,-hz,  hx, hy,-hz,  hx, hy, hz,  hx,-hy, hz,
      // -X
      -hx,-hy, hz, -hx, hy, hz, -hx, hy,-hz, -hx,-hy,-hz,
      // +Y
      -hx, hy,-hz, -hx, hy, hz,  hx, hy, hz,  hx, hy,-hz,
      // -Y
      -hx,-hy, hz, -hx,-hy,-hz,  hx,-hy,-hz,  hx,-hy, hz,
      // +Z
      -hx,-hy, hz,  hx,-hy, hz,  hx, hy, hz, -hx, hy, hz,
      // -Z
       hx,-hy,-hz, -hx,-hy,-hz, -hx, hy,-hz,  hx, hy,-hz,
    ]);

    // Blender standard cube unwrap layout (3x4 vertical cross):
    //         [Top]
    //        [Front]
    // [Left][Bottom][Right]
    //        [Back]
    // Each face: width=1/3, height=1/4
    // prettier-ignore
    const uvs = new Float32Array([
      // +X face (Right) - col 2, row 1 - vertices: BL, TL, TR, BR
      2/3, 1/4,  2/3, 2/4,  1, 2/4,  1, 1/4,
      // -X face (Left) - col 0, row 1 - vertices: BL, TL, TR, BR
      0, 1/4,  0, 2/4,  1/3, 2/4,  1/3, 1/4,
      // +Y face (Top) - col 1, row 3 - vertices: BL, TL, TR, BR
      1/3, 3/4,  1/3, 1,  2/3, 1,  2/3, 3/4,
      // -Y face (Bottom) - col 1, row 1 - vertices: BL, TL, TR, BR
      1/3, 1/4,  1/3, 2/4,  2/3, 2/4,  2/3, 1/4,
      // +Z face (Front) - col 1, row 2 - vertices: BL, TL, TR, BR
      1/3, 2/4,  1/3, 3/4,  2/3, 3/4,  2/3, 2/4,
      // -Z face (Back) - col 1, row 0 - vertices: BL, TL, TR, BR
      1/3, 0,  1/3, 1/4,  2/3, 1/4,  2/3, 0,
    ]);

    // flat normals: one per vertex, per face
    // prettier-ignore
    const normals = new Float32Array([
      // +X
       1,0,0,  1,0,0,  1,0,0,  1,0,0,
      // -X
      -1,0,0, -1,0,0, -1,0,0, -1,0,0,
      // +Y
       0,1,0,  0,1,0,  0,1,0,  0,1,0,
      // -Y
       0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
      // +Z
       0,0,1,  0,0,1,  0,0,1,  0,0,1,
      // -Z
       0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    ]);
    // prettier-ignore
    const indices = new Uint16Array([
      0,1,2,   0,2,3,      // +X
      4,5,6,   4,6,7,      // -X
      8,9,10,  8,10,11,    // +Y
      12,13,14,12,14,15,   // -Y
      16,17,18,16,18,19,   // +Z
      20,21,22,20,22,23,   // -Z
    ]);

    super(positions, indices, normals, uvs);
  }
}
