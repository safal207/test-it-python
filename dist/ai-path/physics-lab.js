import * as THREE from './vendor/three.module.min.js';

// An independently authored, static Hooke's-law model. Values are illustrative settings.
const $ = id => document.getElementById(id);
const mass = $('mass'), stiffness = $('stiffness'), forces = $('forces');
const steps = [
  { title:'Посмотри на груз', text:'Запомни массу, жёсткость и удлинение. Что изменится, если добавить вес?', mass:100, stiffness:20 },
  { title:'Увеличь массу', text:'Масса стала вдвое больше. Сравни удлинение с предыдущим опытом при той же пружине.', mass:200, stiffness:20 },
  { title:'Измени пружину', text:'Жёсткость стала вдвое больше. Сравни удлинение при той же массе груза.', mass:200, stiffness:40 },
  { title:'Проверь гипотезу', text:'С помощью ползунков подбери значения для цели ниже. Можно попробовать разные сочетания.', mass:100, stiffness:20 }
];
let step = 0, redrawScene = () => {}, rotateScene = () => {};
const format = n => n.toFixed(2).replace('.', ',');
function values() {
  const m = Number(mass.value) / 1000;
  const k = Number(stiffness.value);
  const force = m * 9.8;
  return { m, k, force, cm: force / k * 100 };
}
function renderValues() {
  const v = values();
  $('mass-value').textContent = mass.value + ' г';
  $('stiffness-value').textContent = stiffness.value + ' Н/м';
  $('force-value').textContent = format(v.force) + ' Н';
  $('extension-value').textContent = format(v.cm) + ' см';
  const x = 48 + 280 * v.cm / 50;
  const y = 145 - 125 * v.force / 5;
  const endCm = Math.min(50, 500 / v.k);
  $('chart-line').setAttribute('x2', String(48 + 280 * endCm / 50));
  $('chart-line').setAttribute('y2', String(145 - 125 * (v.k * endCm / 100) / 5));
  $('chart-point').setAttribute('cx', String(x));
  $('chart-point').setAttribute('cy', String(y));
  $('chart').setAttribute('aria-label', 'Зависимость силы от удлинения: текущая точка ' + format(v.cm) + ' сантиметра и ' + format(v.force) + ' ньютона; жёсткость ' + v.k + ' ньютонов на метр.');
  $('check-result').textContent = '';
  const length = 80 + v.cm / 50 * 85, bottom = 45 + length;
  let path = 'M230 45';
  for (let i=1;i<=16;i++) path += ' L' + (230 + (i===16 ? 0 : (i%2 ? 18 : -18))) + ' ' + (45 + length*i/16).toFixed(2);
  $('fallback-spring').setAttribute('d', path);
  $('fallback-weight').setAttribute('y', String(bottom));
  $('fallback-forces').setAttribute('visibility', forces.checked && v.force > 0 ? 'visible' : 'hidden');
  const center = bottom + 21;
  $('fallback-down').setAttribute('d', 'M285 '+(center-18)+'v36m-8-8 8 8 8-8');
  $('fallback-up').setAttribute('d', 'M175 '+(center+18)+'v-36m-8 8 8-8 8 8');
  redrawScene(v);
}
function showStep(index) {
  step = Math.max(0, Math.min(steps.length - 1, index));
  const data = steps[step];
  mass.value = String(data.mass); stiffness.value = String(data.stiffness);
  $('step-counter').textContent = 'ШАГ ' + (step + 1) + ' / ' + steps.length;
  $('guide-title').textContent = data.title;
  $('step-text').textContent = data.text;
  $('previous').disabled = step === 0;
  $('next').disabled = step === steps.length - 1;
  $('check-panel').hidden = step !== steps.length - 1;
  renderValues();
}
for (const input of [mass, stiffness]) input.addEventListener('input', renderValues);
forces.addEventListener('change', renderValues);
$('previous').addEventListener('click', () => showStep(step - 1));
$('next').addEventListener('click', () => showStep(step + 1));
$('check').addEventListener('click', () => {
  const cm = values().cm;
  $('check-result').textContent = cm >= 9 && cm <= 10
    ? 'Текущее удлинение ' + format(cm) + ' см — в заданном диапазоне.'
    : 'Сейчас ' + format(cm) + ' см. Измени массу или жёсткость и проверь ещё раз.';
});
$('rotate-left').addEventListener('click', () => rotateScene(-.3));
$('rotate-right').addEventListener('click', () => rotateScene(.3));
renderValues();

