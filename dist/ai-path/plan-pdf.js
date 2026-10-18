(function () {
  'use strict';

  var currentScript = document.currentScript;
  var assetBase = new URL('.', currentScript && currentScript.src || window.location.href);
  var pendingDependencies = null;
  var assetLoads = {};
  var FONT = 'AIPath';

  function loadScript(file, ready) {
    if (ready()) return Promise.resolve();
    if (assetLoads[file]) return assetLoads[file];
    assetLoads[file] = new Promise(function (resolve, reject) {
      var url = new URL(file, assetBase);
      if (url.origin !== window.location.origin) {
        reject(new Error('PDF assets must come from this site.'));
        return;
      }
      var script = document.createElement('script');
      var finished = false;
      var timer = window.setTimeout(function () {
        finish(new Error('PDF assets took too long to load.'));
      }, 15000);
      function finish(error) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (error) {
          script.remove();
          reject(error);
        } else {
          resolve();
        }
      }
      script.src = url.href;
      script.async = true;
      script.onload = function () {
        finish(ready() ? null : new Error('A PDF asset did not initialize.'));
      };
      script.onerror = function () { finish(new Error('A PDF asset could not be loaded.')); };
      document.head.appendChild(script);
    }).catch(function (error) {
      delete assetLoads[file];
      throw error;
    });
    return assetLoads[file];
  }

  function dependencies() {
    if (!pendingDependencies) {
      pendingDependencies = Promise.all([
        loadScript('vendor/jspdf.umd.min.js', function () {
          return window.jspdf && typeof window.jspdf.jsPDF === 'function';
        }),
        loadScript('vendor/plan-fonts.js', function () {
          var fonts = window.AIPathPlanFonts;
          return fonts && typeof fonts.regular === 'string' && typeof fonts.bold === 'string';
        })
      ]).catch(function (error) {
        pendingDependencies = null;
        throw error;
      });
    }
    return pendingDependencies;
  }

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[\u00a0\u202f]/g, ' ')
      .replace(/\r\n?/g, '\n');
  }

  function snapshot(plan) {
    if (!plan || typeof plan !== 'object') throw new Error('Choose a program before saving a plan.');
    var copy = {};
    ['id', 'name', 'level', 'pace', 'schedule', 'outcome', 'firstTask', 'starterTitle',
      'requirements', 'paceNote', 'conditions', 'idea', 'url', 'contact', 'fit', 'core', 'extra'].forEach(function (key) {
      copy[key] = clean(plan[key]);
    });
    ['takeaways', 'starterPrompts', 'steps', 'readiness'].forEach(function (key) {
      copy[key] = Array.isArray(plan[key]) ? plan[key].map(clean) : [];
    });
    if (!copy.name) throw new Error('The selected program has no title.');
    return copy;
  }

  function build(plan) {
    var doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
    var fonts = window.AIPathPlanFonts;
    doc.addFileToVFS('AIPath-Regular.ttf', fonts.regular);
    doc.addFont('AIPath-Regular.ttf', FONT, 'normal');
    doc.addFileToVFS('AIPath-Bold.ttf', fonts.bold);
    doc.addFont('AIPath-Bold.ttf', FONT, 'bold');
    doc.setProperties({ title: 'AI PATH - ' + plan.name, subject: 'Личный план обучения', author: 'AI PATH', creator: 'AI PATH' });

    var pageWidth = 210;
    var pageHeight = 297;
    var margin = 18;
    var width = pageWidth - margin * 2;
    var bottom = 276;
    var continuedTop = 29;
    var y = 21;
    var sectionNumber = 0;
    var followsHeading = false;
    var ink = [24, 36, 52];
    var muted = [83, 98, 113];
    var lime = [211, 239, 99];
    var pale = [244, 247, 248];
    var lineHeight = 5.2;

    function font(size, bold, color) {
      doc.setFont(FONT, bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor.apply(doc, color || ink);
    }

    // Measure every line with the actual embedded font, including unbroken URLs/ideas.
    function wrap(text, availableWidth, size, bold) {
      font(size, bold);
      var lines = [];
      clean(text).split('\n').forEach(function (paragraph) {
        if (!paragraph.trim()) { lines.push(''); return; }
        var line = '';
        paragraph.trim().split(/\s+/).forEach(function (word) {
          var candidate = line ? line + ' ' + word : word;
          if (doc.getTextWidth(candidate) <= availableWidth) { line = candidate; return; }
          if (line) { lines.push(line); line = ''; }
          if (doc.getTextWidth(word) <= availableWidth) { line = word; return; }
          Array.from(word).forEach(function (character) {
            if (line && doc.getTextWidth(line + character) > availableWidth) {
              lines.push(line);
              line = character;
            } else {
              line += character;
            }
          });
        });
        if (line) lines.push(line);
      });
      return lines;
    }

    function pageStart(first) {
      doc.setFillColor.apply(doc, lime);
      doc.rect(margin, 12, 12, 2, 'F');
      font(8, true, muted);
      doc.text(first ? 'AI PATH / ЛИЧНЫЙ ПЛАН' : 'AI PATH / ПЛАН ОБУЧЕНИЯ', margin + 16, 14);
    }

    function newPage() {
      doc.addPage();
      pageStart(false);
      y = continuedTop;
    }

    function ensure(height) {
      if (y + height > bottom) newPage();
    }

    function paragraphHeight(text, options) {
      options = options || {};
      return wrap(text, options.width || width, options.size || 10, !!options.bold).length * (options.lineHeight || lineHeight);
    }

    function paragraph(text, options) {
      if (!text) return;
      options = options || {};
      var x = options.x == null ? margin : options.x;
      var availableWidth = options.width || width;
      var size = options.size || 10;
      var height = options.lineHeight || lineHeight;
      var lines = wrap(text, availableWidth, size, !!options.bold);
      var wholeHeight = lines.length * height;
      // Keep a normal paragraph/step intact; very long personal ideas can span pages.
      if (!followsHeading && wholeHeight <= bottom - continuedTop) ensure(wholeHeight);
      followsHeading = false;
      lines.forEach(function (line) {
        ensure(height);
        font(size, !!options.bold, options.color);
        doc.text(line, x, y + height * 0.76);
        if (options.link && line) {
          doc.link(x, y, Math.min(availableWidth, doc.getTextWidth(line)), height, { url: options.link });
        }
        y += height;
      });
      y += options.after == null ? 3.2 : options.after;
    }

    function section(title, firstText, options) {
      options = options || {};
      var headingHeight = 13;
      var firstHeight = firstText ? paragraphHeight(firstText, options) : lineHeight;
      // A heading always travels with its first paragraph (or its first lines if oversized).
      var reserve = Math.min(firstHeight + 3.2, bottom - continuedTop - headingHeight);
      ensure(headingHeight + reserve);
      y += 3;
      sectionNumber += 1;
      doc.setFillColor.apply(doc, lime);
      doc.roundedRect(margin, y, 9, 6.3, 1.2, 1.2, 'F');
      font(8, true);
      doc.text(String(sectionNumber).padStart(2, '0'), margin + 4.5, y + 4.4, { align: 'center' });
      font(12.5, true);
      doc.text(title, margin + 13, y + 4.8);
      y += 10;
      followsHeading = true;
    }

    function list(items) {
      items.forEach(function (item, index) {
        var itemWidth = width - 9;
        var itemHeight = paragraphHeight(item, { width: itemWidth });
        if (!followsHeading && itemHeight <= bottom - continuedTop) ensure(itemHeight + 2.6);
        font(9, true, muted);
        doc.text(String(index + 1) + '.', margin, y + lineHeight * 0.76);
        paragraph(item, { x: margin + 9, width: itemWidth, after: 2.6 });
      });
    }

    function metadata() {
      var gap = 5;
      var cardWidth = (width - gap) / 2;
      var values = [plan.level, plan.pace];
      var labels = ['МОЙ УРОВЕНЬ', 'НАГРУЗКА В НЕДЕЛЮ'];
      var valueLines = values.map(function (value) { return wrap(value, cardWidth - 12, 9.5, false); });
      var cardHeight = Math.max(valueLines[0].length, valueLines[1].length) * 4.8 + 16;
      ensure(cardHeight + 4);
      values.forEach(function (_value, index) {
        var x = margin + index * (cardWidth + gap);
        doc.setFillColor.apply(doc, pale);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
        font(7.5, true, muted);
        doc.text(labels[index], x + 6, y + 7);
        valueLines[index].forEach(function (line, lineIndex) {
          font(9.5, false);
          doc.text(line, x + 6, y + 13 + lineIndex * 4.8);
        });
      });
      y += cardHeight + 4;
      paragraph(plan.schedule, { size: 9, color: muted, lineHeight: 4.8, after: 3 });
    }

    pageStart(true);
    y = 23;
    paragraph(plan.name, { size: 23, bold: true, lineHeight: 10, after: 5 });
    metadata();

    if (plan.fit) {
      section('Кому подойдёт', plan.fit);
      paragraph(plan.fit);
    }

    section('Результат', plan.outcome);
    paragraph(plan.outcome);

    if (plan.takeaways.length) {
      section('Что будет на руках', plan.takeaways[0], { width: width - 9 });
      list(plan.takeaways);
    }

    section('Первый шаг', plan.firstTask);
    paragraph(plan.firstTask);
    if (plan.starterTitle) {
      var firstPromptHeight = plan.starterPrompts.length ? paragraphHeight(plan.starterPrompts[0], { width: width - 9 }) : 0;
      ensure(paragraphHeight(plan.starterTitle, { bold: true }) + 3.2 + Math.min(firstPromptHeight, 35));
      paragraph(plan.starterTitle, { bold: true, after: 3.2 });
    }
    list(plan.starterPrompts);

    if (plan.steps.length) {
      section('План по этапам', plan.steps[0], { width: width - 9 });
      list(plan.steps);
    }

    section('Для старта', plan.requirements || plan.paceNote);
    paragraph(plan.requirements);
    list(plan.readiness);
    paragraph(plan.paceNote);

    if (plan.core) {
      section('Основа программы', plan.core);
      paragraph(plan.core);
      paragraph(plan.extra);
    }

    section('До начала обучения', plan.conditions);
    paragraph(plan.conditions);

    if (plan.idea.trim()) {
      section('Моя идея', plan.idea);
      paragraph(plan.idea);
    }

    section('Вернуться к плану', plan.url, { size: 8.5, lineHeight: 4.5 });
    paragraph(plan.url, { size: 8.5, lineHeight: 4.5, color: muted, link: plan.url, after: 4 });
    var email = plan.contact.replace(/^mailto:/i, '').trim();
    paragraph('Контакт: ' + email, { size: 9, color: muted, link: 'mailto:' + email });

    var pageCount = doc.getNumberOfPages();
    for (var page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(219, 226, 230);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
      font(7.5, false, muted);
      doc.text('AI PATH · ' + plan.id, margin, pageHeight - 10);
      doc.text('Страница ' + page + ' из ' + pageCount, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    return doc.output('blob');
  }

  window.AIPathPlanPdf = {
    create: function (plan) {
      var selected;
      try { selected = snapshot(plan); } catch (error) { return Promise.reject(error); }
      return dependencies().then(function () { return build(selected); });
    }
  };
}());
