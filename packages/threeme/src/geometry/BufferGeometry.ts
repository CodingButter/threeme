export type IndexArray = Uint16Array | Uint32Array;

export class BufferGeometry {
  constructor(
    public positions: Float32Array,
    public indices: IndexArray,
    public normals?: Float32Array,
    public uvs?: Float32Array
  ) {}

  dispose(): void {
    // no-op for now; renderer can hook into this later
  }
}
