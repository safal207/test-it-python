import { readFile, writeFile } from 'node:fs/promises';

const dir = 'dist/ai-path/';
const [html, css, themeCss, theme, app, vendor, license] = await Promise.all([
  'physics-lab.html', 'physics-lab.css', 'theme.css', 'theme.js', 'physics-lab.js', 'vendor/three.module.min.js', 'vendor/three-LICENSE.txt'
].map(file => readFile(dir + file, 'utf8')));
const begin = vendor.lastIndexOf('export{');
const end = vendor.lastIndexOf('};');
if (begin < 0 || end < begin || /<\/script/i.test(vendor)) throw new Error('Unexpected Three.js module format');
const exports = Object.fromEntries(vendor.slice(begin + 7, end).split(',').map(item => {
  const parts = item.trim().split(/\s+as\s+/); return [parts[1] || parts[0], parts[0]];
}));
const needed = ['WebGLRenderer','SRGBColorSpace','Scene','PerspectiveCamera','HemisphereLight','DirectionalLight','Group','MeshStandardMaterial','Mesh','BoxGeometry','SphereGeometry','ArrowHelper','Vector3','TubeGeometry','CatmullRomCurve3'];
if (needed.some(name => !exports[name])) throw new Error('Missing Three.js export');
const namespace = 'const THREE = (() => {\n' + vendor.slice(0, begin) + '\nreturn {' + needed.map(name => name + ':' + exports[name]).join(',') + '};\n})();\n';
const importLine = "import * as THREE from './vendor/three.module.min.js';";
if (!app.includes(importLine)) throw new Error('Application import not found');
let result = html
  .replace('<script src="theme.js?v=1"></script>', () => '<script>\n' + theme + '\n</script>')
  .replace('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">', '')
  .replace('<link rel="stylesheet" href="theme.css?v=1">', () => '<style>\n' + themeCss + '\n</style>')
  .replace('<link rel="stylesheet" href="physics-lab.css?v=1">', () => '<style>\n' + css + '\n</style>')
  .replace('<a class="quiet" href="physics-lab-offline.html" download>Скачать один HTML-файл ↓</a>', '<span class="quiet">Офлайн-версия этого урока</span>')
  .replaceAll('href="3d-academy.html"', 'href="https://safal207.github.io/test-it-python/ai-path/3d-academy.html"')
  .replaceAll('href="./"', 'href="https://safal207.github.io/test-it-python/ai-path/"')
  .replace('<script type="module" src="physics-lab.js?v=1"></script>', () => '<!-- Third-party component: Three.js 0.170.0.\n' + license.replaceAll('--','- -') + '\n-->\n<script type="module">\n' + app.replace(importLine, () => namespace) + '\n</script>');
if (result.includes('src="') || /<link\s+rel="stylesheet"/i.test(result) || result === html) throw new Error('Offline build still references external runtime assets');
const path = dir + 'physics-lab-offline.html';
if (process.argv.includes('--check')) {
  if (await readFile(path,'utf8') !== result) throw new Error('Offline lesson is stale. Run npm run build:physics-offline.');
  console.log('Offline physics lesson matches local source and Three.js license.');
} else {
  await writeFile(path,result);
  console.log('Built standalone physics lesson (' + Buffer.byteLength(result) + ' bytes).');
}
