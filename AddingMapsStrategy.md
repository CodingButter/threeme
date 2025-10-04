# Strategy: Adding Texture Map Support to ThreeMe

## Current State Analysis

Your texture system is well-designed with:

- **Texture class** (`src/textures/Texture.ts`): Stores all WebGL texture parameters (source, format, dimensions)
- **TextureLoader** (`src/loaders/TextureLoader.ts`): Handles async image loading with proper callbacks
- **Material.map property**: Already defined but not yet utilized in rendering
- **Smart initialization**: Textures start with a 1x1 blue pixel until the image loads, then `needsUpdate` flag triggers and `onUpdate()` callback fires

However, the following components are **missing** for texture rendering:

1. UV coordinates in geometry classes
2. Texture sampling in shaders
3. WebGL texture creation and binding in the renderer
4. Texture cache management (similar to your geometry cache)

---

## Implementation Strategy

### Phase 1: Add UV Coordinates to Geometry System

**Files to modify:**

- `packages/threeme/src/geometry/BufferGeometry.ts`
- `packages/threeme/src/geometry/SphereGeometry.ts`
- `packages/threeme/src/geometry/PlaneGeometry.ts`
- `packages/threeme/src/geometry/BoxGeometry.ts`
- `packages/threeme/src/geometry/TriangleGeometry.ts`

#### 1.1 Update BufferGeometry

**Action:** Add optional `uvs` property to store UV coordinates.

```typescript
// BufferGeometry.ts
export class BufferGeometry {
  constructor(
    public positions: Float32Array,
    public indices: IndexArray,
    public normals?: Float32Array,
    public uvs?: Float32Array // NEW: Add UV coordinates
  ) {
    if (normals) this.normals = normals
    if (uvs) this.uvs = uvs // NEW
  }
  // ...
}
```

**Why:** UVs are texture coordinates (u, v) in the range [0, 1] that map vertices to texture pixels. Each vertex needs 2 floats for UV.

#### 1.2 Update SphereGeometry

**Action:** Generate UV coordinates based on spherical coordinates.

The code already computes `u` and `v` in the loop (line 38-39):

```typescript
const u = ix / ws // 0..1
const v = iy / hs // 0..1
```

**Add UV array generation:**

```typescript
// In SphereGeometry constructor, after creating positions/normals arrays:
const uvs = new Float32Array(vertexCount * 2)

// Inside the nested loop, after setting positions/normals:
uvs[uvIndex++] = u
uvs[uvIndex++] = 1.0 - v // Flip V for standard texture orientation
```

**Pass to super:**

```typescript
super(positions, indices, normals, uvs)
```

#### 1.3 Update PlaneGeometry

**Similar approach** - the code already has `vx` and `vy` (lines 34-37). Use these for UVs:

```typescript
const uvs = new Float32Array(vertexCount * 2)
// In loop:
uvs[uvIndex++] = vx
uvs[uvIndex++] = 1.0 - vy
```

#### 1.4 Update BoxGeometry

**More complex** - each face needs its own UV mapping. For basic unwrap:

```typescript
// After positions array, create UVs for 24 vertices (4 per face × 6 faces)
const uvs = new Float32Array([
  // +X face
  0, 0, 0, 1, 1, 1, 1, 0,
  // -X face
  0, 0, 0, 1, 1, 1, 1, 0,
  // Continue for all 6 faces...
])
```

#### 1.5 Update TriangleGeometry

**Simplest case** - just 3 vertices, define basic UVs:

```typescript
const uvs = new Float32Array([
  0,
  0, // vertex 0
  1,
  0, // vertex 1
  0.5,
  1, // vertex 2
])
```

---

### Phase 2: Update Shaders for Texture Sampling

**Files to modify:**

- `packages/threeme/src/shaders/basic.vert`
- `packages/threeme/src/shaders/basic.frag`
- `packages/threeme/src/shaders/lambert.vert`
- `packages/threeme/src/shaders/lambert.frag`

#### 2.1 Update Vertex Shaders

**Add UV attribute and varying:**

**basic.vert:**

```glsl
attribute vec3 aPosition;
attribute vec2 aUV;        // NEW

uniform mat4 uMVP;

varying vec2 vUV;          // NEW

void main() {
    vUV = aUV;             // NEW: Pass to fragment shader
    gl_Position = uMVP * vec4(aPosition, 1.0);
}
```

