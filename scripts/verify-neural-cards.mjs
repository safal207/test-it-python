import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { startSite, browserOptions } from './qa/site.mjs';

// These are the existing curricula: a cover redesign must not rename or shorten them.
const courses = [
  { id: 'ml-python', name: 'Python и данные для нейросетей', weeks: 6, notebooks: 21 },
  { id: 'ml', name: 'Нейросети: первая модель', weeks: 6, notebooks: 4 },
  { id: 'ml-data', name: 'Машинное обучение на таблицах', weeks: 6, notebooks: 3 },
  { id: 'ml-vision', name: 'Нейросети для изображений · CV', weeks: 8, notebooks: 18 },
  { id: 'ml-text', name: 'Нейросети для текстов · NLP', weeks: 8, notebooks: 10 },
  { id: 'ml-audio', name: 'Нейросети для звука', weeks: 6, notebooks: 2 },
  { id: 'ml-series', name: 'Прогнозирование временных рядов', weeks: 6, notebooks: 5 },
  { id: 'ml-tuning', name: 'Подбор архитектуры нейросетей', weeks: 4, notebooks: 3 }
];
const courseIds = courses.map(course => course.id);
const programIds = ['explore', 'build', 'space', 'furniture', 'create', 'comics', 'qa', 'game', 'ml', 'hack', 'grant', 'frontier', 'books', 'designlab', 'vibe', 'ml-python', 'ml-data', 'ml-vision', 'ml-text', 'ml-audio', 'ml-series', 'ml-tuning', 'career', 'unity'];
const require = createRequire(import.meta.url);
const out = 'artifacts/neural-cards';
const results = [];
const asset = (id, small = false) => `assets/neural-course-cards/${id}${small ? '-640' : ''}.webp`;
const site = await startSite();
let browser;

async function verifyArt(page, route) {
  for (const { id } of courses) {
    const card = page.locator(route === 'home' ? `#programList [data-program="${id}"]` : `[data-neural-course="${id}"]`);
    const picture = card.locator(route === 'home' ? '.program-media img' : '.nc-art img');
    await expect(picture).toHaveCount(1);
    await picture.evaluate(async image => { image.loading = 'eager'; await image.decode(); });
    const image = await picture.evaluate(element => ({
      source: element.getAttribute('src'), sources: element.getAttribute('srcset'),
      loaded: element.complete && element.naturalWidth > 0,
      alt: element.hasAttribute('alt'), width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height
    }));
    assert.equal(image.source, asset(id, route === 'home'), `${route}/${id}: own local course artwork`);
    assert(image.loaded && image.alt, `${route}/${id}: decoded artwork with an explicit alt decision`);
    assert(Math.abs(image.width / image.height - 1.5) < 0.02, `${route}/${id}: artwork retains its 3:2 frame`);
    if (route === 'guide') {
      assert.deepEqual(image.sources.split(',').map(source => source.trim()).sort(), [`${asset(id, true)} 640w`, `${asset(id)} 1536w`].sort(), `${id}: responsive small and full artwork sources`);
      await expect(card.locator('.nc-art')).toContainText('Иллюстрация курса');
      await expect(card.locator('h2')).toHaveText(courses.find(course => course.id === id).name);
    } else {
      assert.equal(await card.evaluate(element => element.tagName), 'BUTTON', `${id}: card remains a native button`);
      assert.equal(await card.locator('a, button, input, select, textarea, [tabindex]').count(), 0, `${id}: no nested card actions`);
      await expect(card).toContainText('Иллюстрация курса');
    }
  }
}

async function verifyNotebookLinks(page) {
  const manifest = JSON.parse(await readFile('dist/ai-path/data/neural-notebooks.json', 'utf8'));
  assert.equal(manifest.notebooks.length, 66, 'The source inventory still has 66 notebooks');
  const links = await page.locator('[data-course-notebook]').evaluateAll(elements => elements.map(link => ({ url: link.href, course: link.dataset.courseNotebook, status: link.dataset.notebookStatus })));
  assert.equal(links.length, 66, 'All 66 notebook links remain available');
  assert.equal(new Set(links.map(link => link.url)).size, 66, 'No duplicate notebook assignments');
  for (const notebook of manifest.notebooks) {
    const url = `https://github.com/${manifest.repository}/blob/${manifest.ref}/${notebook.path.split('/').map(encodeURIComponent).join('/')}`;
    assert(links.some(link => link.url === url && link.course === notebook.course && link.status === notebook.status), `Original notebook path, course and readiness: ${notebook.path}`);
  }
  assert.equal(links.filter(link => link.status === 'starter').length, 1, 'Only the controlled starter is presented as runnable');
  for (const course of courses) assert.equal(links.filter(link => link.course === course.id).length, course.notebooks, `${course.id}: notebook coverage unchanged`);
}

async function verifyAssetDimensions(page) {
  // srcset can legitimately choose a small image on desktop; decode both files separately.
  const sources = courses.flatMap(({ id }) => [asset(id), asset(id, true)]);
  const decoded = await page.evaluate(paths => Promise.all(paths.map(source => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ source, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Course artwork failed to load: ' + source));
    image.src = source;
  }))), sources);
  for (const image of decoded) {
    const small = image.source.endsWith('-640.webp');
    assert.equal(image.width, small ? 640 : 1536, `${image.source}: native artwork width`);
    assert.equal(image.height, small ? 427 : 1024, `${image.source}: native artwork height`);
  }
}

