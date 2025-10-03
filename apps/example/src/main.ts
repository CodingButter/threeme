// apps/example/src/main.ts
// Scene: one sphere at the origin, a very dim sun (directional light), and
// two point lights orbiting around the sphere. Camera looks at the sphere.

import {
  PerspectiveCamera,
  SphereGeometry,
  AmbientLight,
  DirectionalLight,
  PointLight,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Mesh,
  WebGLRenderer,
  Scene,
} from "@acme/threeme";
import { vec3 } from "gl-matrix";

// ---- setup ---------------------------------------------------------------
const scene = new Scene();

// Canvas + renderer
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);

// Camera: a comfortable view
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position = vec3.fromValues(0, 1.5, 3);
camera.lookAt(vec3.fromValues(0, 0, 0));
scene.add(camera);

// ---- geometry & materials -----------------------------------------------
// Central sphere
const sphere = new Mesh(new SphereGeometry(0.75, 32, 16), new MeshLambertMaterial(0xaaaaaa));
scene.add(sphere);

// Optional: a tiny ground hint (comment out if you don't have PlaneGeometry)
// import { PlaneGeometry } from "@/geometry/PlaneGeometry";
// const ground = new Mesh(new PlaneGeometry(6, 6, 1, 1), new MeshLambertMaterial(0x333333));
// ground.rotation.x = -Math.PI / 2;
// ground.position.y = -0.76;
// scene.add(ground);

// ---- lighting ------------------------------------------------------------
// Ambient (soft fill)
scene.add(new AmbientLight(0xff0000, 0.14));

// Sun: a dim directional light high in the sky
const sun = new DirectionalLight(0x00ff00, 1);
sun.position = vec3.fromValues(0, 0, 0);
scene.add(sun);

// Two point lights orbiting the sphere
const lampA = new PointLight(0xff6666, 1.5, /*distance*/ 4.0, /*decay*/ 2.0);
const lampB = new PointLight(0x6699ff, 1.5, /*distance*/ 4.0, /*decay*/ 2.0);
scene.add(lampA);
scene.add(lampB);

// Small visible bulbs so you can see where the point lights are
const bulbMatA = new MeshBasicMaterial(0xff6666);
const bulbMatB = new MeshBasicMaterial(0x6699ff);
const bulbGeo = new SphereGeometry(0.05, 8, 8);
const bulbA = new Mesh(bulbGeo, bulbMatA);
const bulbB = new Mesh(bulbGeo, bulbMatB);
lampA.add(bulbA);
lampB.add(bulbB);

// ---- animation loop ------------------------------------------------------
let t = 0;
let prev = performance.now();

function tick(now: number) {
  const dt = (now - prev) * 0.001;
  prev = now;
  t += dt;

  // Orbit the two lamps on opposite sides of the sphere
  const r = 1.5;
  lampA.position = vec3.fromValues(Math.cos(t) * r, 0.5, Math.sin(t) * r);
  lampB.position = vec3.fromValues(Math.cos(t + Math.PI) * r, -0.5, Math.sin(t + Math.PI) * r);

  sun.lookAt(0, 0, 0); // point towards the sphere
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// ---- resize handling -----------------------------------------------------
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if ((camera as any).setAspect) (camera as any).setAspect(w / h);
  (camera as any).aspect = w / h; // in case your camera stores aspect directly
});