**lambert.vert:**

```glsl
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;        // NEW

uniform mat4 uMVP;
uniform mat3 uNormalMatrix;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec2 vUV;          // NEW

void main() {
    vNormalW = normalize(uNormalMatrix * aNormal);
    vPositionW = (uMVP * vec4(aPosition, 1.0)).xyz;
    vUV = aUV;             // NEW
    gl_Position = uMVP * vec4(aPosition, 1.0);
}
```

#### 2.2 Update Fragment Shaders

**Add texture sampling:**

**basic.frag:**

```glsl
precision mediump float;

uniform vec3 uColor;
uniform bool uUseMap;        // NEW: Toggle texture usage
uniform sampler2D uMap;      // NEW: Texture sampler

varying vec2 vUV;            // NEW

void main() {
    vec3 color = uColor;

    if (uUseMap) {           // NEW: Sample texture if available
        vec4 texColor = texture2D(uMap, vUV);
        color *= texColor.rgb;
    }

    gl_FragColor = vec4(color, 1.0);
}
```

**lambert.frag:**

```glsl
precision mediump float;

varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec2 vUV;            // NEW

uniform vec3 uBaseColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbient;
uniform bool uDoubleSided;
uniform bool uUseMap;        // NEW
uniform sampler2D uMap;      // NEW

// ... PointLight uniforms and functions remain the same ...

void main() {
  vec3 N = -normalize(vNormalW);

  // Base color from material or texture
  vec3 baseColor = uBaseColor;
  if (uUseMap) {             // NEW
    vec4 texColor = texture2D(uMap, vUV);
    baseColor *= texColor.rgb;
  }

  // Directional diffuse
  float NdotL = max(dot(N, -normalize(uLightDir)), 0.0);
  vec3 diffuse = baseColor * uLightColor * (uLightIntensity * NdotL);

  // Point lights (use baseColor instead of uBaseColor)
  vec3 plColor = vec3(0.0);
  for(int i = 0; i < MAX_POINT_LIGHTS; i++) {
    if(i >= uPointLightCount) break;
    plColor += computePointLight(uPointLights[i], N, vPositionW, baseColor);
  }

  // Final
  vec3 color = uAmbient * baseColor + diffuse + plColor;
  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}
```

**Note:** Also update `computePointLight` function parameter from `uBaseColor` to accept the sampled `baseColor`.

---

### Phase 3: Update ProgramCache for Texture Support

**File:** `packages/threeme/src/renderers/program/ProgramCache.ts`

#### 3.1 Update buildBasic()

**Add uniform locations:**

```typescript
const uUseMap = gl.getUniformLocation(program, "uUseMap")
const uMap = gl.getUniformLocation(program, "uMap")
const aUV = gl.getAttribLocation(program, "aUV")
```

**Update bindBuffers() to handle UVs:**

```typescript
function bindBuffers(buffers: GLBuffers) {
  gl.useProgram(program)

  // Positions
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo)
  if (aPosition >= 0) {
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 3 * 4, 0)
  }

  // UVs (NEW)
  if (buffers.uvbo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uvbo)
    if (aUV >= 0) {
      gl.enableVertexAttribArray(aUV)
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 2 * 4, 0)
    }
  } else if (aUV >= 0) {
    gl.disableVertexAttribArray(aUV)
  }

  // Indices
  if (buffers.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo)
}
```

**Update render() signature to accept texture:**

```typescript
function render(
  buffers: GLBuffers,
  mvp: Float32Array,
  color: [number, number, number],
  doubleSided: boolean,
  texture?: WebGLTexture // NEW: Optional texture
) {
  bindBuffers(buffers)
  setMat4(gl, uMVP, mvp)
  set3f(gl, uColor, color)
  setBool(gl, uDoubleSided, !!doubleSided)

  // NEW: Bind texture if provided
  if (texture && uMap) {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    set1i(gl, uMap, 0) // Texture unit 0
    setBool(gl, uUseMap, true)
  } else {
    setBool(gl, uUseMap, false)
  }

  // Draw...
}
```

#### 3.2 Update buildLambert()

**Apply the same changes** as buildBasic:

- Add `aUV`, `uUseMap`, `uMap` uniform/attribute locations
- Update `bindBuffers()` to handle UVs
- Update `render()` to accept and bind texture
- Update `LambertParams` type to include optional texture