const canvas = $('scene'), fallback = $('fallback');
let renderer;
try {
  const context = canvas.getContext('webgl2', { antialias:true, alpha:true, powerPreference:'low-power' });
  if (!context) throw new Error('WebGL2 unavailable');
  renderer = new THREE.WebGLRenderer({ canvas, context, antialias:true, alpha:true, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 40);
  world.add(new THREE.HemisphereLight(0xffffff, 0x33405f, 2.8));
  const lamp = new THREE.DirectionalLight(0xffffff, 2.5); lamp.position.set(3, 7, 5); world.add(lamp);
  const stand = new THREE.Group(); world.add(stand);
  const material = (color, options={}) => new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.1,...options});
  function box(size,position,color) { const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color)); mesh.position.set(...position); stand.add(mesh); return mesh; }
  box([3.2,.18,1.7],[0,-2.05,0],0x3bcac5);
  box([.15,4,.15],[-1.25,-.05,0],0xe8dcff);
  box([2.5,.16,.18],[-.08,1.93,0],0xe8dcff);
  const top = 1.75, axisX = .9;
  const anchor = new THREE.Mesh(new THREE.SphereGeometry(.11,18,12),material(0xffc83d)); anchor.position.set(axisX,top,0); stand.add(anchor);
  let spring;
  const weight = new THREE.Mesh(new THREE.BoxGeometry(.72,.55,.72),material(0xa775f1)); stand.add(weight);
  const down = new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),.65,0xffc83d,.16,.1);
  const up = new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.65,0x53e4ca,.16,.1);
  stand.add(down,up);
  let theta=.55, phi=1.22, drag=null;
  function draw() { camera.position.set(7*Math.sin(phi)*Math.sin(theta),7*Math.cos(phi),7*Math.sin(phi)*Math.cos(theta)); camera.lookAt(0,0,0); renderer.render(world,camera); }
  function resize() { const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight); renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw(); }
  redrawScene = v => {
    const length = 1.1 + v.cm / 50 * .9;
    const points=[];
    for(let i=0;i<=110;i++){const t=i/110,a=t*Math.PI*18;points.push(new THREE.Vector3(axisX+Math.cos(a)*.19,top-t*length,Math.sin(a)*.19));}
    const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),110,.035,8,false);
    if(spring){spring.geometry.dispose();spring.geometry=geometry;}else{spring=new THREE.Mesh(geometry,material(0xffd77b));stand.add(spring);}
    weight.position.set(axisX,top-length-.29,0);
    down.position.set(axisX+.63,weight.position.y,0);
    up.position.set(axisX-.63,weight.position.y,0);
    down.visible=up.visible=forces.checked && v.force>0;
    draw();
  };
  rotateScene = amount => { theta += amount; draw(); };
  canvas.addEventListener('pointerdown', event => { if(event.button!==0)return; drag={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if(!drag || drag.id!==event.pointerId)return;theta-=(event.clientX-drag.x)*.01;phi=Math.max(.5,Math.min(2.4,phi+(event.clientY-drag.y)*.01));drag.x=event.clientX;drag.y=event.clientY;draw(); });
  canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('keydown', event => {if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft')theta-=.2;if(event.key==='ArrowRight')theta+=.2;if(event.key==='ArrowUp')phi=Math.max(.5,phi-.15);if(event.key==='ArrowDown')phi=Math.min(2.4,phi+.15);draw();});
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
  resize();redrawScene(values());fallback.hidden=true;
  $('scene-status').textContent='Модель готова. Жёлтая стрелка — сила тяжести вниз, бирюзовая — сила упругости вверх.';
} catch (_) {
  if(renderer)renderer.dispose();
  fallback.hidden=false;
  canvas.setAttribute('aria-hidden','true'); canvas.removeAttribute('tabindex');
  $('rotate-left').disabled=true; $('rotate-right').disabled=true;
  $('scene-badge').textContent='Схема';
  $('rotate-hint').textContent='Схема меняется вместе с параметрами. Её размеры условные.';
  $('scene-status').textContent='Показана схема. Расчёт, график и шаги работают без 3D.';
}
