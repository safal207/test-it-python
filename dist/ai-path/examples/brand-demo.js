(() => {
  'use strict';
  const escapeXML = value => String(value).replace(/[<>&"']/g, character => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[character]));
  function download(content, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function lines(text, width = 60) {
    const result = [];
    let line = '';
    for (let word of String(text).split(/\s+/)) {
      const characters = [...word];
      while (characters.length > width) {
        if (line) {result.push(line); line = '';}
        result.push(characters.splice(0, width).join(''));
      }
      word = characters.join('');
      if (line && (line + ' ' + word).length > width) {result.push(line); line = '';}
      line += (line ? ' ' : '') + word;
    }
    if (line) result.push(line);
    return result;
  }
  window.brandDemo = Object.freeze({escapeXML, download, lines});
})();