---

### Phase 4: Update GLBuffers Type

**File:** `packages/threeme/src/renderers/program/types.ts`

```typescript
export interface GLBuffers {
  vbo: WebGLBuffer
  ibo?: WebGLBuffer
  nbo?: WebGLBuffer
  uvbo?: WebGLBuffer // NEW: UV buffer
  count: number
  indexType?: number
}
```

---

### Phase 5: Update WebGLRenderer for Texture Management

**File:** `packages/threeme/src/renderers/WebGLRenderer.ts`

#### 5.1 Add Texture Cache

**Add to class properties:**

```typescript
export class WebGLRenderer {
  // ... existing properties ...

  /* Texture cache */
  private textureCache: WeakMap<Texture, WebGLTexture> = new WeakMap();
```

#### 5.2 Create Texture Management Method

**Add method to create/update WebGL textures:**

```typescript
private ensureTexture(texture: Texture): WebGLTexture | undefined {
  // Check if we already have a WebGL texture
  let glTexture = this.textureCache.get(texture);

  // Create new texture if needed
  if (!glTexture) {
    glTexture = this.gl.createTexture();
    if (!glTexture) {
      console.error("Failed to create WebGL texture");
      return undefined;
    }
    this.textureCache.set(texture, glTexture);
    texture.needsUpdate = true; // Force initial upload
  }

  // Update texture data if needed
  if (texture.needsUpdate) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, glTexture);

    // Upload texture data
    const target = gl.TEXTURE_2D;
    const level = texture.level;
    const internalFormat = (gl as any)[texture.internalFormat];
    const width = texture.width;
    const height = texture.height;
    const border = texture.border;
    const srcFormat = (gl as any)[texture.sourceFormat];
    const srcType = (gl as any)[texture.sourceType];
    const source = texture.source;

    gl.texImage2D(
      target,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      source
    );

    // Set texture parameters
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Generate mipmaps if source is power of 2
    if (this.isPowerOf2(width) && this.isPowerOf2(height)) {
      gl.generateMipmap(target);
    }

    texture.needsUpdate = false;
  }

  return glTexture;
}

private isPowerOf2(value: number): boolean {
  return (value & (value - 1)) === 0;
}
```

#### 5.3 Update ensureGeometry() to Handle UVs

**Modify the ensureGeometry method:**

```typescript
private ensureGeometry(
  geometry: {
    positions: TypedArray;
    indices?: TypedArray;
    normals?: TypedArray;
    uvs?: TypedArray;  // NEW
  },
  key: object = geometry
): GLBuffers {
  const hit = this.geometryCache.get(key);
  if (hit) return hit;

  const gl = this.gl;

  // ... existing VBO, IBO, NBO code ...

  // UVs (optional) → UVBO (NEW)
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
```

#### 5.4 Update render() Method to Use Textures

**In the render loop, when rendering meshes:**

**For MeshBasicMaterial:**

```typescript
// After line 319, add texture handling:
const color =
  material instanceof MeshBasicMaterial
    ? hexToRgb(material.color)
    : ([1, 1, 1] as [number, number, number])
const doubleSided = material instanceof MeshBasicMaterial && !!material.doubleSided

// NEW: Get texture if material has map
let glTexture: WebGLTexture | undefined
if (material instanceof MeshBasicMaterial && material.map) {
  glTexture = this.ensureTexture(material.map)
}

this.programs.basic.render(
  buffers,
  this._mvp as Float32Array,
  [color[0], color[1], color[2]],
  doubleSided,
  glTexture // NEW: Pass texture
)
```

**For MeshLambertMaterial:**

```typescript
// After line 257, add texture handling:
const lambertParams: any = {
  mvp: this._mvp as Float32Array,
  normalMatrix3: this._normal3 as unknown as Float32Array,
  model: obj.worldMatrix as Float32Array,
  baseColor: [base[0], base[1], base[2]],
  lightDir: [this._lightDirW[0], this._lightDirW[1], this._lightDirW[2]],
  lightColor: [lcol[0], lcol[1], lcol[2]],
  lightIntensity: dirLight.intensity,
  ambient: [this._ambientRGB[0], this._ambientRGB[1], this._ambientRGB[2]],
  doubleSided: !!material.doubleSided,
}

// NEW: Add texture if available
if (material.map) {
  const glTexture = this.ensureTexture(material.map)
  if (glTexture) {
    lambertParams.texture = glTexture
  }
}

// ... existing point light code ...

this.programs.lambert.render(buffers, lambertParams)
```

