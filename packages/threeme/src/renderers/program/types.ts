// what we store per-geometry in the renderer cache
export interface GLBuffers {
  vbo: WebGLBuffer; // positions
  ibo?: WebGLBuffer; // indices
  nbo?: WebGLBuffer; // normals
  count: number; // draw count
  indexType?: number; // gl.UNSIGNED_SHORT | gl.UNSIGNED_INT
}
