import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;

const SKY_RADIUS = 500;

// lightning / neuron bolt settings
const bolts = [];
const MAX_BOLTS = 8;
const BOLT_LIFETIME = 0.7;
const BOLT_SEGMENTS = 16;
const BOLT_JITTER = 40;
let lastTime = performance.now() / 1000;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.3);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  // RED SKYBOX
  const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 64, 64);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.dampingFactor = 0.05;

  window.addEventListener('resize', onWindowResize);
}

function randomPointInSphere(radius) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  const sinPhi = Math.sin(phi);

  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
}

// ⚡ neon cyan bolt w/ halo glow
function createBolt() {
  const start = randomPointInSphere(SKY_RADIUS * 0.8);
  const end   = randomPointInSphere(SKY_RADIUS * 0.8);

  const positions = new Float32Array((BOLT_SEGMENTS + 1) * 3);

  for (let i = 0; i <= BOLT_SEGMENTS; i++) {
    const t = i / BOLT_SEGMENTS;
    const point = new THREE.Vector3().lerpVectors(start, end, t);

    point.x += (Math.random() - 0.5) * BOLT_JITTER;
    point.y += (Math.random() - 0.5) * BOLT_JITTER;
    point.z += (Math.random() - 0.5) * BOLT_JITTER;

    positions[i * 3]     = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // neon cyan CORE
  const coreMat = new THREE.LineBasicMaterial({
    color: 0x00faff,
    transparent: true,
    opacity: 1.0
  });
  const coreLine = new THREE.Line(geom, coreMat);
  scene.add(coreLine);

  // halo layers (cyan → teal)
  const haloColors = [0x66ffff, 0x33ddff, 0x00bbff];
  const halos = [];

  for (let i = 0; i < haloColors.length; i++) {
    const haloMat = new THREE.LineBasicMaterial({
      color: haloColors[i],
      transparent: true,
      opacity: 0.35 / (i + 1),
      linewidth: (i + 1) * 3
    });

    const halo = new THREE.Line(geom.clone(), haloMat);
    scene.add(halo);
    halos.push(halo);
  }

  return {
    core: coreLine,
    halos,
    life: BOLT_LIFETIME
  };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now() / 1000;
  const dt = now - lastTime;
  lastTime = now;

  // update bolts
  for (let i = bolts.length - 1; i >= 0; i--) {
    const bolt = bolts[i];
    bolt.life -= dt;

    bolt.core.material.opacity = Math.max(bolt.life / BOLT_LIFETIME, 0);

    bolt.halos.forEach((h, idx) => {
      const base = 0.35 / (idx + 1);
      h.material.opacity = Math.max((bolt.life / BOLT_LIFETIME) * base, 0);
    });

    if (bolt.life <= 0) {
      scene.remove(bolt.core);
      bolt.core.geometry.dispose();
      bolt.core.material.dispose();

      bolt.halos.forEach(h => {
        scene.remove(h);
        h.geometry.dispose();
        h.material.dispose();
      });

      bolts.splice(i, 1);
    }
  }

  // spawn neon cyan bolts
  if (bolts.length < MAX_BOLTS && Math.random() < 0.08) {
    bolts.push(createBolt());
  }

  controls.update();
  renderer.render(scene, camera);
}
