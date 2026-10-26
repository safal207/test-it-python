import * as THREE from './vendor/three.module.min.js';

// Self-contained educational models: procedural geometry only, no external assets or requests.
const canvas = document.getElementById('sceneCanvas');
const fallback = document.getElementById('stageFallback');
const status = document.getElementById('demoStatus');
const description = document.getElementById('sceneText');
const control = document.getElementById('explodeControl');
const slider = document.getElementById('explode');
const output = document.getElementById('explodeValue');
const choices = Array.from(document.querySelectorAll('[data-scene]'));
const explanations = {
  cell: 'Условная модель клетки: ядро и органеллы можно рассмотреть под разными углами. Размеры и формы упрощены, это не микрофотография.',
  physics: 'Учебная модель пружины с грузом. В полноценном курсе измеряем удлинение и сравниваем его с законом Гука; здесь показана только геометрия.',
  device: 'Условная сборка электронного устройства: плата, теплоотвод и вентиляторы. Ползунок разводит компоненты по слоям.',
  building: 'Упрощённый план здания: пол, стены и предметы. Ползунок отделяет элементы, помогая разглядеть конструкцию.'
};
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
} catch {
  status.textContent = 'WebGL недоступен. Планы курсов и пояснения доступны без 3D.';
}
if (renderer) {
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xf5f9ff, 0x344a5d, 2.7));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(3, 8, 7); scene.add(sun);
    const base = new THREE.Group();
    scene.add(base);
    const grid = new THREE.GridHelper(10, 12, 0x43615f, 0x294044);
    grid.position.y = -1.8; scene.add(grid);
    const parts = [];
    let mode = 'cell';
    let theta = 0.6, phi = 1.15, radius = 8;
    let drag = null;

    const material = (color, options = {}) => new THREE.MeshStandardMaterial({
      color, metalness: .12, roughness: .53, ...options
    });
    function box(parent, dims, xyz, color, options = {}) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dims), material(color, options));
      mesh.position.set(...xyz); parent.add(mesh); return mesh;
    }
    function ball(parent, radius, xyz, color, options = {}) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12), material(color, options));
      mesh.position.set(...xyz); parent.add(mesh); return mesh;
    }
    function tube(parent, points, radius, color) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 54, radius, 7, false), material(color));
      parent.add(mesh); return mesh;
    }
    function layer(displacement) {
      const g = new THREE.Group();
      base.add(g); parts.push({g, displacement: new THREE.Vector3(...displacement)}); return g;
    }
    function cell() {
      const membrane = new THREE.Mesh(
        new THREE.SphereGeometry(1.75, 30, 20),
        material(0x6fe7bc, { transparent: true, opacity: .21, depthWrite: false, side: THREE.DoubleSide })
      );
      base.add(membrane);
      ball(base, .59, [0, .05, 0], 0xb6a6ff);
      ball(base, .23, [.1, .1, .4], 0xf9e28e);
      [[-1,.1,.25],[.95,-.45,0],[.25,-.9,-.45],[-.35,.9,-.3]].forEach((point,i) => {
        const mesh=ball(base,.25,point,0xff9789); mesh.scale.set(1.5,.55,.75); mesh.rotation.z = i*.7;
      });
      for (let i=0;i<12;i++) {
        const angle = i*Math.PI/6;
        ball(base,.09,[Math.sin(angle)*1.25,Math.cos(angle)*.72,Math.sin(angle*3)*.6],0xd7fa82);
      }
    }
    function physics() {
      const g=layer([0,0,0]);
      box(g,[3.1,.16,1.8],[0,-1.42,0],0x709b9b);
      box(g,[.12,3,.12],[-1.14,.1,0],0xb9c7d2);
      box(g,[2.1,.13,.14],[-.12,1.55,0],0xb9c7d2);
      ball(g,.18,[.8,1.38,0],0xdbefb5);
      const helix = [];
      for (let i=0;i<=72;i++){
        const t=i/72, angle=t*Math.PI*18;
        helix.push([.8+Math.cos(angle)*.16, 1.26-t*1.55, Math.sin(angle)*.16]);
      }
      tube(g,helix,.034,0xe7bd83);
      ball(g,.42,[.8,-.69,0],0xa6a5ff);
    }
    function fan(parent,x,z) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.52,.08,8,28), material(0xe8ebee));
      ring.rotation.x=Math.PI/2;ring.position.set(x,.22,z);parent.add(ring);
      ball(parent,.13,[x,.22,z],0xc2ced7);
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7;
        const blade=box(parent,[.42,.045,.16],[x+Math.cos(a)*.28,.22,z+Math.sin(a)*.28],0xaeb9c8);
        blade.rotation.y=-a+.35;
      }
    }
    function device() {
      const pcb=layer([0,-1.7,0]);
      box(pcb,[3.4,.14,2.1],[0,-.72,0],0x286d61);
      for(let i=0;i<8;i++) box(pcb,[.34,.13,.32],[-1.34+(i%4)*.68,-.59,-.65+Math.floor(i/4)*.85],0x25353f);
      const heat=layer([0,.9,0]);
      box(heat,[3.05,.28,1.7],[0,-.27,0],0xaab5c3);
      for(let i=0;i<18;i++) box(heat,[.065,.32,1.75],[-1.35+i*.16,.04,0],0xcbd1da);
      const cooling=layer([0,2.4,0]);
      box(cooling,[3.25,.11,2.05],[0,.18,0],0x4c616d);
      fan(cooling,-.83,.03); fan(cooling,.83,.03);
    }
    function building() {
      const floor=layer([0,-1,0]);
      box(floor,[3.7,.16,2.6],[0,-1.25,0],0x849a9c);
      const rooms=layer([0,.45,0]);
      const wallmat={ transparent:true,opacity:.86,depthWrite:false };
      box(rooms,[3.7,1.6,.13],[0,-.36,-1.3],0xc6d9d6,wallmat);
      box(rooms,[.13,1.6,2.6],[-1.85,-.36,0],0xc6d9d6,wallmat);
      box(rooms,[.13,1.4,2.4],[.15,-.46,.15],0xa9c2c8,wallmat);
      box(rooms,[1.95,1.4,.12],[-.93,-.46,.42],0xa9c2c8,wallmat);
      const furniture=layer([0,1.4,0]);
      box(furniture,[.92,.16,.6],[-1,-.7,-.55],0xc59f75);
      box(furniture,[1,.33,.64],[.96,-1.02,.37],0x91ab85);
      box(furniture,[.54,.42,.54],[.96,-.88,-.86],0xe4bd83);
      const edge=layer([0,2.1,0]);
      box(edge,[3.8,.1,.12],[0,.52,-1.29],0xd7fa82);
      box(edge,[.12,.1,2.6],[-1.86,.52,0],0xd7fa82);
    }
    function updateParts() {
      const amount=Number(slider.value)/100;
      for (const part of parts) part.g.position.copy(part.displacement).multiplyScalar(amount);
      output.value = slider.value + '%';
    }
    function updateCamera(){
      camera.position.set(radius*Math.sin(phi)*Math.sin(theta),
        radius*Math.cos(phi), radius*Math.sin(phi)*Math.cos(theta));
      camera.lookAt(0,0,0);
      renderer.render(scene,camera);
    }
    function resize(){
      const width=Math.max(1,Math.floor(canvas.clientWidth));
      const height=Math.max(1,Math.floor(canvas.clientHeight));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.updateProjectionMatrix();updateCamera();
    }
    function activate(next) {
      mode=next;
      while(base.children.length){
        const obj=base.children[0];base.remove(obj);
        obj.traverse(item => {
          if(item.geometry)item.geometry.dispose();
          if(item.material)item.material.dispose();
        });
      }
      parts.length=0;slider.value='0';output.value='0%';
      ({cell,physics,device,building})[mode]();
      choices.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.scene===mode)));
      description.textContent=explanations[mode];
      control.hidden=!(mode==='device'||mode==='building');
      status.textContent='Сцена: '+({cell:'клетка',physics:'пружина',device:'устройство',building:'здание'})[mode]+' — модель готова.';
      updateCamera();
    }
    choices.forEach(button => button.addEventListener('click', () => activate(button.dataset.scene)));
    slider.addEventListener('input', () => {updateParts();updateCamera();});
    canvas.tabIndex=0;
    canvas.addEventListener('pointerdown',ev=>{
      if(ev.button!==0)return;
      drag={x:ev.clientX,y:ev.clientY,id:ev.pointerId};
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove',ev=>{
      if(!drag || drag.id!==ev.pointerId)return;
      const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
      drag.x=ev.clientX;drag.y=ev.clientY;
      theta-=dx*.009;phi=Math.min(2.55,Math.max(.42,phi+dy*.009));updateCamera();
    });
    canvas.addEventListener('pointerup',()=>{drag=null;});
    canvas.addEventListener('pointercancel',()=>{drag=null;});
    canvas.addEventListener('wheel',ev=>{ev.preventDefault();radius=Math.min(13,Math.max(4,radius+ev.deltaY*.012));updateCamera();},{passive:false});
    canvas.addEventListener('keydown',ev=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Add','Subtract'].includes(ev.key)){
        ev.preventDefault();
        if(ev.key==='ArrowLeft')theta-=.17;
        if(ev.key==='ArrowRight')theta+=.17;
        if(ev.key==='ArrowUp')phi=Math.max(.42,phi-.13);
        if(ev.key==='ArrowDown')phi=Math.min(2.55,phi+.13);
        if(ev.key==='+'||ev.key==='='||ev.key==='Add')radius=Math.max(4,radius-.45);
        if(ev.key==='-'||ev.key==='Subtract')radius=Math.min(13,radius+.45);
        updateCamera();
      }
    });
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize',resize);
    activate('cell');resize();fallback.hidden=true;
  } catch {
    renderer.dispose();
    fallback.hidden=false;
    status.textContent='3D-просмотр не запустился. Все планы доступны без WebGL.';
  }
}
