/* Shared literal-text search; highlighting never rewrites article markup. */
(function (root) {
  'use strict';
  function matches(text, query, matchCase = false) {
    if (!query) return [];
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escaped, matchCase ? 'gu' : 'giu');
    return Array.from(text.matchAll(expression), match => ({ start: match.index, end: match.index + match[0].length }));
  }
  function domSearch(container) {
    const doc = container.ownerDocument, win = doc.defaultView;
    let ranges = [], active = -1, rectangles = [];
    const supported = !!(win.CSS?.highlights && win.Highlight);
    function clearPaint() {
      if (supported) { win.CSS.highlights.delete('article-find'); win.CSS.highlights.delete('article-find-current'); }
      rectangles.forEach(node => node.remove()); rectangles = [];
    }
    function paint() {
      clearPaint();
      if (supported) {
        const all = new win.Highlight(); ranges.forEach(range => all.add(range));
        win.CSS.highlights.set('article-find', all);
        if (ranges[active]) win.CSS.highlights.set('article-find-current', new win.Highlight(ranges[active]));
      } else {
        // Old WebKit: non-interactive overlays preserve links, MathJax and source anchors.
        ranges.forEach((range, index) => { for (const rect of range.getClientRects()) {
          const node = doc.createElement('span'); node.className = 'article-find-rect' + (index === active ? ' current' : '');
          Object.assign(node.style, { left: rect.left + win.scrollX + 'px', top: rect.top + win.scrollY + 'px', width: rect.width + 'px', height: rect.height + 'px' });
          doc.body.append(node); rectangles.push(node);
        }});
      }
    }
    function search(query, matchCase) {
      clearPaint(); ranges = []; active = -1;
      const walker = doc.createTreeWalker(container, 4); let node, text = '', previousBlock, nodes = [];
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,noscript,svg,mjx-container,[hidden],[aria-hidden="true"],.article-find-bar,.article-toc,.post-meta,.article-meta')) continue;
        if (!parent.getClientRects().length && !parent.closest('details:not([open])')) continue;
        const block = parent.closest('p,li,h1,h2,h3,h4,h5,h6,pre,td,th,summary,figcaption');
        if (previousBlock !== block) text += '\n';
        nodes.push({ node, start: text.length, end: text.length + node.length }); text += node.data; previousBlock = block;
      }
      for (const match of matches(text, query, matchCase)) {
        const start = nodes.find(item => item.end > match.start), end = nodes.find(item => item.end >= match.end);
        if (!start || !end) continue;
        const range = doc.createRange(); range.setStart(start.node, match.start - start.start); range.setEnd(end.node, match.end - end.start); ranges.push(range);
      }
      active = ranges.length ? 0 : -1; paint(); return ranges.length;
    }
    function select(index, scroll = true) {
      active = ranges.length ? (index % ranges.length + ranges.length) % ranges.length : -1; paint();
      const range = ranges[active];
      if (range && scroll) {
        const parent = range.startContainer.parentElement;
        for (let details = parent.closest('details'); details; details = details.parentElement?.closest('details')) details.open = true;
        const rect = range.getBoundingClientRect();
        win.scrollTo({ top: win.scrollY + rect.top - win.innerHeight * .36, behavior: 'instant' }); paint();
      }
      return active;
    }
    win.addEventListener('resize', paint);
    return { search, select,
      excerpt(index) {
        const range = ranges[index]; if (!range) return null;
        const block = range.startContainer.parentElement.closest('p,li,h1,h2,h3,h4,h5,h6,pre,td,th,summary,figcaption') || range.startContainer.parentElement;
        const before = doc.createRange(); before.selectNodeContents(block); before.setEnd(range.startContainer, range.startOffset);
        const after = doc.createRange(); after.selectNodeContents(block); after.setStart(range.endContainer, range.endOffset);
        return {before:before.toString().slice(-35), text:range.toString(), after:after.toString().slice(0,55)};
      },
      selectNearLine(line) {
        let nearest = -1, distance = Infinity;
        ranges.forEach((range, index) => { const block = range.startContainer.parentElement.closest('[data-source-line]');
          if (!block) return;
          const delta = Math.abs(Number(block.dataset.sourceLine) - line);
          if (delta < distance) { distance = delta; nearest = index; }
        });
        if(nearest >= 0) select(nearest, false);
      },
      clear() { ranges = []; active = -1; clearPaint(); }, destroy() { this.clear(); win.removeEventListener('resize', paint); }, get count() { return ranges.length; } };
  }
  const icons = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    previous: '<path d="m6 14 6-6 6 6"/>', next: '<path d="m6 10 6 6 6-6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
  function createBar(doc, translate = text => text) {
    const bar = doc.createElement('div'); bar.className = 'article-find-bar'; bar.setAttribute('role', 'search');
    bar.innerHTML = '<div class="article-find-field">' + icon('search') + '<input type="search" autocomplete="off" spellcheck="false"><output aria-live="polite" aria-atomic="true"></output></div><div class="article-find-actions"><button type="button" data-action="case" aria-pressed="false">Aa</button><span class="article-find-divider"></span><button type="button" data-action="previous">' + icon('previous') + '</button><button type="button" data-action="next">' + icon('next') + '</button><button type="button" data-action="close">' + icon('close') + '</button></div>';
    const input = bar.querySelector('input'), count = bar.querySelector('output');
    const buttons = Object.fromEntries([...bar.querySelectorAll('button')].map(button => [button.dataset.action, button]));
    function localize() {
      const label = translate('Find in article'); bar.setAttribute('aria-label', label); input.placeholder = label; input.setAttribute('aria-label', label);
      for (const [key, label] of Object.entries({ case: 'Match case', previous: 'Previous match', next: 'Next match', close: 'Close search' })) {
        buttons[key].title = translate(label); buttons[key].setAttribute('aria-label', translate(label));
      }
    }
    localize();
    return { bar, input, buttons, localize, status(index, total) { count.textContent = input.value ? (total ? `${index + 1} / ${total}` : translate('No matches')) : ''; buttons.previous.disabled = buttons.next.disabled = !total; } };
  }
  root.ArticleSearch = { matches, domSearch, createBar, icon };
  if (typeof module === 'object') module.exports = root.ArticleSearch;
  if (!root.document) return;
  function setupArticle() {
    const doc = root.document;
    if (doc.querySelector('.writer-preview') || doc.querySelector('#editorView')) return;
    const article = doc.querySelector('.article-main article,.post-shell'); if (!article) return;
    const chinese = () => doc.documentElement.lang.startsWith('zh');
    const labels = { 'Find in article': '文内搜索', 'Match case': '区分大小写', 'Previous match': '上一个匹配', 'Next match': '下一个匹配', 'Close search': '关闭搜索', 'No matches': '无匹配' };
    const ui = createBar(doc, text => chinese() ? labels[text] || text : text), engine = domSearch(article);
    const toggle = doc.createElement('button'); toggle.className = 'article-find-toggle'; toggle.type = 'button'; toggle.innerHTML = icon('search');
    toggle.setAttribute('aria-label', chinese() ? '文内搜索' : 'Find in article'); toggle.title = toggle.getAttribute('aria-label') + ' (⌘ / Ctrl F)';
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'articleFind'); ui.bar.id = 'articleFind'; ui.bar.hidden = true;
    (doc.querySelector('.article-main > .back-link') || article.querySelector('.blog-back-link') || article).after(toggle); doc.body.append(ui.bar);
    let index = -1, matchCase = false, timer, composing = false, returnFocus;
    function open() { if (ui.bar.hidden) returnFocus = doc.activeElement; ui.localize(); ui.bar.hidden = false; toggle.setAttribute('aria-expanded', 'true'); refresh(); ui.input.focus(); ui.input.select(); }
    function close() { clearTimeout(timer); timer = null; ui.bar.hidden = true; toggle.setAttribute('aria-expanded', 'false'); engine.clear(); (returnFocus?.isConnected ? returnFocus : toggle).focus({ preventScroll: true }); }
    function refresh() { clearTimeout(timer); timer = null; engine.search(ui.input.value, matchCase); index = engine.select(0); ui.status(index, engine.count); }
    function move(delta) { clearTimeout(timer); if (composing) return; index = engine.select(index + delta); ui.status(index, engine.count); }
    toggle.onclick = open; ui.buttons.close.onclick = close;
    ui.buttons.previous.onclick = () => { refreshPending(); move(-1); }; ui.buttons.next.onclick = () => { refreshPending(); move(1); };
    function refreshPending() { if (timer) { refresh(); timer = null; } }
    ui.buttons.case.onclick = () => { matchCase = !matchCase; ui.buttons.case.setAttribute('aria-pressed', String(matchCase)); refresh(); };
    ui.input.addEventListener('input', () => { clearTimeout(timer); if (!composing) timer = setTimeout(() => { timer = null; refresh(); }, 100); });
    ui.input.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); }); ui.input.addEventListener('compositionend', () => { composing = false; refresh(); });
    doc.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); open(); }
      if (ui.bar.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Enter' && ui.bar.contains(event.target) && event.target === ui.input) { event.preventDefault(); refreshPending(); move(event.shiftKey ? -1 : 1); }
    });
    ui.status(-1, 0);
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', setupArticle); else setupArticle();
})(typeof window === 'object' ? window : globalThis);
