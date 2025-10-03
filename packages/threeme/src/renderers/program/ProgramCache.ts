// src/renderers/program/ProgramCache.ts
// Binds Lambert uniforms including uModel and multiple PointLights (up to 10),
// with strict TypeScript null/undefined safety.

export type GLNumArray =
  | Float32Array
  | Int32Array
  | Uint32Array
  | Uint16Array
  | Int16Array
  | Uint8Array
  | Int8Array;

export interface GLBuffers {
  vbo: WebGLBuffer; // positions (vec3)
  nbo?: WebGLBuffer; // normals (vec3) optional
  ibo?: WebGLBuffer; // indices optional
  count: number; // index count OR vertex count
  indexType?: number; // gl.UNSIGNED_SHORT | gl.UNSIGNED_INT
}

/* ----------------------------------------------------------------------------
   Shader loading helpers
   (Adjust these to match your build system if needed)
---------------------------------------------------------------------------- */
// @ts-ignore - adjust to your build setup (e.g. '?raw' loaders)
import lambertVertSrc from "@/shaders/lambert.vert" with { type: "text" };
// @ts-ignore
import lambertFragSrc from "@/shaders/lambert.frag" with { type: "text" };
// @ts-ignore
import basicVertSrc from "@/shaders/basic.vert" with { type: "text" };
// @ts-ignore
import basicFragSrc from "@/shaders/basic.frag" with { type: "text" };

function compile(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || "";
    gl.deleteShader(sh);
    throw new Error("Shader compile error:\n" + log);
  }
  return sh;
}

function link(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string
): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  if (!prog) throw new Error("createProgram failed");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) || "";
    gl.deleteProgram(prog);
    throw new Error("Program link error:\n" + log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

/* ----------------------------------------------------------------------------
   Uniform helpers (null-safe)
---------------------------------------------------------------------------- */
function setBool(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  v: boolean
) {
  if (loc) (gl as any).uniform1i(loc, v ? 1 : 0);
}
function set1i(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  v: number
) {
  if (loc) (gl as any).uniform1i(loc, v | 0);
}
function set1f(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  v: number
) {
  if (loc) (gl as any).uniform1f(loc, v);
}
function set3f(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  v: [number, number, number]
) {
  if (loc) (gl as any).uniform3f(loc, v[0], v[1], v[2]);
}
function setMat4(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  m: Float32Array
) {
  if (loc) (gl as any).uniformMatrix4fv(loc, false, m);
}
function setMat3(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  m: Float32Array
) {
  if (loc) (gl as any).uniformMatrix3fv(loc, false, m);
}

/* ----------------------------------------------------------------------------
   ProgramCache
---------------------------------------------------------------------------- */
export class ProgramCache {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;

  public readonly lambert: ReturnType<typeof buildLambert>;
  public readonly basic: ReturnType<typeof buildBasic>;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.lambert = buildLambert(gl);
    this.basic = buildBasic(gl);
  }

  // geometry is handled in WebGLRenderer; ProgramCache focuses on programs
}

