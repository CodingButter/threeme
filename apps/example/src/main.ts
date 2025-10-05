// apps/example/src/main.ts
// Scene: one sphere at the origin, a very dim sun (directional light), and
// two point lights orbiting around the sphere. Camera looks at the sphere.
import "@/index.css";
import {
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  PointLight,
  Mesh,
  WebGLRenderer,
  Scene,
  TextureLoader,
  SphereGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  BoxGeometry,
} from "@acme/threeme";
import { vec2, vec3 } from "gl-matrix";

import alphacube from "@/assets/alphacube.png";

// ---- setup ---------------------------------------------------------------
const scene = new Scene();

// Canvas + renderer
const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
document.body.appendChild(canvas);
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setClearColor(0xcccccc);
renderer.setSize(window.innerWidth, window.innerHeight);

// Camera: a comfortable view
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position = vec3.fromValues(0, 1.5, 3);
camera.lookAt(vec3.fromValues(0, 0, 0));
scene.add(camera);

// ---- geometry & materials -----------------------------------------------
// Central sphere
const cubeGeo = new BoxGeometry(1, 1, 1);
const texture = TextureLoader.load(alphacube);

const cubeMat = new MeshLambertMaterial({
  color: 0xffffff,
  map: texture,
  doubleSided: false,
  transparent: true,
});
const cube = new Mesh(cubeGeo, cubeMat);
scene.add(cube);

// ---- lighting ------------------------------------------------------------
// Ambient (soft fill)
scene.add(new AmbientLight(0xffffff, 0.25));

// Sun: a dim directional light high in the sky
const sun = new DirectionalLight(0xffffff, 2.0);
sun.position = vec3.fromValues(5, 5, 5);
//sun.lookAt(vec3.fromValues(0, 0, 0));
scene.add(sun);

// Two point lights orbiting the sphere
const pointLightContainer = new Object3D();
const numOfPointLights = 10;
const bulbGeo = new SphereGeometry(0.05, 20, 20);
const radius = 1.5;
//create point lights all around the sphere in a sphere shape with random colors
for (let i = 0; i < numOfPointLights; i++) {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / numOfPointLights); // polar angle
  const theta = Math.PI * (1 + 5 ** 0.5) * (i + 0.5); // azimuthal angle (golden angle)
  const color = Math.random() * 0xffffff;
  const x = Math.cos(theta) * Math.sin(phi) * radius;
  const y = Math.sin(theta) * Math.sin(phi) * radius;
  const z = Math.cos(phi) * radius;
  const light = new PointLight(color, 1.0, 3.0, 2.0);
  light.position = vec3.fromValues(x, y, z);

  const bulbMat = new MeshBasicMaterial({ color });
  const bulbMesh = new Mesh(bulbGeo, bulbMat);
  light.add(bulbMesh); // add bulb mesh to the light so it moves with the light
  pointLightContainer.add(light);
}
scene.add(pointLightContainer);

//-- animation loop ------------------------------------------------------
let t = 0;
let prev = performance.now();
let sunRadius = vec2.length(vec2.fromValues(sun.position[0], sun.position[2]));
function tick(now: number) {
  const dt = (now - prev) * 0.001;
  prev = now;
  t += dt;

  // Orbit the two lamps on opposite sides of the sphere
  cube.rotateX(0.5 * dt);
  cube.rotateY(0.2 * dt);
  cube.rotateZ(0.3 * dt);
  pointLightContainer.setRotationEulerXYZ(Math.cos(-t), Math.sin(t), Math.sin(-t));
  sun.position[0] = Math.cos(t * 0.8) * sunRadius;
  sun.position[2] = Math.sin(t * 0.8) * sunRadius;
  sun.lookAt(vec3.fromValues(0, 0, 0)); // point towards the sphere
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// renderer.render(scene, camera);

// ---- resize handling -----------------------------------------------------
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if ((camera as any).setAspect) (camera as any).setAspect(w / h);
  (camera as any).aspect = w / h; // in case your camera stores aspect directly
});
