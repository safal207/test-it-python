import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const out = 'artifacts/valta-sandbox';
await mkdir(out, { recursive: true });
const url = pathToFileURL(resolve('dist/valta-sandbox/index.html')).href;
const records = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [], external = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:\/\//, route => { external.push(route.request().url()); return route.abort(); });
      await page.goto(url);
      const text = id => page.locator('#' + id).textContent();
      const click = id => page.locator('#' + id).click();
      assert.equal(await text('available'), '$100');
      assert.equal(await text('blocked'), '$0');
      await page.screenshot({path: out + '/' + name + '-' + width + '-initial.png', fullPage:true});
      await click('run');
      assert.equal(await text('available'), '$70');
      assert.match(await text('decision'), /^ALLOW/);
      assert.match(await text('detail'), /calls: 1/);
      await click('over');
      assert.equal(await text('available'), '$70');
      assert.equal(await text('blocked'), '$150');
      assert.match(await text('decision'), /^DENY/);
      assert.match(await text('detail'), /calls: 0/);
      assert.equal(await page.locator('#next').isVisible(), true);
      assert.equal(await text('count'), '2');
      await click('run'); await click('run'); await click('run');
      assert.equal(await text('available'), '$10');
      assert.equal(await text('blocked'), '$180');
      assert.equal(await page.locator('#log li').count(), 5);
      const game = page.getByRole('link',{name:/Play VAMOS/});
      assert.equal(await game.getAttribute('href'), 'https://safal207.github.io/vamos-proof-arena/');
      assert.equal(await game.getAttribute('rel'), 'noopener noreferrer');
      assert.equal(await game.isVisible(), true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false);
      await page.screenshot({path: out + '/' + name + '-' + width + '-proof.png', fullPage:true});
      await click('reset');
      assert.equal(await text('available'), '$100');
      assert.equal(await text('blocked'), '$0');
      assert.equal(await text('count'), '0');
      assert.equal(await page.locator('#next').isVisible(), false);
      assert.equal(await page.locator('#log li').count(), 0);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      records.push({browser:name,width,status:'PASS',externalRequests:external.length});
      await page.close();
    }
  } finally { await browser.close(); }
}
await writeFile(out + '/report.json', JSON.stringify(records,null,2));
console.log(JSON.stringify(records));
