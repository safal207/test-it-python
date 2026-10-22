/* AI Desk · original procedural Three.js scene for AI PATH.
 * All meshes and textures are authored here; no remote assets or Spline file.
 * Public API: createDeskScene(canvas, options) → scene controller.
 */
import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three-rounded-box.js';

const MATERIALS = new Set(['oak', 'walnut', 'white']);
const LIGHTING = new Set(['day', 'evening']);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function woodTexture(dark = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = dark ? '#674735' : '#c99b64';
  context.fillRect(0, 0, 512, 512);
  // Repeatable grain: the same scene never depends on random network assets.
  for (let line = 0; line < 105; line++) {
    const y = line * 5;
    const sway = Math.sin(line * 2.37) * 9;
    context.strokeStyle = dark
      ? `rgba(35,19,10,${0.035 + (line % 5) * 0.014})`
      : `rgba(91,53,20,${0.035 + (line % 5) * 0.012})`;
    context.lineWidth = line % 7 === 0 ? 2 : 0.7;
    context.beginPath();
    context.moveTo(-15, y);
    context.bezierCurveTo(130, y + sway, 330, y - sway, 530, y + 3);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function displayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 448;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 768, 448);
  gradient.addColorStop(0, '#173f49');
  gradient.addColorStop(1, '#091f2d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 768, 448);
  context.fillStyle = '#a8ddd1';
  context.font = '500 23px sans-serif';
  context.fillText('AI PATH / DESIGN LAB', 48, 65);
  context.fillStyle = '#f4f5e8';
  context.font = '600 62px sans-serif';
  context.fillText('Make room', 48, 154);
  context.fillText('for your ideas.', 48, 225);
  context.fillStyle = '#e8c38a';
  context.beginPath();
  context.arc(626, 157, 64, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#82b5a1';
  context.beginPath();
  context.moveTo(522, 360);
  context.lineTo(626, 213);
  context.lineTo(734, 360);
  context.closePath();
  context.fill();
  context.fillStyle = '#6a9b8c';
  context.fillRect(48, 289, 205, 8);
  context.fillStyle = '#3c6470';
  context.fillRect(48, 317, 302, 8);
  context.fillRect(48, 345, 252, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDeskScene(canvas, options = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('AI Desk needs a canvas element.');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.4, -2.4, 0.1, 40);
  const target = new THREE.Vector3(0, 1.18, 0.2);
  const state = {
    material: MATERIALS.has(options.material) ? options.material : 'oak',
    lighting: LIGHTING.has(options.lighting) ? options.lighting : 'day',
    azimuth: 0.67,
    polar: 1.03,
    zoom: 1,
  };
  let disposed = false;
  let lost = false;
  let frame = 0;
  const cleanups = [];
  const textures = [woodTexture(false), woodTexture(true), displayTexture()];
  const oak = new THREE.MeshStandardMaterial({ map: textures[0], roughness: 0.67, color: 0xffebd0 });
  const walnut = new THREE.MeshStandardMaterial({ map: textures[1], roughness: 0.63, color: 0xe5c3a4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xecebe4, roughness: 0.49 });
  const topMaterials = { oak, walnut, white };
  const graphite = new THREE.MeshStandardMaterial({ color: 0x293a38, roughness: 0.53, metalness: 0.26 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1c2628, roughness: 0.57 });
  const sage = new THREE.MeshStandardMaterial({ color: 0x87a292, roughness: 0.91 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe5dfcf, roughness: 0.85 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf5eee0, roughness: 0.98 });
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xbb7656, roughness: 0.86 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x446e4d, roughness: 0.88 });
  const leafLight = new THREE.MeshStandardMaterial({ color: 0x6a8f5a, roughness: 0.9 });

  function mesh(geometry, material, x, y, z, parent = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, material, x, y, z, radius = 0.025, parent = scene) {
    return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), material, x, y, z, parent);
  }
  function cylinder(rt, rb, h, material, x, y, z, parent = scene) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, 24), material, x, y, z, parent);
  }
  function rod(from, to, radius, material, parent = scene) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const object = cylinder(radius, radius, start.distanceTo(end), material, 0, 0, 0, parent);
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return object;
  }

  // A small raised platform gives the miniature a clearly bounded silhouette.
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xe4dfcf, roughness: 0.94 });
  cylinder(2.65, 2.65, 0.12, platformMaterial, 0, -0.09, 0.25);
  const rug = cylinder(1.36, 1.36, 0.012, new THREE.MeshStandardMaterial({ color: 0xc7c8b3, roughness: 1 }), 0.55, -0.018, 0.65);
  rug.scale.z = 1.1;

  const deskTop = box(3.35, 0.13, 1.55, topMaterials[state.material], 0, 1.65, 0, 0.07);
  // Two trestles, each with two feet: all four legs terminate on the platform.
  [-1.27, 1.27].forEach((x) => {
    [-0.52, 0.52].forEach((z) => {
      rod([x, 0.04, z * 1.11], [x * 0.96, 1.58, z * 0.86], 0.045, graphite);
      cylinder(0.072, 0.072, 0.035, black, x, 0.015, z * 1.11);
    });
    box(0.08, 0.07, 1.15, graphite, x, 1.53, 0);
  });
  box(2.5, 0.07, 0.07, graphite, 0, 0.64, -0.5);

  // Monitor and a tiny authored interface texture, facing the visitor.
  box(0.49, 0.035, 0.31, graphite, -0.2, 1.735, -0.29);
  box(0.075, 0.36, 0.075, graphite, -0.2, 1.9, -0.34);
  box(1.3, 0.83, 0.085, black, -0.2, 2.32, -0.37, 0.04);
  const screen = mesh(new THREE.PlaneGeometry(1.19, 0.695), new THREE.MeshBasicMaterial({ map: textures[2], toneMapped: false }), -0.2, 2.34, -0.324);
  screen.castShadow = false;
  cylinder(0.015, 0.015, 0.005, new THREE.MeshBasicMaterial({ color: 0x92b7a4 }), -0.2, 1.936, -0.32).rotation.x = Math.PI / 2;

  // Keyboard and trackpad share a quiet cream finish.
  box(1.06, 0.055, 0.36, cream, -0.26, 1.75, 0.35, 0.025);
  const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xf9f3e5, roughness: 0.8 });
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 11; col++) {
      box(0.067, 0.012, 0.05, keyMaterial, -0.7 + col * 0.087, 1.784, 0.24 + row * 0.071, 0.006);
    }
  }
  box(0.33, 0.01, 0.03, keyMaterial, -0.26, 1.784, 0.48, 0.004);
  box(0.28, 0.035, 0.34, cream, 0.52, 1.745, 0.35, 0.035);

  // A chair, slightly turned from the desk, with a five-spoke rolling base.
  const chair = new THREE.Group();
  chair.position.set(0.7, 0, 1.3);
  chair.rotation.y = -0.19;
  scene.add(chair);
  cylinder(0.064, 0.08, 0.62, graphite, 0, 0.46, 0, chair);
  for (let n = 0; n < 5; n++) {
    const angle = n * Math.PI * 2 / 5;
    const x = Math.cos(angle) * 0.44;
    const z = Math.sin(angle) * 0.44;
    rod([0, 0.23, 0], [x, 0.1, z], 0.035, graphite, chair);
    const wheel = cylinder(0.075, 0.075, 0.065, black, x, 0.075, z, chair);
    wheel.rotation.z = Math.PI / 2;
    wheel.rotation.y = -angle;
  }
  box(0.9, 0.15, 0.79, sage, 0, 0.87, 0, 0.10, chair);
  rod([-0.32, 0.87, 0.25], [-0.32, 1.57, 0.4], 0.028, graphite, chair);
  rod([0.32, 0.87, 0.25], [0.32, 1.57, 0.4], 0.028, graphite, chair);
  const chairBack = box(0.87, 0.72, 0.145, sage, 0, 1.46, 0.4, 0.095, chair);
  chairBack.rotation.x = -0.1;
  [-0.49, 0.49].forEach((x) => {
    rod([x * 0.84, 0.85, 0.1], [x, 1.12, 0.1], 0.023, graphite, chair);
    box(0.095, 0.055, 0.38, graphite, x, 1.15, 0.06, 0.025, chair);
  });

  // Lamp: real warm light accompanies the evening material preset.
  cylinder(0.19, 0.22, 0.045, graphite, 1.15, 1.74, -0.35);
  rod([1.15, 1.76, -0.35], [1.15, 2.28, -0.35], 0.022, graphite);
  rod([1.15, 2.28, -0.35], [0.98, 2.43, -0.31], 0.022, graphite);
  cylinder(0.075, 0.23, 0.22, graphite, 0.98, 2.36, -0.31);
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xffd394, emissive: 0xffbd68, emissiveIntensity: 0.25 });
  cylinder(0.214, 0.214, 0.012, bulbMaterial, 0.98, 2.245, -0.31);
  const lampLight = new THREE.PointLight(0xffc079, 0.3, 3.5, 2);
  lampLight.position.set(0.98, 2.19, -0.31);
  scene.add(lampLight);

  // Plant leaves are simple original ellipsoids, rather than imported assets.
  cylinder(0.16, 0.125, 0.29, terracotta, -1.23, 1.86, -0.39);
  cylinder(0.144, 0.144, 0.014, new THREE.MeshStandardMaterial({ color: 0x493e2b, roughness: 1 }), -1.23, 2.01, -0.39);
  for (let n = 0; n < 7; n++) {
    const angle = n * 2.4;
    const x = -1.23 + Math.cos(angle) * 0.17;
    const z = -0.39 + Math.sin(angle) * 0.17;
    const y = 2.16 + (n % 3) * 0.075;
    rod([-1.23, 1.99, -0.39], [x, y, z], 0.009, leafMaterial);
    const leaf = mesh(new THREE.SphereGeometry(1, 10, 8), n % 2 ? leafMaterial : leafLight, x, y, z);
    leaf.scale.set(0.095, 0.18, 0.032);
    leaf.rotation.set(0.3, -angle, -Math.cos(angle) * 0.65);
  }

  // Notebook, pencil and ceramic mug make the desk feel occupied.
  const notebook = new THREE.Group();
  notebook.position.set(1.1, 1.75, 0.36);
  notebook.rotation.y = -0.18;
  scene.add(notebook);
  box(0.53, 0.05, 0.46, new THREE.MeshStandardMaterial({ color: 0xc3ad82, roughness: 0.87 }), 0, 0, 0, 0.014, notebook);
  box(0.49, 0.026, 0.435, paper, 0.008, 0, 0, 0.007, notebook);
  box(0.53, 0.008, 0.46, new THREE.MeshStandardMaterial({ color: 0xc3ad82, roughness: 0.87 }), 0, 0.026, 0, 0.006, notebook);
  rod([-0.16, 0.045, 0.04], [0.2, 0.045, -0.08], 0.012, graphite, notebook);
  const mug = cylinder(0.105, 0.091, 0.21, cream, -1.15, 1.82, 0.34);
  const coffee = cylinder(0.091, 0.091, 0.008, new THREE.MeshStandardMaterial({ color: 0x4f3125, roughness: 0.4 }), -1.15, 1.929, 0.34);
  const handle = mesh(new THREE.TorusGeometry(0.075, 0.019, 8, 20), cream, -1.28, 1.83, 0.34);
  handle.scale.x = 0.75;
  mug.castShadow = coffee.castShadow = handle.castShadow = true;

  const hemisphere = new THREE.HemisphereLight(0xeaf6f8, 0xb0a18a, 2);
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight(0xfff1d8, 3.0);
  keyLight.position.set(-3.5, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.camera.right = keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.bias = -0.0007;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.radius = 3;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xb8dfe7, 0.8);
  rimLight.position.set(4, 4, -3);
  scene.add(rimLight);

  function updateCamera() {
    const radius = 9;
    camera.position.set(
      target.x + radius * Math.sin(state.polar) * Math.sin(state.azimuth),
      target.y + radius * Math.cos(state.polar),
      target.z + radius * Math.sin(state.polar) * Math.cos(state.azimuth),
    );
    camera.lookAt(target);
    camera.zoom = state.zoom;
    camera.updateProjectionMatrix();
  }
  function requestRender() {
    if (disposed || lost || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (disposed || lost) return;
      try {
        renderer.render(scene, camera);
      } catch (error) {
        lost = true;
        options.onError?.(error);
      }
    });
  }
  function setMaterial(id) {
    if (!MATERIALS.has(id)) return false;
    state.material = id;
    deskTop.material = topMaterials[id];
    requestRender();
    return true;
  }
  function setLighting(id) {
    if (!LIGHTING.has(id)) return false;
    state.lighting = id;
    const evening = id === 'evening';
    hemisphere.color.set(evening ? 0x94abc7 : 0xeaf6f8);
    hemisphere.groundColor.set(evening ? 0x786b67 : 0xb0a18a);
    hemisphere.intensity = evening ? 1.05 : 2;
    keyLight.color.set(evening ? 0xb8c8e3 : 0xfff1d8);
    keyLight.intensity = evening ? 0.95 : 3;
    rimLight.color.set(evening ? 0x869cce : 0xb8dfe7);
    rimLight.intensity = evening ? 0.7 : 0.8;
    lampLight.intensity = evening ? 5.5 : 0.3;
    bulbMaterial.emissiveIntensity = evening ? 2.2 : 0.25;
    renderer.toneMappingExposure = evening ? 1.05 : 1.12;
    platformMaterial.color.set(evening ? 0xb5b3b0 : 0xe4dfcf);
    requestRender();
    return true;
  }
  function resetView() {
    state.azimuth = 0.67;
    state.polar = 1.03;
    state.zoom = 1;
    updateCamera();
    requestRender();
  }
  function resize() {
    if (disposed || lost) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const aspect = width / height;
    const frustumHeight = Math.max(4.65, 6.1 / aspect);
    camera.left = -frustumHeight * aspect / 2;
    camera.right = frustumHeight * aspect / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    renderer.setSize(width, height, false);
    updateCamera();
    requestRender();
  }
  function on(targetElement, type, listener, listenerOptions) {
    targetElement.addEventListener(type, listener, listenerOptions);
    cleanups.push(() => targetElement.removeEventListener(type, listener, listenerOptions));
  }
  function interacted(kind) {
    options.onInteraction?.(kind);
    updateCamera();
    requestRender();
  }

  const pointers = new Map();
  let pinchDistance = 0;
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  on(canvas, 'pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture?.(event.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  on(canvas, 'pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0 && distance > 0) state.zoom = clamp(state.zoom * distance / pinchDistance, 0.72, 1.65);
      pinchDistance = distance;
      interacted('zoom');
      return;
    }
    state.azimuth -= dx * 0.008;
    state.polar = clamp(state.polar - dy * 0.006, 0.45, 1.39);
    interacted('orbit');
  });
  function endPointer(event) {
    pointers.delete(event.pointerId);
    pinchDistance = 0;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  on(canvas, 'pointerup', endPointer);
  on(canvas, 'pointercancel', endPointer);
  on(canvas, 'lostpointercapture', (event) => { pointers.delete(event.pointerId); pinchDistance = 0; });
  on(canvas, 'wheel', (event) => {
    event.preventDefault();
    state.zoom = clamp(state.zoom * Math.exp(-event.deltaY * 0.001), 0.72, 1.65);
    interacted('zoom');
  }, { passive: false });
  on(canvas, 'keydown', (event) => {
    const actions = {
      ArrowLeft: () => { state.azimuth += 0.12; },
      ArrowRight: () => { state.azimuth -= 0.12; },
      ArrowUp: () => { state.polar = clamp(state.polar - 0.1, 0.45, 1.39); },
      ArrowDown: () => { state.polar = clamp(state.polar + 0.1, 0.45, 1.39); },
      '+': () => { state.zoom = clamp(state.zoom + 0.1, 0.72, 1.65); },
      '=': () => { state.zoom = clamp(state.zoom + 0.1, 0.72, 1.65); },
      '-': () => { state.zoom = clamp(state.zoom - 0.1, 0.72, 1.65); },
      Home: resetView,
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
    interacted('keyboard');
  });
  on(canvas, 'webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    options.onContextLost?.();
  });
  on(canvas, 'webglcontextrestored', () => {
    lost = false;
    resize();
    options.onContextRestored?.();
  });

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  if (!observer) on(window, 'resize', resize);
  setLighting(state.lighting);
  resize();

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    observer?.disconnect();
    cleanups.forEach((cleanup) => cleanup());
    canvas.style.touchAction = previousTouchAction;
    const geometries = new Set();
    const materials = new Set([oak, walnut, white]);
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
      else if (object.material) materials.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    keyLight.shadow.map?.dispose();
    renderer.dispose();
    pointers.clear();
  }

  return { setMaterial, setLighting, resetView, resize, dispose, getState: () => ({ ...state }) };
}
