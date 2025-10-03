// src/renderers/program/ProgramCache.ts
import basicVert from "@/shaders/basic.vert" with { type: "text" };
import basicFrag from "@/shaders/basic.frag" with { type: "text" };
import lambertVert from "@/shaders/lambert.vert" with { type: "text" };
import lambertFrag from "@/shaders/lambert.frag" with { type: "text" };
import type { GLBuffers } from "./types";

export type GL = WebGLRenderingContext | WebGL2RenderingContext;

/* -------------------------------------------------
   Internal helpers
-------------------------------------------------- */
function compile(gl: GL, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || "";
    gl.deleteShader(sh);
    throw new Error("Shader compile failed:\n" + log);
  }
  return sh;
}

function link(gl: GL, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p) || "";
    gl.deleteProgram(p);
    throw new Error("Program link failed:\n" + log);
  }
  return p;
}

/* -------------------------------------------------
   Basic (unlit) program
-------------------------------------------------- */
export class BasicProgram {
  readonly gl: GL;
  readonly prog: WebGLProgram;

  // attributes
  readonly aPosition: number;

  // uniforms
  readonly uMVP: WebGLUniformLocation | null;
  readonly uColor: WebGLUniformLocation | null;

  constructor(gl: GL) {
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, basicVert);
    const fs = compile(gl, gl.FRAGMENT_SHADER, basicFrag);
    this.prog = link(gl, vs, fs);

    this.aPosition = gl.getAttribLocation(this.prog, "aPosition");

    this.uMVP = gl.getUniformLocation(this.prog, "uMVP");
    this.uColor = gl.getUniformLocation(this.prog, "uColor");
  }

  render(
    buffers: GLBuffers,
    mvp: Float32Array,
    color: [number, number, number],
    doubleSided = false
  ) {
    const gl = this.gl;
    gl.useProgram(this.prog);

    // Culling
    if (doubleSided) gl.disable(gl.CULL_FACE);
    else {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.frontFace(gl.CCW);
    }

    // aPosition
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

    // uniforms
    gl.uniform3f(this.uColor, color[0], color[1], color[2]);
    gl.uniformMatrix4fv(this.uMVP, false, mvp);

    // draw
    if (buffers.ibo) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);
      gl.drawElements(gl.TRIANGLES, buffers.count, buffers.indexType ?? gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, buffers.count);
    }
  }
}

/* -------------------------------------------------
   Lambert (diffuse, single dir light + ambient)
   Conventions:
   - vNormalW is WORLD-space
   - uLightDir is the RAY direction (light → surface)
   - Shader does dot(N, -uLightDir)
-------------------------------------------------- */
export class LambertProgram {
  readonly gl: GL;
  readonly prog: WebGLProgram;

  // attributes
  readonly aPosition: number;
  readonly aNormal: number;

  // uniforms
  readonly uMVP: WebGLUniformLocation | null;
  readonly uNormalMatrix: WebGLUniformLocation | null;
  readonly uBaseColor: WebGLUniformLocation | null;

  readonly uLightDir: WebGLUniformLocation | null;
  readonly uLightColor: WebGLUniformLocation | null;
  readonly uLightIntensity: WebGLUniformLocation | null;

  readonly uAmbient: WebGLUniformLocation | null;
  readonly uDoubleSided: WebGLUniformLocation | null; // boolean as int

  constructor(gl: GL) {
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, lambertVert);
    const fs = compile(gl, gl.FRAGMENT_SHADER, lambertFrag);
    this.prog = link(gl, vs, fs);

    // attributes
    this.aPosition = gl.getAttribLocation(this.prog, "aPosition");
    this.aNormal = gl.getAttribLocation(this.prog, "aNormal");

    // uniforms
    this.uMVP = gl.getUniformLocation(this.prog, "uMVP");
    this.uNormalMatrix = gl.getUniformLocation(this.prog, "uNormalMatrix");
    this.uBaseColor = gl.getUniformLocation(this.prog, "uBaseColor");

    this.uLightDir = gl.getUniformLocation(this.prog, "uLightDir");
    this.uLightColor = gl.getUniformLocation(this.prog, "uLightColor");
    this.uLightIntensity = gl.getUniformLocation(this.prog, "uLightIntensity");

    this.uAmbient = gl.getUniformLocation(this.prog, "uAmbient");
    this.uDoubleSided = gl.getUniformLocation(this.prog, "uDoubleSided");
  }

  render(
    buffers: GLBuffers,
    params: {
      mvp: Float32Array;
      normalMatrix3: Float32Array; // mat3 as 9 floats
      baseColor: [number, number, number]; // 0..1
      lightDir: [number, number, number]; // world ray dir
      lightColor: [number, number, number]; // 0..1
      lightIntensity: number;
      ambient: [number, number, number]; // 0..1 summed
      doubleSided: boolean;
    }
  ) {
    const gl = this.gl;
    gl.useProgram(this.prog);

    // Culling
    if (params.doubleSided) gl.disable(gl.CULL_FACE);
    else {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.frontFace(gl.CCW);
    }

    // aPosition
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

    // aNormal (required)
    if (!buffers.nbo) {
      console.warn("LambertProgram: geometry is missing normals (nbo).");
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nbo);
    gl.enableVertexAttribArray(this.aNormal);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);

    // uniforms
    gl.uniformMatrix4fv(this.uMVP, false, params.mvp);
    gl.uniformMatrix3fv(this.uNormalMatrix, false, params.normalMatrix3);

    gl.uniform3f(this.uBaseColor, params.baseColor[0], params.baseColor[1], params.baseColor[2]);

    gl.uniform3f(this.uLightDir, params.lightDir[0], params.lightDir[1], params.lightDir[2]);
    gl.uniform3f(
      this.uLightColor,
      params.lightColor[0],
      params.lightColor[1],
      params.lightColor[2]
    );
    gl.uniform1f(this.uLightIntensity, params.lightIntensity);

    gl.uniform3f(this.uAmbient, params.ambient[0], params.ambient[1], params.ambient[2]);

    // Double-sided shading (flip normal on back-face in shader)
    gl.uniform1i(this.uDoubleSided, params.doubleSided ? 1 : 0);

    // draw
    if (buffers.ibo) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);
      gl.drawElements(gl.TRIANGLES, buffers.count, buffers.indexType ?? gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, buffers.count);
    }
  }
}

/* -------------------------------------------------
   Program cache facade
-------------------------------------------------- */
export class ProgramCache {
  private gl: GL;

  private _basic?: BasicProgram;
  private _lambert?: LambertProgram;

  constructor(gl: GL) {
    this.gl = gl;
  }

  get basic(): BasicProgram {
    return (this._basic ??= new BasicProgram(this.gl));
  }

  get lambert(): LambertProgram {
    return (this._lambert ??= new LambertProgram(this.gl));
  }
}