/* ----------------------------------------------------------------------------
   Lambert program (Lambert + Ambient + Directional + PointLights[0..9])
---------------------------------------------------------------------------- */
function buildLambert(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const program = link(gl, lambertVertSrc, lambertFragSrc);

  // attributes
  const aPosition = gl.getAttribLocation(program, "aPosition");
  const aNormal = gl.getAttribLocation(program, "aNormal");

  // uniforms
  const uMVP = gl.getUniformLocation(program, "uMVP");
  const uNormalMatrix = gl.getUniformLocation(program, "uNormalMatrix");
  const uModel = gl.getUniformLocation(program, "uModel");

  const uBaseColor = gl.getUniformLocation(program, "uBaseColor");
  const uLightDir = gl.getUniformLocation(program, "uLightDir");
  const uLightColor = gl.getUniformLocation(program, "uLightColor");
  const uLightIntensity = gl.getUniformLocation(program, "uLightIntensity");
  const uAmbient = gl.getUniformLocation(program, "uAmbient");
  const uDoubleSided = gl.getUniformLocation(program, "uDoubleSided");

  const uPointLightCount = gl.getUniformLocation(program, "uPointLightCount");

  const MAX_PL = 10; // match shader
  type PLUniforms = {
    color: WebGLUniformLocation | null;
    position: WebGLUniformLocation | null;
    distance: WebGLUniformLocation | null;
    decay: WebGLUniformLocation | null;
    intensity: WebGLUniformLocation | null;
  };
  const pl: PLUniforms[] = Array.from({ length: MAX_PL }, (_, i) => ({
    color: gl.getUniformLocation(program, `uPointLights[${i}].color`),
    position: gl.getUniformLocation(program, `uPointLights[${i}].position`),
    distance: gl.getUniformLocation(program, `uPointLights[${i}].distance`),
    decay: gl.getUniformLocation(program, `uPointLights[${i}].decay`),
    intensity: gl.getUniformLocation(program, `uPointLights[${i}].intensity`),
  }));

  function bindBuffers(buffers: GLBuffers) {
    gl.useProgram(program);

    // positions
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    if (aPosition >= 0) {
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 3 * 4, 0);
    }

    // normals (optional)
    if (buffers.nbo) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nbo);
      if (aNormal >= 0) {
        gl.enableVertexAttribArray(aNormal);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 3 * 4, 0);
      }
    } else if (aNormal >= 0) {
      gl.disableVertexAttribArray(aNormal);
    }

    // indices (optional)
    if (buffers.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);
  }

  type LambertParams = {
    mvp: Float32Array;
    normalMatrix3: Float32Array;
    model: Float32Array;
    baseColor: [number, number, number];
    lightDir: [number, number, number];
    lightColor: [number, number, number];
    lightIntensity: number;
    ambient: [number, number, number];
    doubleSided: boolean;

    pointLightCount?: number;
    pointLights?: Array<{
      color: [number, number, number];
      positionW: [number, number, number];
      distance: number;
      decay: number;
      intensity: number;
    }>;
  };

  function render(buffers: GLBuffers, opts: LambertParams) {
    bindBuffers(buffers);

    // core uniforms
    setMat4(gl, uMVP, opts.mvp);
    setMat3(gl, uNormalMatrix, opts.normalMatrix3);
    setMat4(gl, uModel, opts.model);
    set3f(gl, uBaseColor, opts.baseColor);
    set3f(gl, uLightDir, opts.lightDir);
    set3f(gl, uLightColor, opts.lightColor);
    set1f(gl, uLightIntensity, opts.lightIntensity);
    set3f(gl, uAmbient, opts.ambient);
    setBool(gl, uDoubleSided, !!opts.doubleSided);

    // point lights
    const count = Math.min(opts.pointLightCount || 0, MAX_PL);
    set1i(gl, uPointLightCount, count);

    const arr = opts.pointLights || [];
    for (let i = 0; i < count; i++) {
      const L = arr[i];
      if (!L) continue; // TS-safe guard
      const pli = pl[i];
      if (!pli) continue; // TS-safe guard
      set3f(gl, pli.color, L.color);
      set3f(gl, pli.position, L.positionW);
      set1f(gl, pli.distance, L.distance);
      set1f(gl, pli.decay, L.decay);
      set1f(gl, pli.intensity, L.intensity);
    }

    // draw
    if (buffers.ibo && buffers.indexType) {
      gl.drawElements(gl.TRIANGLES, buffers.count, buffers.indexType, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, buffers.count);
    }
  }

  return { program, render };
}

/* ----------------------------------------------------------------------------
   Basic (unlit) program
---------------------------------------------------------------------------- */
function buildBasic(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const program = link(gl, basicVertSrc, basicFragSrc);

  const aPosition = gl.getAttribLocation(program, "aPosition");

  const uMVP = gl.getUniformLocation(program, "uMVP");
  const uColor = gl.getUniformLocation(program, "uColor");
  const uDoubleSided = gl.getUniformLocation(program, "uDoubleSided");

  function bindBuffers(buffers: GLBuffers) {
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    if (aPosition >= 0) {
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 3 * 4, 0);
    }

    if (buffers.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);
  }

  function render(
    buffers: GLBuffers,
    mvp: Float32Array,
    color: [number, number, number],
    doubleSided: boolean
  ) {
    bindBuffers(buffers);
    setMat4(gl, uMVP, mvp);
    set3f(gl, uColor, color);
    setBool(gl, uDoubleSided, !!doubleSided);

    if (buffers.ibo && buffers.indexType) {
      gl.drawElements(gl.TRIANGLES, buffers.count, buffers.indexType, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, buffers.count);
    }
  }

  return { program, render };
}
