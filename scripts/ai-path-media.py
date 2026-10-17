#!/usr/bin/env python3
"""Capture real project media, update AI PATH, and check the gallery.

No generated mockups. Existing runtime screenshot is supplied by the workflow.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import subprocess
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
PAGE = ROOT / 'dist/ai-path/index.html'
ASSETS = PAGE.parent / 'assets'
EVIDENCE = ROOT / 'artifacts/ai-path-media'
AWAKENING_REF = 'a92bd1560215833a232362ad78de88335e51ac81'
RUSTCLIP_BLOB = '41f54a9ef6bca207ea0b1c590b78b23208395e1b'
ASSETS.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)
records: list[dict] = []


def save_media(source: Path, name: str, description: str, origin: str) -> None:
    with Image.open(source) as image:
        image = image.convert('RGB')
        if min(image.size) < 240 or max(ImageStat.Stat(image).stddev) < 8:
            raise ValueError(f'Empty or unexpectedly small screenshot: {source}')
        image.thumbnail((1600, 1200))
        target = ASSETS / name
        image.save(target, 'WEBP', quality=88, method=6)
        records.append({'file': name, 'description': description, 'source': origin,
                        'width': image.width, 'height': image.height,
                        'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})


save_media(EVIDENCE / 'awakening.png', 'awakening.webp',
           'Screenshot of the unmodified Awakening desktop game running under Xvfb/Mesa.',
           f'https://github.com/safal207/Awakening/tree/{AWAKENING_REF}')
request = urllib.request.Request(
    f'https://api.github.com/repos/safal207/rustclip-studio/git/blobs/{RUSTCLIP_BLOB}',
    headers={'User-Agent': 'AI-PATH-project-screenshot-capture'})
with urllib.request.urlopen(request, timeout=45) as response:
    blob = json.load(response)
raw = base64.b64decode(blob['content'])
assert hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest() == RUSTCLIP_BLOB
rust_source = EVIDENCE / 'rustclip-original.jpg'
rust_source.write_bytes(raw)
save_media(rust_source, 'rustclip.webp',
           'Original preview frame from the RustClip Studio demo; not a studio UI screenshot.',
           'https://github.com/safal207/rustclip-studio/blob/main/examples/demo/preview.jpg')

server = subprocess.Popen(['python3', '-m', 'http.server', '4173', '--bind', '127.0.0.1',
                           '--directory', str(ROOT / 'dist')],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for attempt in range(30):
        try:
            urllib.request.urlopen('http://127.0.0.1:4173/', timeout=1).close()
            break
        except OSError:
            time.sleep(0.2)
    else:
        raise RuntimeError('Local preview server did not start')

    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 960},
                                      device_scale_factor=1, reduced_motion='reduce')
        page = context.new_page()
        for name, url, description in [
            ('testit', 'http://127.0.0.1:4173/', 'Screenshot of the actual Test it Python learning interface.'),
            ('architectural', 'https://safal207.github.io/Architectural-AI-Lab/',
             'Screenshot of the published Architectural AI Lab portfolio interface.')
        ]:
            response = page.goto(url, wait_until='networkidle', timeout=90000)
            assert response is not None and response.status == 200, (name, response)
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(2500)
            assert len(page.inner_text('body').strip()) > 180, f'Empty page: {url}'
            assert 'There isn’t a GitHub Pages site here' not in page.inner_text('body')
            shot = EVIDENCE / f'{name}.png'
            page.screenshot(path=str(shot), full_page=False, animations='disabled')
            origin = (f'https://github.com/safal207/test-it-python/tree/{os.environ.get("GITHUB_SHA", "main")}'
                      if name == 'testit' else url)
            save_media(shot, f'{name}.webp', description, origin)

        html = PAGE.read_text(encoding='utf-8')
        if 'id="projectLightbox"' in html:
            raise RuntimeError('Gallery already installed; do not overwrite it blindly')
        soup = BeautifulSoup(html, 'html.parser')
        container = soup.select_one('#examples .projects')
        assert container is not None
        media = {
            'https://github.com/safal207/Awakening': ('awakening.webp', 'Пробуждение — игровой кадр',
                'Реальный кадр запущенной десктопной игры. C# / OpenGL.'),
            'https://safal207.github.io/Architectural-AI-Lab/': ('architectural.webp', 'Виртуальная вилла — интерфейс проекта',
                'Скриншот опубликованного архитектурного портфолио.'),
            'https://github.com/safal207/rustclip-studio': ('rustclip.webp', 'RustClip Studio — кадр деморолика',
                'Кадр деморолика проекта, не скриншот интерфейса студии.'),
            'https://safal207.github.io/test-it-python/': ('testit.webp', 'Test it — тренажёр Python',
                'Скриншот работающего учебного интерфейса.')
        }

        def shot_button(filename: str, title: str, caption: str, source: str):
            button = soup.new_tag('button', attrs={'class': 'project-shot', 'type': 'button',
                'data-shot': f'assets/{filename}', 'data-shot-title': title,
                'data-shot-caption': caption, 'data-shot-source': source,
                'aria-label': f'Увеличить: {title}'})
            item = next(r for r in records if r['file'] == filename)
            button.append(soup.new_tag('img', attrs={'src': f'assets/{filename}', 'alt': title,
                'width': str(item['width']), 'height': str(item['height']),
                'loading': 'lazy', 'decoding': 'async'}))
            hint = soup.new_tag('span', attrs={'class': 'shot-zoom', 'aria-hidden': 'true'})
            hint.string = 'Увеличить ↗'
            button.append(hint)
            return button

        cards = container.find_all('a', class_='project', recursive=False)
        assert len(cards) == len(media) == 4
        for card in cards:
            source = card['href']
            filename, title, caption = media[source]
            article = soup.new_tag('article', attrs={'class': 'project'})
            article.append(shot_button(filename, title, caption, source))
            body = soup.new_tag('div', attrs={'class': 'project-body'})
            for node in list(card.contents):
                body.append(node.extract())
            link_label = body.select_one('.link')
            if link_label is not None:
                link_label.name = 'a'
                link_label['href'] = source
                link_label['target'] = '_blank'
                link_label['rel'] = 'noopener noreferrer'
            note = soup.new_tag('p', attrs={'class': 'shot-caption'})
            note.string = caption
            body.append(note)
            article.append(body)
            card.replace_with(article)

        preview = soup.select_one('.awakening-preview')
        assert preview is not None
        preview.clear()
        preview.attrs.pop('role', None)
        preview.attrs.pop('aria-label', None)
        preview['class'] = ['awakening-preview', 'awakening-real-shot']
        preview.append(shot_button('awakening.webp', 'Пробуждение — игровой кадр',
            'Реальный кадр десктопного проекта, снятый при запуске без изменения исходного кода.',
            f'https://github.com/safal207/Awakening/tree/{AWAKENING_REF}'))
        for text_node in soup.find_all(string=True):
            if 'Иллюстрация справа схематическая' in str(text_node):
                text_node.replace_with('Локальный десктопный проект: .NET 8 и OpenGL 3.3. Справа — реальный скриншот запущенной игры. На курсе создаём посильную доработку, а не весь движок с нуля.')
        meta = soup.find('meta', attrs={'property': 'og:description'})
        if meta:
            meta['content'] = '6 образовательных треков, реальные скриншоты проектов и персональный план. Начни с интересного.'
        overview = soup.select_one('#examples .section-top p')
        if overview:
            overview.string = 'Реальные кадры открытых проектов Алексея Сафонова. Нажми на изображение, чтобы рассмотреть его. Экспериментальные и учебные работы не выдаются за коммерческие заказы.'
        style = soup.new_tag('style', attrs={'id': 'project-gallery-styles'})
        style.string = '''
.project{padding:0;gap:0;overflow:hidden;min-width:0}
.project-body{padding:23px 24px;display:flex;flex-direction:column;gap:10px;flex:1}
.project-shot{display:block;position:relative;width:100%;aspect-ratio:16/10;border:0;border-bottom:1px solid var(--line);padding:0;background:#0b101b;color:#fff;cursor:zoom-in;overflow:hidden}
.project-shot img{display:block;width:100%;height:100%;object-fit:contain;transition:transform .2s}
.project-shot:hover img{transform:scale(1.015)}
.project-shot:focus-visible{outline:3px solid var(--accent);outline-offset:-4px;z-index:2}
.shot-zoom{position:absolute;right:12px;bottom:12px;padding:7px 11px;border-radius:9px;background:rgba(8,12,21,.9);border:1px solid #66724b;color:#e6ffb6;font-size:12px;font-weight:700}
.project .shot-caption{font-size:12px;color:#adb9cd;margin:2px 0 0;line-height:1.55}
.project .link{display:inline-flex;align-items:center;min-height:40px;width:fit-content}
.awakening-feature>*{min-width:0}.awakening-real-shot{padding:20px;min-height:0;align-self:stretch}
.awakening-real-shot:before{display:none}.awakening-real-shot .project-shot{border:1px solid var(--line);border-radius:14px;aspect-ratio:16/10}
#projectLightbox{width:min(1120px,calc(100% - 24px));max-height:calc(100dvh - 32px);padding:18px;border:1px solid #566179;border-radius:18px;background:#101622;color:#f5f7fb;box-sizing:border-box;overflow:auto}
#projectLightbox::backdrop{background:rgba(3,6,12,.88)}
.gallery-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:13px}
.gallery-toolbar h3{margin:0;font-size:17px;line-height:1.4}
.gallery-toolbar button{flex:none;border:1px solid #69758b;border-radius:10px;padding:10px 14px;background:#252f43;color:white;min-height:44px;cursor:pointer}
#galleryImage{display:block;max-width:100%;max-height:68dvh;width:auto;height:auto;margin:auto;object-fit:contain;background:#080d15}
.gallery-foot{display:flex;align-items:start;justify-content:space-between;gap:18px;margin:13px 0 0;color:#bdc9db;font-size:13px}
.gallery-foot p{margin:0}.gallery-foot a{color:var(--accent);white-space:nowrap;padding:5px}
@media(max-width:760px){.awakening-real-shot{padding:15px}.project-body{padding:21px}.gallery-toolbar h3{font-size:14px}.gallery-foot{flex-direction:column;gap:5px}#projectLightbox{padding:13px}#galleryImage{max-height:62dvh}}
'''
        soup.head.append(style)
        dialog_fragment = BeautifulSoup('''<dialog id="projectLightbox" aria-labelledby="galleryTitle">
<div class="gallery-toolbar"><h3 id="galleryTitle">Скриншот проекта</h3><button id="galleryClose" type="button" aria-label="Закрыть скриншот">Закрыть ×</button></div>
<img id="galleryImage" alt="">
<div class="gallery-foot"><p id="galleryCaption"></p><a id="gallerySource" href="#" target="_blank" rel="noopener noreferrer">Исходный проект ↗</a></div>
</dialog>''', 'html.parser')
        soup.body.append(dialog_fragment.dialog.extract())
        js = soup.new_tag('script', attrs={'id': 'project-gallery-script'})
        js.string = '''
(function(){'use strict';
var dialog=document.getElementById('projectLightbox'),previous=null;
document.querySelectorAll('[data-shot]').forEach(function(button){button.addEventListener('click',function(){
previous=button;document.getElementById('galleryImage').src=button.dataset.shot;
document.getElementById('galleryImage').alt=button.dataset.shotTitle;
document.getElementById('galleryTitle').textContent=button.dataset.shotTitle;
document.getElementById('galleryCaption').textContent=button.dataset.shotCaption;
document.getElementById('gallerySource').href=button.dataset.shotSource;
if(typeof dialog.showModal==='function'){dialog.showModal();document.getElementById('galleryClose').focus();}
else{window.open(button.dataset.shot,'_blank','noopener');}
});});
document.getElementById('galleryClose').addEventListener('click',function(){dialog.close();});
dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',function(){if(previous)previous.focus();});
})();
'''
        soup.body.append(js)
        output = str(soup)
        assert not re.search(r'мам[аеуы]|её сын|супруг', output, re.I)
        ids = [e['id'] for e in soup.select('[id]')]
        assert len(ids) == len(set(ids))
        PAGE.write_text(output, encoding='utf-8')
        for index, node in enumerate(soup.find_all('script', src=False)):
            code = EVIDENCE / f'script-{index}.js'
            code.write_text(node.string or node.get_text(), encoding='utf-8')
            subprocess.run(['node', '--check', str(code)], check=True)

        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        checks = []
        for width, height in [(1440, 960), (390, 844), (320, 740)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.goto('http://127.0.0.1:4173/ai-path/?program=game#examples', wait_until='networkidle')
            assert page.locator('#programList .program').count() == 6
            assert page.locator('#examples article.project').count() == 4
            for button in page.locator('#examples [data-shot]').all():
                button.scroll_into_view_if_needed()
                button.locator('img').evaluate('(img)=>img.decode()')
                button.click()
                assert page.locator('#projectLightbox').evaluate('(d)=>d.open')
                page.locator('#galleryImage').evaluate('(img)=>img.decode()')
                page.keyboard.press('Escape')
                assert not page.locator('#projectLightbox').evaluate('(d)=>d.open')
                assert button.evaluate('(b)=>document.activeElement===b')
            page.locator('#chooseAwakening').click()
            assert 'Пробуждение' in page.locator('#selTitle').inner_text()
            assert 'game' in page.url
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'Overflow at {width}'
            page.locator('#examples').scroll_into_view_if_needed()
            page.screenshot(path=str(EVIDENCE / f'gallery-{width}.png'), full_page=False)
            checks.append({'viewport': [width, height], 'cards': 4, 'programs': 6,
                           'image_decode': 'PASS', 'lightbox_keyboard_focus': 'PASS',
                           'game_selection': 'PASS', 'horizontal_overflow': False})
        assert not errors, errors
        browser.close()
        evidence = {'captured_at_utc': datetime.now(timezone.utc).isoformat(),
                    'run_url': f'https://github.com/{os.environ.get("GITHUB_REPOSITORY", "safal207/test-it-python")}/actions/runs/{os.environ.get("GITHUB_RUN_ID", "local")}',
                    'awakening_ref': AWAKENING_REF, 'rustclip_source_blob': RUSTCLIP_BLOB,
                    'images': records, 'browser_checks': checks, 'page_errors': errors}
        (ASSETS / 'sources.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
        (EVIDENCE / 'report.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(evidence, ensure_ascii=False, indent=2))
finally:
    server.terminate()
    server.wait(timeout=10)