async function verifyPlan(page, course, level, pace) {
  const url = new URL(page.url());
  assert.equal(url.searchParams.get('program'), course.id);
  assert.equal(url.searchParams.get('level'), level);
  assert.equal(url.searchParams.get('pace'), pace);
  assert.equal(url.hash, '#selected');
  await expect(page.locator('#selTitle')).toHaveText(course.name);
  await expect(page.locator('#enquiryLevel')).toHaveValue(level);
  await expect(page.locator('#enquiryPace')).toHaveValue(pace);
  assert.equal(Number.parseInt(await page.locator('#selDuration').innerText(), 10), course.weeks, `${course.id}: original duration`);
  assert.equal(Number.parseInt(await page.locator('#selMeetings').innerText(), 10), course.weeks, `${course.id}: original meeting count`);
  await expect(page.locator('#selConceptImage')).toHaveAttribute('src', course.id === 'ml' ? 'assets/program-covers/ml.svg' : `assets/neural-courses/${course.id}.svg`);
}

async function verifyNavigation(page) {
  // Exercise all eight native home buttons, including keyboard activation.
  await page.goto(site.base + '?program=ml-python&level=project&pace=light#courses');
  for (const course of courses) {
    const button = page.locator(`#programList [data-program="${course.id}"]`);
    await button.focus();
    await page.keyboard.press('Enter');
    await verifyPlan(page, course, 'project', 'light');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  // Click real guide links instead of only comparing generated hrefs.
  for (const course of courses) {
    await page.goto(site.base + 'neural-courses.html?program=ml&level=basic&pace=deep');
    await page.locator(`[data-course-plan="${course.id}"]`).click();
    await page.waitForURL(url => url.pathname === new URL(site.base).pathname && url.searchParams.get('program') === course.id);
    await verifyPlan(page, course, 'basic', 'deep');
  }
  // Invalid incoming preparation/pace must be normalized before any card is chosen.
  await page.goto(site.base + 'neural-courses.html?program=ml&level=invalid&pace=invalid');
  for (const course of courses) {
    const href = new URL(await page.locator(`[data-course-plan="${course.id}"]`).getAttribute('href'), page.url());
    assert.equal(href.searchParams.get('program'), course.id);
    assert.equal(href.searchParams.get('level'), 'zero');
    assert.equal(href.searchParams.get('pace'), 'balanced');
  }
  await page.locator('[data-course-plan="ml-python"]').click();
  await verifyPlan(page, courses[0], 'zero', 'balanced');
}

try {
  await mkdir(out, { recursive: true });
  // Check the shipped file format and distinct art, independently of CSS fallbacks.
  for (const small of [false, true]) {
    const hashes = [];
    for (const { id } of courses) {
      const bytes = await readFile(`dist/ai-path/${asset(id, small)}`);
      assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${id}: WebP container`);
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `${id}: WebP image format`);
      hashes.push(createHash('sha256').update(bytes).digest('hex'));
    }
    assert.equal(new Set(hashes).size, 8, 'Every course has its own illustration at each resolution');
  }
  browser = await chromium.launch(browserOptions);
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    for (const route of ['home', 'guide']) {
      await page.goto(site.base + (route === 'guide' ? 'neural-courses.html?program=ml&level=basic&pace=deep' : ''));
      await page.evaluate(() => document.fonts.ready);
      if (route === 'home') {
        await expect(page.locator('#programList .program')).toHaveCount(24);
        const ids = await page.locator('#programList .program').evaluateAll(cards => cards.map(card => card.dataset.program));
        assert.deepEqual(ids.sort(), [...programIds].sort(), 'All 24 program identities are preserved');
        const visible = await page.locator('#programList .program:visible').evaluateAll(cards => cards.map(card => card.dataset.program));
        assert.deepEqual(visible, courseIds, 'All eight neural courses are visible in their original order');
      } else {
        await expect(page.locator('[data-neural-course]')).toHaveCount(8);
        if (width === 1440) {
          await verifyNotebookLinks(page);
          await verifyAssetDimensions(page);
        }
      }
      await verifyArt(page, route);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      for (const theme of ['light', 'dark', 'matrix']) {
        await page.locator(`[data-theme-choice="${theme}"]`).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth, height: document.documentElement.scrollHeight }));
        assert(bounds.scroll <= bounds.width + 1, `${route}/${width}/${theme}: no horizontal overflow`);
        // Preserve the existing fresh light-theme landing budget; other themes retain their layout and accessibility checks.
        if (route === 'home' && width === 1440 && theme === 'light') assert(bounds.height < 8500, `Fresh light home remains below 8500px, got ${bounds.height}px`);
        const audit = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
        results.push({ route, width, theme, height: bounds.height, violations: audit.violations, manualReview: audit.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) });
        assert.equal(audit.violations.length, 0, `${route}/${width}/${theme}: no WCAG A/AA violations`);
        await page.locator(route === 'home' ? '#programList' : '.nc-grid').screenshot({ path: `${out}/${route}-cards-${width}-${theme}.png`, animations: 'disabled', style: '.header, .selection-dock, .toast { visibility: hidden !important; }' });
        if (route === 'guide' && width === 1440) {
          await page.locator('.nc-card').first().evaluate(card => card.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await page.screenshot({ path: `${out}/guide-first-row-${theme}.png`, animations: 'disabled' });
        }
      }
    }
    if (width === 1440) await verifyNavigation(page);
    assert.deepEqual(errors, [], `${width}px: no browser errors`);
    assert.deepEqual(failed, [], `${width}px: no failed resources`);
    await page.close();
    console.log(`PASS neural cards ${width}px: home and course guide, eight distinct loaded illustrations, three themes, no overflow or WCAG violations`);
  }
  console.log('PASS all 24 programs and 66 notebook assignments retained; all eight home and guide choices preserve validated preparation/pace and original curricula');
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  await site.close();
}
