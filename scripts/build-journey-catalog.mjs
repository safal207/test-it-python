import { readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// The chooser remains the source of truth for names, requirements and outcomes.
const source = await readFile('dist/ai-path/app.js', 'utf8');
const neural = await readFile('dist/ai-path/neural-courses-data.js', 'utf8');
const context = { window: {} };
runInNewContext(neural, context);
const start = source.indexOf('  var programs=[');
const end = source.indexOf('  var notebooks=', start);
const careerStart = source.indexOf("  programs.push({id:'career'");
const careerEnd = source.indexOf('\n  interestLabels.career=', careerStart);
if ([start, end, careerStart, careerEnd].some(i => i < 0)) throw new Error('Course catalog boundaries were not found');
runInNewContext(source.slice(start, end), context);
for (const course of context.window.AIPathNeuralCourses) {
  const index = context.programs.findIndex(p => p.id === course.id);
  if (index < 0) context.programs.push(course); else context.programs[index] = course;
}
runInNewContext(source.slice(careerStart, careerEnd), context);
const programs = context.programs.map(({ id, num, name, short, level, outcome }) => ({ id, num, name, short, level, outcome })).sort((a, b) => Number(a.num) - Number(b.num));
if (programs.length !== 23 || new Set(programs.map(p => p.id)).size !== 23 || programs.some(p => !p.name || !p.level || !p.outcome)) throw new Error('Expected 23 complete unique programs');
const academy = JSON.parse(await readFile('dist/ai-path/3d-academy-curriculum.json', 'utf8')).courses.map(({ id, name, project, lessons }) => ({ id, name, outcome: project, first: lessons[0].practice }));
if (academy.length !== 6 || new Set(academy.map(p => p.id)).size !== 6) throw new Error('Expected six 3D Academy courses');
const output = '/* Generated from the chooser, neural curriculum and 3D Academy. Run npm run build:journey-catalog. */\nwindow.AIPathJourneyCatalog = ' + JSON.stringify(programs, null, 2) + ';\nwindow.AIPathJourneyAcademy = ' + JSON.stringify(academy, null, 2) + ';\n';
const path = 'dist/ai-path/journey-catalog.js';
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8') !== output) throw new Error('Journey catalog is stale. Run npm run build:journey-catalog.');
  console.log('Journey catalog matches 23 programs and six 3D Academy plans.');
} else {
  await writeFile(path, output);
  console.log('Generated 23 journey programs and six 3D Academy plans.');
}
