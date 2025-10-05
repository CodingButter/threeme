// src/renderers/WebGLRenderer.ts
import { mat3, mat4, vec3 } from "gl-matrix";

import type { Scene } from "@/scenes/Scene";
import type { Camera } from "@/cameras/Camera";
import { Mesh } from "@/meshes/Mesh";

import { MeshBasicMaterial } from "@/materials/MeshBasicMaterial";
import { MeshLambertMaterial } from "@/materials/MeshLambertMaterial";

import { DirectionalLight, AmbientLight, PointLight } from "@/lights";

import { ProgramCache, type GLBuffers, type LambertParams } from "./program";
import { hexToRgb } from "@/utils/color";
import type { Hex, TypedArray } from "@/core/types";
import type { Texture } from "@/textures";
import { isPowerOfTwo } from "@/utils";

/* ----------------------------------------------
   Public API
---------------------------------------------- */

export interface RendererParams {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
  context?: WebGLRenderingContext | WebGL2RenderingContext;
}

export class WebGLRenderer {
  /* GL + canvas */
  public readonly gl: WebGL2RenderingContext | WebGLRenderingContext;
  public readonly canvas: HTMLCanvasElement;

  /* Programs */
  public readonly programs: ProgramCache;

  /* DPR + size */
  private _dpr = 1;
  private _width = 0;
  private _height = 0;

  /* Geometry cache */
  private geometryCache: WeakMap<object, GLBuffers> = new WeakMap();
  /* Texture cache */
  private textureCache: WeakMap<Texture, WebGLTexture> = new WeakMap();

  /* Frame temps */
  private _vp = mat4.create();
  private _mvp = mat4.create();
  private _normal3 = mat3.create();
  private _ambientRGB: [number, number, number] = [0, 0, 0];
  private _lightDirW = vec3.create();

