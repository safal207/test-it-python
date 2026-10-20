import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three-rounded-box.js';

// One model, one reversible timeline. No remote models, textures or telemetry.
const canvas = document.querySelector('#scene');
const wrap = document.querySelector('#sceneWrap');
const journey = document.querySelector('#experience');
const slider = document.querySelector('#progress');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const stages = [
  ['Чертёж', 'Начинаем с планировки. Вид сверху помогает увидеть зоны и проходы.'],
  ['План получает объём', 'Стены поднимаются из тех же линий. У плана появляется высота.'],
  ['Место для жизни', 'Диван, кухня и предметы собираются в одной сцене. Проверяем пропорции.'],
  ['Характер в материалах', 'Дерево, камень, ткань и зелень делают пространство своим.'],
  ['Свет меняет всё', 'Тёплые акценты, дневной свет и тени завершают интерьер.']
];
const clamp = v => Math.max(0, Math.min(1, v));
const ease = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
let progress = 0;
let renderScene = () => {};
let lastStage = -1;
let renderer;

function update(value) {
  progress = clamp(value);
  const percent = Math.round(progress * 100);
  const stage = Math.min(4, Math.floor(progress * 4 + 0.5));
  document.body.dataset.progress = String(percent);
  slider.value = String(percent);
  document.querySelector('#percent').textContent = `${percent}%`;
  slider.setAttribute('aria-valuetext', `${percent}% — ${stages[stage][0]}`);
  if (stage !== lastStage) {
    document.querySelector('#stageNumber').textContent = `0${stage + 1} / 05`;
    document.querySelector('#stageTitle').textContent = stages[stage][0];
    document.querySelector('#stageDescription').textContent = stages[stage][1];
    document.querySelectorAll('[data-stage]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === stage * 25));
    });
    lastStage = stage;
  }
  renderScene(progress);
}

function scrollProgress() {
  const rect = journey.getBoundingClientRect();
  return clamp(-rect.top / Math.max(1, journey.offsetHeight - innerHeight));
}
let scrollFrame = 0;
addEventListener('scroll', () => {
  if (reduced.matches || scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; update(scrollProgress()); });
}, { passive: true });
// Keep native scrolling and direct controls on the same timeline, without smooth-scroll races.
function choose(value) {
  if (!reduced.matches) {
    const top = scrollY + journey.getBoundingClientRect().top;
    scrollTo({ top: top + value * Math.max(1, journey.offsetHeight - innerHeight), behavior: 'instant' });
  }
  update(value);
}
slider.addEventListener('input', () => choose(Number(slider.value) / 100));
document.querySelectorAll('[data-stage]').forEach(button => {
  button.addEventListener('click', () => choose(Number(button.dataset.stage) / 100));
});
reduced.addEventListener('change', () => {
  if (!reduced.matches) update(scrollProgress());
});

function fallback() {
  canvas.hidden = true;
  document.querySelector('#sceneFallback').hidden = false;
  document.querySelector('#renderStatus').textContent = '3D недоступен на этом устройстве. План и описание этапов остаются доступны.';
  document.body.dataset.renderer = 'fallback';
  document.body.dataset.ready = 'true';
}

