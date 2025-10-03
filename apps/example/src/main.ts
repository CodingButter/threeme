import * as THREE from "@acme/threeme";

// define canvas
const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x223344, 1);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position[2] = 5;
camera.position[1] = 3; // step back from origin so we can see the triangle

// Lights
const sun = new THREE.DirectionalLight(0xffffff, 0.5);
sun.position[1] = 5;
scene.add(sun);
// dummy sphere to visualize light position
const sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 12),
  new THREE.MeshBasicMaterial(0xffff00)
);
sun.add(sunSphere);
// ambient light to brighten shadows

const ambient = new THREE.AmbientLight(0xffffff, 0.25); // soft global fill
scene.add(ambient);

// Mesh

// Cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial(0xff8844)
);
cube.position[0] = 1.5;
cube.position[1] = 0.5;
scene.add(cube);

// Sphere
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 16, 12),
  new THREE.MeshLambertMaterial(0xffffff)
);
sphere.position[0] = -1.5;
sphere.position[1] = 0.5;
scene.add(sphere);

// XZ ground plane, normal +Y
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 5, 1, 1),
  new THREE.MeshLambertMaterial(0x88aa88, true)
);

ground.position[1] = 0; // sit at y = 0 (optional)
ground.rotateX(Math.PI / 2); // rotate to lie in XZ plane
scene.add(ground);

let t = 0;
const r = 10; // radius
function frame() {
  t += 0.016; // ~60 FPS
  sun.position[0] = Math.cos(t) * r;
  sun.position[2] = Math.sin(t) * r;
  sun.lookAt([0, 0, 0]);

  camera.lookAt([0, 0, 0]);
  // Or, if you want the camera to always point at the sun:
  //camera.lookAt(sun.position, [0, 1, 0]);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspect(window.innerWidth / window.innerHeight);
});