  constructor(params: RendererParams = {}) {
    const {
      canvas = document.createElement("canvas"),
      antialias = true,
      alpha = false,
      preserveDrawingBuffer = false,
      context,
    } = params;

    this.canvas = canvas;

    const gl =
      context ||
      (canvas.getContext("webgl2", {
        antialias,
        alpha,
        preserveDrawingBuffer,
      }) as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl", {
        antialias,
        alpha,
        preserveDrawingBuffer,
      }) as WebGLRenderingContext | null);

    if (!gl) throw new Error("WebGL not supported");

    this.gl = gl;

    // Default GL state
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);

    // Programs
    this.programs = new ProgramCache(gl);
  }

  /* ----------------------------------------------
     Canvas & sizing
  ---------------------------------------------- */

  get domElement(): HTMLCanvasElement {
    return this.canvas;
  }

  get pixelRatio(): number {
    return this._dpr;
  }

  setPixelRatio(dpr: number): void {
    // guard and coerce to sensible integer DPR >= 1
    this._dpr = Math.max(1, Math.floor(dpr || 1));
    this.setSize(this._width, this._height, false);
  }

  public setClearColor(color: Hex, alpha = 1): void {
    const [r, g, b] = hexToRgb(color);
    this.gl.clearColor(r, g, b, alpha);
  }

  getSize(target: { width: number; height: number }): { width: number; height: number } {
    target.width = this._width;
    target.height = this._height;
    return target;
  }

  setSize(width: number, height: number, updateStyle = true): void {
    this._width = width | 0 || 0;
    this._height = height | 0 || 0;

    const canvasWidth = Math.max(1, Math.floor(this._width * this._dpr));
    const canvasHeight = Math.max(1, Math.floor(this._height * this._dpr));

    if (this.canvas.width !== canvasWidth) this.canvas.width = canvasWidth;
    if (this.canvas.height !== canvasHeight) this.canvas.height = canvasHeight;

    if (updateStyle) {
      this.canvas.style.width = `${this._width}px`;
      this.canvas.style.height = `${this._height}px`;
    }

    // Update viewport now that size changed
    this.gl.viewport(0, 0, canvasWidth, canvasHeight);
  }

  /* ----------------------------------------------
     Low-level helpers
  ---------------------------------------------- */

  private beginFrame(): void {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  private ensureTexture(texture: Texture): WebGLTexture | undefined {
    let glTexture = this.textureCache.get(texture);

    if (!glTexture) {
      glTexture = this.gl.createTexture();
      if (!glTexture) {
        console.error("Failed to create texture");
        return undefined;
      }
      this.textureCache.set(texture, glTexture);
    }

    if (texture.needsUpdate) {
      const gl = this.gl;
      this.gl.bindTexture(this.gl.TEXTURE_2D, glTexture);

      const target: number = texture.target || gl.TEXTURE_2D;
      const level: number = texture.level || 0;
      const internalFormat: number = texture.internalFormat || gl.RGBA;
      const width: number = texture.width || 1;
      const height: number = texture.height || 1;
      const border: number = texture.border || 0;
      const sourceFormat: number = texture.sourceFormat || gl.RGBA;
      const sourceType: number = texture.sourceType || gl.UNSIGNED_BYTE;
      const source: any = texture.source || new Uint8Array([0, 0, 255, 255]); // default blue
      const wrapS: number = texture.wrapS || gl.CLAMP_TO_EDGE;
      const wrapT: number = texture.wrapT || gl.CLAMP_TO_EDGE;
      const minFilter: number = texture.minFilter || gl.LINEAR;
      const magFilter: number = texture.magFilter || gl.LINEAR;

      this.gl.texImage2D(
        target,
        level,
        internalFormat,
        width,
        height,
        border,
        sourceFormat,
        sourceType,
        source
      );

      // Set texture
      this.gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
      this.gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
      this.gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
      this.gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);

      // Generate mipmaps if needed
      if (isPowerOfTwo(width) && isPowerOfTwo(height)) {
        gl.generateMipmap(target);
      }
      texture.needsUpdate = false;
    }
    return glTexture;
  }

  private ensureGeometry(
    geometry: {
      positions: TypedArray;
      indices?: TypedArray;
      normals?: TypedArray;
      uvs?: TypedArray;
    },
    key: object = geometry
  ): GLBuffers {
    const hit = this.geometryCache.get(key);
    if (hit) return hit;

    const gl = this.gl;

    // Positions → VBO
    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("Failed to create VBO");
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

    // Indices → IBO (optional)
    let ibo: WebGLBuffer | undefined;
    let count = (geometry.positions.length / 3) | 0;
    let indexType: number | undefined;

    if (geometry.indices) {
      ibo = gl.createBuffer() || undefined;
      if (!ibo) throw new Error("Failed to create IBO");
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
      count = geometry.indices.length;

      indexType = geometry.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    }

    // Normals (optional) → NBO
    let nbo: WebGLBuffer | undefined;
    if (geometry.normals) {
      nbo = gl.createBuffer() || undefined;
      if (!nbo) throw new Error("Failed to create NBO");
      gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
    }

    // UVs (optional) → UVBO
    let uvbo: WebGLBuffer | undefined;
    if (geometry.uvs) {
      uvbo = gl.createBuffer() || undefined;
      if (!uvbo) throw new Error("Failed to create UVBO");
      gl.bindBuffer(gl.ARRAY_BUFFER, uvbo);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);
    }

    const buffers: GLBuffers = { vbo, ibo, nbo, uvbo, count, indexType };
    this.geometryCache.set(key, buffers);
    return buffers;
  }

  /** Simple DFS traversal */
  private _traverse(node: any, visit: (o: any) => void): void {
    visit(node);
    const kids = (node && node.children) as any[] | undefined;
    if (!kids) return;
    for (const child of kids) this._traverse(child, visit);
  }

  /* ----------------------------------------------
     Main render
  ---------------------------------------------- */

  public render(scene: Scene, camera: Camera): void {
    // Update transforms
    scene.updateWorldMatrix();
    camera.updateWorldMatrix();
    camera.updateViewMatrix();

    // Clear frame
    this.beginFrame();

    // VP once
    mat4.multiply(this._vp, camera.projectionMatrix, camera.viewMatrix);

    // Gather lights once
    let dirLight: DirectionalLight | undefined;
    vec3.set(this._ambientRGB, 0, 0, 0);
    const pointLights: PointLight[] = [];

    this._traverse(scene, (node: any) => {
      if (!dirLight && node instanceof DirectionalLight) dirLight = node;
      if (node instanceof AmbientLight) {
        const [ar, ag, ab] = hexToRgb(node.color);
        this._ambientRGB[0] += ar * node.intensity;
        this._ambientRGB[1] += ag * node.intensity;
        this._ambientRGB[2] += ab * node.intensity;
      }
      if (node instanceof PointLight) pointLights.push(node);
    });

    // Clamp ambient
    this._ambientRGB[0] = Math.min(1, this._ambientRGB[0]);
    this._ambientRGB[1] = Math.min(1, this._ambientRGB[1]);
    this._ambientRGB[2] = Math.min(1, this._ambientRGB[2]);

    // Draw meshes
    this._traverse(scene, (obj: any) => {
      if (!(obj instanceof Mesh)) return;

      const buffers = this.ensureGeometry(obj.geometry);
      const material = obj.material as any;

      // MVP = VP * Model
      mat4.multiply(this._mvp, this._vp, obj.worldMatrix);

      // Lit path (Lambert)
      if (material instanceof MeshLambertMaterial && dirLight) {
        // Normal matrix (world-space) for Lambert shader: inverse-transpose of MODEL
        mat3.normalFromMat4(this._normal3, obj.worldMatrix);

        // Light uniforms
        dirLight.getWorldDirection(this._lightDirW); // ray direction (light→surface)

        const base = hexToRgb(material.color);
        const lcol = hexToRgb(dirLight.color);

        // Build params object for lambert program
        const lambertParams: LambertParams = {
          mvp: this._mvp as Float32Array,
          normalMatrix3: this._normal3 as unknown as Float32Array,
          model: obj.worldMatrix as Float32Array, // uModel for vPositionW
          baseColor: [base[0], base[1], base[2]],
          lightDir: [this._lightDirW[0], this._lightDirW[1], this._lightDirW[2]],
          lightColor: [lcol[0], lcol[1], lcol[2]],
          lightIntensity: dirLight.intensity,
          ambient: [this._ambientRGB[0], this._ambientRGB[1], this._ambientRGB[2]],
          doubleSided: !!material.doubleSided,
        };

        // Add Texture if available
        if (material.map != undefined) {
          const glTexture = this.ensureTexture(material.map);
          if (glTexture) lambertParams.texture = glTexture;
        }

        // ---- Point lights (support up to shader limit, 10) ----
        const MAX_PL = 10;
        const count = Math.min(pointLights.length, MAX_PL);
        lambertParams.pointLightCount = count;

        // Pack an array for ProgramCache to upload: uPointLights[i].*
        const packed: Array<{
          color: [number, number, number];
          positionW: [number, number, number];
          distance: number;
          decay: number;
          intensity: number;
        }> = [];

        for (let i = 0; i < count; i++) {
          const L = pointLights[i]!; // safe due to count bound

          // World position
          const wm = (L as any).worldMatrix as Float32Array | undefined;
          let posW: [number, number, number] = [0, 0, 0];
          if (wm && wm.length >= 16) {
            // translation from column-major mat4
            posW = [wm[12] ?? 0, wm[13] ?? 0, wm[14] ?? 0];
          } else if ((L as any).position) {
            const p = (L as any).position;
            posW = [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
          }

          // Color (linear 0..1)
          const cc = hexToRgb(L.color);
          const color: [number, number, number] = [cc[0], cc[1], cc[2]];

          packed.push({
            color,
            positionW: posW,
            distance: ((L as any).distance as number) ?? 0,
            decay: ((L as any).decay as number) ?? 2,
            intensity: L.intensity,
          });
        }

        lambertParams.pointLights = packed; // array upload; ProgramCache will loop & bind
        // --------------------------------------------------------

        this.programs.lambert.render(buffers, lambertParams);
        return;
      }

      // Unlit path (Basic)
      const color =
        material instanceof MeshBasicMaterial
          ? hexToRgb(material.color)
          : ([1, 1, 1] as [number, number, number]);
      const doubleSided = material instanceof MeshBasicMaterial && !!material.doubleSided;

      // Get texture if material has map
      let glTexture: WebGLTexture | undefined;
      if (material instanceof MeshBasicMaterial && material.map != undefined) {
        glTexture = this.ensureTexture(material.map);
      }

      this.programs.basic.render(
        buffers,
        this._mvp as Float32Array,
        [color[0], color[1], color[2]],
        doubleSided,
        glTexture
      );
    });
  }
}
