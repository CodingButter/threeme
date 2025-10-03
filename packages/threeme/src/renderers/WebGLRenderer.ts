// src/renderers/WebGLRenderer.ts
import { mat3, mat4, vec3 } from "gl-matrix";

import type { Scene } from "@/scenes/Scene";
import type { Camera } from "@/cameras/Camera";
import { Mesh } from "@/meshes/Mesh";

import { MeshBasicMaterial } from "@/materials/MeshBasicMaterial";
import { MeshLambertMaterial } from "@/materials/MeshLambertMaterial";

import { DirectionalLight } from "@/lights/DirectionalLight";
import { AmbientLight } from "@/lights/AmbientLight";

import { ProgramCache, type GLBuffers } from "./program";
import { hexToRgb } from "@/utils/color";
import type { TypedArray } from "@/core/types";

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
  public readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  public readonly canvas: HTMLCanvasElement;

  /* Programs */
  private programs: ProgramCache;

  /* DPR + size */
  private _dpr = 1;
  private _width = 0;
  private _height = 0;

  /* Geometry cache */
  private geometryCache: WeakMap<object, GLBuffers> = new WeakMap();

  /* Frame temps */
  private _vp = mat4.create();
  private _mvp = mat4.create();
  private _mv = mat4.create();
  private _normal3 = mat3.create();
  private _lightDirW = vec3.create();
  private _ambientRGB = vec3.create();

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
     Size / clear
  ---------------------------------------------- */

  setPixelRatio(dpr: number): void {
    // Cap DPR to avoid huge canvases on 4K/5K when not needed
    this._dpr = Math.max(0.5, Math.min(3, dpr || 1));
    // Re-apply size to update the backing store
    this.setSize(this._width, this._height);
  }

  setSize(width: number, height: number): void {
    this._width = width | 0;
    this._height = height | 0;

    const rw = Math.max(1, Math.floor(this._width * this._dpr));
    const rh = Math.max(1, Math.floor(this._height * this._dpr));

    if (this.canvas.width !== rw || this.canvas.height !== rh) {
      this.canvas.width = rw;
      this.canvas.height = rh;
    }

    // CSS size (logical pixels)
    this.canvas.style.width = `${this._width}px`;
    this.canvas.style.height = `${this._height}px`;

    this.gl.viewport(0, 0, rw, rh);
  }

  setClearColor(hex: number, alpha = 1): void {
    const [r, g, b] = hexToRgb(hex);
    this.gl.clearColor(r, g, b, alpha);
  }

  beginFrame(): void {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /* ----------------------------------------------
     Geometry upload / cache
  ---------------------------------------------- */

  private ensureGeometry(
    geometry: { positions: TypedArray; indices?: TypedArray; normals?: TypedArray },
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

      // WebGL1 needs OES_element_index_uint for UNSIGNED_INT
      const isWebGL2 = (gl as WebGL2RenderingContext).drawBuffers !== undefined;
      if (indexType === gl.UNSIGNED_INT && !isWebGL2) {
        const ok = gl.getExtension("OES_element_index_uint");
        if (!ok) throw new Error("Uint32 indices require OES_element_index_uint in WebGL1.");
      }
    }

    // Normals → NBO (optional)
    let nbo: WebGLBuffer | undefined;
    if (geometry.normals) {
      nbo = gl.createBuffer() || undefined;
      if (!nbo) throw new Error("Failed to create NBO");
      gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.normals as Float32Array, gl.STATIC_DRAW);
    }

    const rec: GLBuffers = { vbo, ibo, nbo, count, indexType };
    this.geometryCache.set(key, rec);
    return rec;
  }

  /* ----------------------------------------------
     Render
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

    this._traverse(scene, (node: any) => {
      if (!dirLight && node instanceof DirectionalLight) dirLight = node;
      if (node instanceof AmbientLight) {
        const [ar, ag, ab] = hexToRgb(node.color);
        this._ambientRGB[0] += ar * node.intensity;
        this._ambientRGB[1] += ag * node.intensity;
        this._ambientRGB[2] += ab * node.intensity;
      }
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

        this.programs.lambert.render(buffers, {
          mvp: this._mvp as Float32Array,
          normalMatrix3: this._normal3 as unknown as Float32Array,
          baseColor: [base[0], base[1], base[2]],
          lightDir: [this._lightDirW[0], this._lightDirW[1], this._lightDirW[2]],
          lightColor: [lcol[0], lcol[1], lcol[2]],
          lightIntensity: dirLight.intensity,
          ambient: [this._ambientRGB[0], this._ambientRGB[1], this._ambientRGB[2]],
          doubleSided: material.doubleSided,
        });
        return;
      }

      // Unlit path (Basic)
      const color =
        material instanceof MeshBasicMaterial
          ? hexToRgb(material.color)
          : ([1, 1, 1] as [number, number, number]);
      const doubleSided = material instanceof MeshBasicMaterial && !!material.doubleSided;

      this.programs.basic.render(
        buffers,
        this._mvp as Float32Array,
        [color[0], color[1], color[2]],
        doubleSided
      );
    });
  }

  /* ----------------------------------------------
     Utils
  ---------------------------------------------- */

  /** Simple DFS traversal */
  private _traverse(node: any, visit: (o: any) => void): void {
    visit(node);
    const kids = node.children as any[] | undefined;
    if (!kids) return;
    for (const child of kids) this._traverse(child, visit);
  }
}