function setup() {
  // Probe before constructing Three.js to avoid its error log on unsupported devices.
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' });
  if (!context) { fallback(); return; }
  renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  const plan = new THREE.Group();
  const walls = new THREE.Group();
  const furniture = new THREE.Group();
  const details = new THREE.Group();
  scene.add(plan, walls, furniture, details);
  const surfaceMaterials = [];
  const white = new THREE.Color('#eeeae1');
  const green = new THREE.Color('#71806a');
  const linen = new THREE.Color('#c7b9a3');
  let sage = false;
  function material(color, roughness = 0.8, options = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, ...options });
    surfaceMaterials.push({ material: m, color: new THREE.Color(color) });
    return m;
  }
  const plaster = material('#e4dfd1');
  const oak = material('#aa8050');
  const walnut = material('#604d39');
  const stone = material('#c6bba3');
  const fabric = material('#c7b9a3');
  const cushion = material('#a75e40');
  const sageMat = material('#71806a');
  const charcoal = material('#343a34');
  const cream = material('#e5ddc9');
  const metal = material('#a48b59', 0.32, { metalness: 0.65 });
  const leaf = material('#436747');
  const rugMat = material('#b7aa91');
  const glass = material('#a6b9b0', 0.22, { metalness: 0.12 });
  const boxCache = new Map();
  function box(group, x, y, z, w, h, d, mat, radius = 0) {
    const key = `${w}/${h}/${d}/${radius}`;
    if (!boxCache.has(key)) boxCache.set(key, radius
      ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3))
      : new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(boxCache.get(key), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function cylinder(group, x, y, z, r1, r2, h, mat) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 20), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function line(points, color = '#59685d', opacity = 1) {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), mat);
    plan.add(mesh);
    return mesh;
  }
  function rectangle(x, z, w, d, color) {
    line([[x-w/2,.045,z-d/2],[x+w/2,.045,z-d/2],[x+w/2,.045,z+d/2],[x-w/2,.045,z+d/2],[x-w/2,.045,z-d/2]], color);
  }
  function label(text, x, z, width = 2.2) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#4e5e53'; ctx.font = '500 32px Arial'; ctx.textAlign = 'center';
    ctx.fillText(text, 256, 59);
    const map = new THREE.CanvasTexture(c);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 96 / 512), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .06, z); plan.add(mesh);
  }
  // Floor plan: the footprint is shared with every object below.
  const grid = new THREE.GridHelper(18, 36, '#d3d4c9', '#e4e4d9');
  grid.position.y = -.025;
  plan.add(grid);
  rectangle(0, 0, 10, 8, '#3d4c43');
  rectangle(0, 0, 9.7, 7.7, '#879183');
  rectangle(-1.4, 1.35, 4.9, 2.1);
  rectangle(-3.2, .5, 1.3, 3.0);
  rectangle(-1.15, -.55, 2.1, 1.2);
  rectangle(2.1, -3.35, 5.35, 1.15);
  rectangle(1.9, -1.15, 3.5, 1.25);
  rectangle(-3.25, -3.7, 2.2, .45);
  for (let i = 0; i < 3; i++) rectangle(.65 + i * 1.2, -.05, .55, .55);
  line([[-5,.06,4.65],[5,.06,4.65]]);
  line([[5.65,.06,-4],[5.65,.06,4]]);
  for (const x of [-5, 5]) line([[x,.06,4.5],[x,.06,4.8]]);
  for (const z of [-4, 4]) line([[5.5,.06,z],[5.8,.06,z]]);
  label('10.00 m', 0, 4.95, 1.3);
  label('LIVING', -1.5, 3.15, 1.6);
  label('KITCHEN', 2.1, -2.2, 1.7);
  label('OPEN HOUSE / 01', 0, -5.2, 2.8);

  const floor = new THREE.Group(); scene.add(floor);
  box(floor, 0, -.13, 0, 10.4, .24, 8.4, cream, .04);
  // Narrow boards, deterministic grain and seams, no image downloads.
  for (let i = 0; i < 25; i++) {
    const mat = material(new THREE.Color('#ad885e').offsetHSL(0, 0, ((i * 13) % 7 - 3) * .012).getHex());
    box(floor, -4.8 + i * .4, -.003, 0, .386, .025, 8, mat);
    for (let j = 0; j < 3; j++) box(floor, -4.8 + i * .4, .011, -2.8 + j * 2.65 + (i % 2) * .5, .38, .002, .012, walnut);
  }
  box(walls, 0, 1.6, -4.03, 10.2, 3.2, .18, plaster);
  box(walls, -5.03, 1.6, -2.9, .18, 3.2, 2.2, plaster);
  box(walls, -5.03, 1.6, 3.05, .18, 3.2, 1.9, plaster);
  box(walls, -5.03, .35, .05, .18, .7, 4.0, plaster);
  box(walls, -5.03, 2.95, .05, .18, .5, 4.0, plaster);
  // Large recessed window with slender oak mullions.
  box(walls, -5.03, 1.75, .05, .05, 2.1, 4, glass);
  for (const z of [-1.9, .05, 2]) box(walls, -4.88, 1.75, z, .12, 2.2, .06, walnut);
  box(walls, -4.87, .68, .05, .24, .09, 4.2, oak);
  box(walls, -4.87, 2.8, .05, .12, .08, 4.1, oak);
  box(walls, 0, .08, -3.9, 10, .16, .06, oak);
  box(walls, -4.9, .08, 0, .06, .16, 8, oak);
  // Left wall fireplace: stone, dark insert and warm linear flame.
  box(walls, -3.25, 1.55, -3.82, 2.35, 3.1, .25, charcoal);
  box(walls, -3.25, .16, -3.43, 2.65, .28, 1.05, stone, .04);
  box(walls, -3.25, .7, -3.64, 1.75, .73, .2, walnut);
  box(walls, -3.25, .73, -3.51, 1.62, .55, .03, charcoal);
  const fireMat = new THREE.MeshStandardMaterial({ color: '#eea34b', emissive: '#ff9d37', emissiveIntensity: 0 });
  const flames = new THREE.Group(); walls.add(flames);
  for (let i = 0; i < 17; i++) {
    const h = .12 + ((i * 11) % 7) * .025;
    box(flames, -3.96 + i * .088, .5 + h/2, -3.47, .04, h, .025, fireMat, .015);
  }
  box(walls, -3.25, 2.1, -3.64, 1.05, 1.23, .09, metal);
  box(walls, -3.25, 2.1, -3.575, .91, 1.09, .035, cream);
  box(walls, -3.22, 2.07, -3.55, .64, .8, .02, cushion, .15);
  // Kitchen: lower cabinetry, counter, backsplash, floating shelf and tall unit.
  for (let i = 0; i < 6; i++) {
    const x = -.45 + i * .85;
    box(furniture, x, .49, -3.38, .82, .96, 1.02, sageMat, .018);
    box(furniture, x, .75, -2.85, .24, .025, .025, metal);
  }
  box(furniture, 1.68, 1.02, -3.35, 5.3, .12, 1.2, stone, .04);
  box(furniture, 1.68, 1.38, -3.89, 5.3, .63, .05, stone);
  box(furniture, 4.37, 1.4, -3.36, 1, 2.8, 1.12, oak, .025);
  box(furniture, 4.37, 1.43, -2.78, .9, .035, .025, walnut);
  box(furniture, 1.3, 2.15, -3.64, 4.35, .08, .5, oak);
  box(furniture, 1.3, 2.89, -3.8, 4.35, .08, .25, oak);
  box(furniture, 2.2, 1.095, -3.25, 1.05, .018, .6, charcoal, .08);
  cylinder(furniture, 2.2, 1.3, -3.6, .03, .03, .4, metal);
  box(furniture, 2.1, 1.5, -3.6, .22, .04, .06, metal, .02);
  for (let i = 0; i < 5; i++) {
    cylinder(furniture, -.3 + i * .5, 2.34, -3.6, .08, .1, .3, i % 2 ? cream : charcoal);
  }
  box(furniture, 1.9, .48, -1.15, 3.4, .96, 1.15, oak, .035);
  box(furniture, 1.9, 1.02, -1.15, 3.7, .13, 1.4, stone, .05);
  for (let i = 0; i < 15; i++) box(furniture, .3 + i * .23, .5, -.56, .025, .86, .025, walnut);
  for (let i = 0; i < 3; i++) {
    const x = .65 + i * 1.2;
    box(furniture, x, .73, .02, .58, .14, .55, charcoal, .09);
    box(furniture, x, 1.04, .24, .58, .48, .09, walnut, .045);
    for (const dx of [-.21,.21]) for (const dz of [-.18,.18]) cylinder(furniture, x + dx, .35, .02 + dz, .018, .025, .68, charcoal);
  }
  // Island pendants.
  const lamps = [];
  for (const x of [.6, 1.9, 3.2]) {
    cylinder(walls, x, 2.92, -1.15, .012, .012, .75, charcoal);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    lamp.position.set(x, 2.57, -1.15); walls.add(lamp);
    const glow = new THREE.PointLight('#ffd18a', 0, 5, 2);
    glow.position.set(x, 2.38, -1.15); scene.add(glow); lamps.push(glow);
  }
  // Living room: soft sectional, cushions and a textured rug.
  box(furniture, -1.5, .032, 1.15, 6.3, .04, 4.3, rugMat, .02);
  for (let i = 0; i < 28; i++) box(furniture, -4.53 + i * .225, .055, 1.15, .009, .002, 4.15, cream);
  box(furniture, -1.5, .23, 1.7, 4.8, .28, 1.8, walnut, .04);
  box(furniture, -1.5, .48, 1.65, 4.9, .42, 1.85, fabric, .13);
  box(furniture, -1.5, .91, 2.38, 4.9, .76, .35, fabric, .13);
  box(furniture, -3.85, .75, 1.55, .36, .64, 2.0, fabric, .12);
  box(furniture, .85, .75, 1.55, .36, .64, 2, fabric, .12);
  box(furniture, -3.15, .45, .25, 1.45, .48, 1.7, fabric, .13);
  for (let i = 0; i < 4; i++) box(furniture, -3.17 + i * 1.12, .72, 1.55, 1.07, .19, 1.28, fabric, .08);
  for (let i = 0; i < 4; i++) {
    const c = box(details, -3.1 + i * 1.12, 1.05, 2.02, .7, .58, .22, i === 0 || i === 3 ? cushion : cream, .11);
    c.rotation.x = -.17; c.rotation.z = (i % 2 ? -.1 : .13);
  }
  box(furniture, -1.12, .37, -.18, 1.8, .48, .88, walnut, .06);
  box(furniture, -1.12, .65, -.18, 2.18, .15, 1.3, stone, .12);
  box(details, -1.58, .77, -.3, .57, .06, .4, charcoal);
  box(details, -1.58, .81, -.3, .5, .025, .35, cream);
  cylinder(details, -.7, .81, -.11, .15, .12, .2, cream);
  cylinder(details, -.7, .94, -.11, .045, .08, .12, walnut);
  // Reading corner, tilted chair and side table.
  const chair = new THREE.Group(); chair.position.set(3.5, 0, 2.2); chair.rotation.y = -.55; furniture.add(chair);
  box(chair, 0, .55, 0, 1.2, .3, 1.2, sageMat, .15);
  box(chair, 0, 1.03, .45, 1.2, .82, .23, sageMat, .13);
  for (const x of [-.55,.55]) box(chair, x, .85, 0, .1, .15, 1.3, oak, .035);
  for (const x of [-.45,.45]) for (const z of [-.4,.4]) cylinder(chair, x, .24, z, .025, .032, .48, walnut);
  cylinder(furniture, 2.25, .39, 2.6, .13, .17, .75, walnut);
  cylinder(furniture, 2.25, .8, 2.6, .45, .45, .08, stone);
  cylinder(details, 2.25, .91, 2.6, .09, .09, .15, cream);
  // Plant: stems and individually shaped leaves, all deterministic geometry.
  function plant(x, z, size) {
    const g = new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(size); details.add(g);
    cylinder(g, 0, .27, 0, .28, .21, .54, cushion);
    cylinder(g, 0, .56, 0, .25, .25, .03, walnut);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4;
      const height = .95 + (i % 4) * .29;
      const x1 = Math.cos(angle) * .4, z1 = Math.sin(angle) * .4;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.011,.018,height-.5,6), walnut);
      stem.position.set(x1/2, (height+.5)/2, z1/2);
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(x1,height-.5,z1).normalize());
      g.add(stem);
      const l = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), leaf);
      l.position.set(x1, height, z1); l.scale.set(.18,.045,.43);
      l.rotation.set(.3, angle, .5); l.castShadow = true; g.add(l);
    }
  }
  plant(-4.25,-2.5,1.15); plant(4.25,.1,.8);
  // Lighting and long, soft sun shadows.
  scene.add(new THREE.HemisphereLight('#fff5df','#c1b9a8',2.3));
  const sun = new THREE.DirectionalLight('#fff1d1',3.5);
  sun.position.set(-5,9,5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:28});
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .025; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#e3edff',1.5); fill.position.set(4,6,3); scene.add(fill);
  const fire = new THREE.PointLight('#ffad54',0,5,2); fire.position.set(-3.25,.9,-3); scene.add(fire);
  const sunStrip = new THREE.Mesh(new THREE.PlaneGeometry(5.2, .55), new THREE.MeshBasicMaterial({color:'#fff2c4', transparent:true, opacity:.08, depthWrite:false}));
  sunStrip.rotation.x = -Math.PI/2; sunStrip.rotation.z = -.4; sunStrip.position.set(-2,.04,-1); scene.add(sunStrip);
  const cameraTop = new THREE.Vector3(0, 18.8, .015);
  const cameraIso = new THREE.Vector3(10, 11.5, 14);
  const cameraEnd = new THREE.Vector3(7.8, 5.2, 10.5);
  const look = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const offset = new THREE.Vector3();

  let width = 1, height = 1;
  function draw(p) {
    const volume = ease(.1,.36,p);
    const objects = ease(.3,.57,p);
    const texture = ease(.52,.8,p);
    const light = ease(.78,1,p);
    plan.visible = p < .38;
    plan.traverse(o => {
      if (o.material) { o.material.transparent = true; o.material.opacity = 1 - ease(.16,.38,p); }
    });
    walls.visible = p > .1; walls.scale.y = Math.max(.001, volume);
    floor.visible = p > .1;
    furniture.visible = p > .3; furniture.scale.y = Math.max(.001, objects);
    details.visible = p > .4; details.scale.y = Math.max(.001, ease(.4,.65,p));
    for (const item of surfaceMaterials) item.material.color.copy(white).lerp(item.color, texture);
    fabric.color.copy(white).lerp(sage ? green : linen, texture);
    cushion.color.copy(white).lerp(sage ? linen : new THREE.Color('#a75e40'), texture);
    fireMat.emissiveIntensity = light * 3;
    fireMat.color.set(light > .1 ? '#eea34b' : '#343a34');
    fire.intensity = 7 * light;
    lamps.forEach(l => { l.intensity = 5 * light; });
    sun.color.set(light > .5 ? '#ffe8bc' : '#fff6e5');
    const tilt = ease(.08,.52,p), enter = ease(.58,1,p);
    camera.position.copy(cameraTop).lerp(cameraIso,tilt).lerp(cameraEnd,enter);
    // Portrait screens pull back rather than crop away the room.
    const portrait = Math.max(1, 1 / camera.aspect);
    camera.position.multiplyScalar(Math.min(2.1,Math.pow(portrait,.45 + .55 * tilt)));
    camera.fov = 40;
    look.set(0, .45 * volume, -.2);
    camera.lookAt(look); camera.updateProjectionMatrix();
    // Fit the same room into portrait and landscape viewports. A fixed distance
    // crops the back corners on phones, especially near the final camera angle.
    for (let attempt = 0; attempt < 3; attempt++) {
      camera.updateMatrixWorld();
      let extent = 0;
      const padding = 1 - volume;
      for (const x of [-5.3 - padding, 5.3 + padding]) {
        for (const z of [-4.3 - padding, 4.3 + padding]) {
          for (const y of [0, 3.3 * volume]) {
            projected.set(x, y, z).project(camera);
            extent = Math.max(extent, Math.abs(projected.x), Math.abs(projected.y));
          }
        }
      }
      if (extent <= .94) break;
      offset.copy(camera.position).sub(look).multiplyScalar(extent / .92);
      camera.position.copy(look).add(offset);
    }
    renderer.render(scene,camera);
  }
  renderScene = draw;
  function resize() {
    const bounds = wrap.getBoundingClientRect();
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    renderer.setSize(width,height,false); camera.aspect = width/height;
    draw(progress);
  }
  new ResizeObserver(resize).observe(wrap);
  document.querySelector('#paletteWarm')?.addEventListener('click', () => { sage = false; palette(); });
  document.querySelector('#paletteSage')?.addEventListener('click', () => { sage = true; palette(); });
  function palette() {
    document.querySelector('#paletteWarm')?.setAttribute('aria-pressed',String(!sage));
    document.querySelector('#paletteSage')?.setAttribute('aria-pressed',String(sage));
    draw(progress);
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  resize();
  document.body.dataset.renderer = 'webgl';
  document.querySelector('#renderStatus').textContent = '';
  document.body.dataset.ready = 'true';
}
try { setup(); } catch { fallback(); }
update(reduced.matches ? 0 : scrollProgress());
