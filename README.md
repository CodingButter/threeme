# ThreeMe

A lightweight, modern 3D rendering library built on WebGL for TypeScript/JavaScript applications. Inspired by Three.js but designed to be minimal, performant, and developer-friendly.

## Features

- **WebGL Rendering** - Full WebGL and WebGL2 support with automatic fallback
- **3D Primitives** - Box, Sphere, Plane, and Triangle geometries out of the box
- **Material System** - Basic and Lambert (Phong-like) materials with lighting support
- **Scene Graph** - Hierarchical object system with transform inheritance
- **Lighting** - Directional and ambient light support
- **Camera System** - Perspective camera with configurable FOV and aspect ratio
- **TypeScript First** - Full type safety with excellent IDE support
- **Zero Dependencies** - Only depends on `gl-matrix` for math operations
- **Monorepo Architecture** - Built with Bun workspaces for clean organization

## Installation

```bash
# Using Bun (recommended)
bun add @acme/threeme

# Using npm
npm install @acme/threeme

# Using yarn
yarn add @acme/threeme
```

## Quick Start

```typescript
import * as THREE from "@acme/threeme";

// Create canvas and renderer
const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x223344, 1);

// Create scene
const scene = new THREE.Scene();

// Create camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position[2] = 5;
camera.position[1] = 3;

// Add lighting
const sun = new THREE.DirectionalLight(0xffffff, 0.5);
sun.position[1] = 5;
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

// Create a mesh
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial(0xff8844)
);
cube.position[0] = 1.5;
scene.add(cube);

// Render loop
function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Handle resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspect(window.innerWidth / window.innerHeight);
});
```

## Core Concepts

### Renderer

The WebGLRenderer is responsible for drawing your scene to the canvas.

```typescript
const renderer = new THREE.WebGLRenderer({
  canvas,           // HTMLCanvasElement (optional)
  antialias: true,  // Enable antialiasing
  alpha: false,     // Transparent background
});

renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1); // Hex color, alpha
```

### Scene

A container for all your 3D objects, lights, and cameras.

```typescript
const scene = new THREE.Scene();
scene.add(mesh);
scene.add(light);
```

### Camera

Currently supports perspective projection:

```typescript
const camera = new THREE.PerspectiveCamera(
  fov,    // Field of view in degrees
  aspect, // Width / height
  near,   // Near clipping plane
  far     // Far clipping plane
);

camera.position[0] = x;
camera.position[1] = y;
camera.position[2] = z;
camera.lookAt([0, 0, 0]);
```

### Geometries

Built-in geometry primitives:

```typescript
// Box
const box = new THREE.BoxGeometry(width, height, depth);

// Sphere
const sphere = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

// Plane
const plane = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

// Triangle
const triangle = new THREE.TriangleGeometry();
```

### Materials

Two material types available:

```typescript
// Basic (unlit, flat color)
const basic = new THREE.MeshBasicMaterial(0xff0000); // Hex color

// Lambert (lit, diffuse shading)
const lambert = new THREE.MeshLambertMaterial(0x00ff00, doubleSided?);
```

### Lighting

Support for directional and ambient lights:

```typescript
// Directional light (like sunlight)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position[1] = 10;
scene.add(dirLight);

// Ambient light (global fill)
const ambient = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambient);
```

### Meshes

Combine geometry and material to create renderable objects:

```typescript
const mesh = new THREE.Mesh(geometry, material);
mesh.position[0] = x;
mesh.position[1] = y;
mesh.position[2] = z;
mesh.rotateX(angle);
mesh.rotateY(angle);
mesh.rotateZ(angle);
scene.add(mesh);
```

## Project Structure

```
threeme/
├── apps/
│   └── example/          # Demo application
├── packages/
│   ├── config/          # Shared build configs
│   └── threeme/         # Main library
│       ├── cameras/     # Camera implementations
│       ├── geometry/    # Geometry primitives
│       ├── lights/      # Light sources
│       ├── materials/   # Material system
│       ├── meshes/      # Mesh objects
│       ├── objects/     # Base Object3D
│       ├── renderers/   # WebGL renderer
│       ├── scenes/      # Scene management
│       └── utils/       # Utility functions
```

## Development

This project uses Bun as the runtime and package manager.

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Lint
bun run lint

# Format code
bun run format:fix
```

## Module Exports

The library provides granular exports for tree-shaking:

```typescript
import * from "@acme/threeme";           // All modules
import * from "@acme/threeme/core";      // Core types
import * from "@acme/threeme/cameras";   // Cameras
import * from "@acme/threeme/geometry";  // Geometries
import * from "@acme/threeme/materials"; // Materials
import * from "@acme/threeme/meshes";    // Meshes
import * from "@acme/threeme/lights";    // Lights
import * from "@acme/threeme/renderers"; // Renderers
import * from "@acme/threeme/scenes";    // Scenes
import * from "@acme/threeme/utils";     // Utilities
```

## Browser Support

- Modern browsers with WebGL support
- WebGL 2.0 with automatic fallback to WebGL 1.0
- Requires support for typed arrays and ES6 modules

## Performance Tips

1. **Reuse geometries** - The renderer caches geometry buffers automatically
2. **Use device pixel ratio wisely** - Higher DPR increases rendering cost
3. **Limit draw calls** - Combine meshes when possible
4. **Use appropriate geometry detail** - Lower segment counts for distant objects
5. **Profile with browser dev tools** - Use the performance tab to identify bottlenecks

## Roadmap

- [ ] Texture support
- [ ] Point and spot lights
- [ ] Shadow mapping
- [ ] Additional geometries (cylinder, torus, etc.)
- [ ] Orthographic camera
- [ ] Post-processing effects
- [ ] Instanced rendering
- [ ] Custom shader materials

## License

MIT License - Copyright (c) 2025 Jamie Nichols

See [LICENSE](./LICENSE) for full text.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- Inspired by [Three.js](https://threejs.org/)
- Built with [Bun](https://bun.sh)
- Math operations powered by [gl-matrix](https://glmatrix.net/)

---

**Made with ❤️ by Jamie Nichols**