---

### Phase 6: Update Example App

**File:** `apps/example/src/main.ts`

**Actually use the texture that's being loaded:**

```typescript
// Line 45: Currently loads but doesn't use the texture
const texture: Texture = TextureLoader.load(asmongold)
texture.onUpdate = () => {
  console.log("Texture loaded:", texture)
}

// Update sphere material to use the texture:
const sphere = new Mesh(
  new SphereGeometry(0.75, 32, 16),
  new MeshLambertMaterial({
    color: 0xffffff, // White base color so texture shows correctly
    map: texture, // NEW: Assign the texture
  })
)
```

---

## Implementation Order Checklist

Follow this order to minimize breaking changes:

- [ ] **Step 1:** Update `BufferGeometry` to accept UVs
- [ ] **Step 2:** Add UV generation to all geometry classes (start with `SphereGeometry`)
- [ ] **Step 3:** Update shader files (vertex first, then fragment)
- [ ] **Step 4:** Update `GLBuffers` type to include `uvbo`
- [ ] **Step 5:** Update `ProgramCache` to handle UV attributes and texture uniforms
- [ ] **Step 6:** Add texture cache and `ensureTexture()` to `WebGLRenderer`
- [ ] **Step 7:** Update `ensureGeometry()` to create UV buffers
- [ ] **Step 8:** Update render loop to pass textures to programs
- [ ] **Step 9:** Update example app to assign texture to material
- [ ] **Step 10:** Test and debug

---

## Testing Strategy

1. **Test without texture first:** Ensure UVs don't break existing rendering
2. **Test with solid color texture:** Use a simple colored image
3. **Test texture loading:** Verify blue pixel shows until image loads
4. **Test `onUpdate` callback:** Confirm texture updates when image loads
5. **Test multiple materials:** Some with textures, some without
6. **Test all geometry types:** Box, Sphere, Plane, Triangle

---

## Common Issues & Solutions

### Issue: Texture appears upside down

**Solution:** Flip V coordinate in geometry UV generation: `uvs[i] = 1.0 - v`

### Issue: Texture is black

**Possible causes:**

- UV buffer not bound correctly
- Texture unit not activated (`gl.activeTexture`)
- `uUseMap` not set to true
- Texture not uploaded (`needsUpdate` not processed)

### Issue: Nothing renders after adding textures

**Debug steps:**

1. Check shader compilation errors
2. Verify UV attribute binding
3. Test with `uUseMap = false` to isolate texture code

### Issue: Texture flickers or appears corrupted

**Solution:** Ensure `needsUpdate` is set to false after upload, check texture parameters match source data

---

## Future Enhancements

Once basic textures work:

1. Add support for multiple texture maps (normal, roughness, metalness)
2. Implement texture wrapping modes (REPEAT, MIRRORED_REPEAT)
3. Add texture filtering options
4. Support texture transforms (offset, rotation, scale)
5. Add texture compression support
6. Implement texture atlases for better performance

---

## Reference: Key Concepts

**UV Coordinates:** 2D coordinates (u, v) in range [0, 1] that map 3D vertices to 2D texture pixels. U = horizontal, V = vertical.

**Texture Units:** WebGL supports multiple simultaneous textures via texture units (TEXTURE0, TEXTURE1, etc.). You're using TEXTURE0.

**Mipmaps:** Pre-calculated, optimized sequences of images for better rendering quality and performance. Only works with power-of-2 textures.

**texture2D():** GLSL function to sample a texture at given UV coordinates. Returns vec4 (RGBA).

**needsUpdate Flag:** Tells renderer to re-upload texture data to GPU. Set by TextureLoader when image loads.

---

## Summary

Your texture system architecture is excellent. The main work is:

1. **Data path:** Add UVs to geometries → Upload UVs to GPU buffers
2. **Shader path:** Pass UVs from vertex to fragment shader → Sample textures
3. **Binding path:** Create WebGL textures → Bind to texture units → Update when needed

The strategy above gives you a complete, production-ready texture mapping system that integrates seamlessly with your existing material and rendering architecture.
