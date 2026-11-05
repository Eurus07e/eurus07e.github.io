const filterButtons = [...document.querySelectorAll('[data-filter]')];
const articles = [...document.querySelectorAll('[data-post-category]')];
const resultCount = document.querySelector('[data-result-count]');

// A hidden home-row shortcut, shared by the homepage and blog pages.
(() => {
  const sequence = 'asdfghjkl';
  let progress = 0;
  let lastKeyAt = 0;
  const reset = () => { progress = 0; lastKeyAt = 0; };

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229 ||
        event.ctrlKey || event.metaKey || event.altKey ||
        target?.isContentEditable || target?.closest?.('input, textarea, select, [role="textbox"]')) {
      reset();
      return;
    }
    if (event.repeat) return;
    const now = performance.now();
    if (now - lastKeyAt > 2000) progress = 0;
    const key = event.key.toLowerCase();
    progress = key === sequence[progress] ? progress + 1 : (key === sequence[0] ? 1 : 0);
    lastKeyAt = now;
    if (progress === sequence.length) {
      reset();
      window.location.assign('https://chromedino.com/');
    }
  });
  document.addEventListener('focusin', reset);
  document.addEventListener('visibilitychange', reset);
  window.addEventListener('blur', reset);
})();

const articleToc = document.querySelector('.article-toc');
if (articleToc) {
  articleToc.open = false;
  const desktopOutline = window.matchMedia('(min-width: 1200px)');
  const list = articleToc.querySelector('ol');
  const entries = [...list.querySelectorAll('a[href^="#"]')].map((link) => ({
    link,
    heading: document.getElementById(decodeURIComponent(link.hash.slice(1))),
  })).filter(({ heading }) => heading);
  let activeLink = null;
  let frame = 0;
  let outlineAnimation = null;
  let openingOutline = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const backLink = document.querySelector('.article-main > .back-link');
  const outlineButton = document.createElement('button');
  outlineButton.type = 'button';
  outlineButton.className = 'article-toc-toggle';
  articleToc.id ||= 'article-outline';
  outlineButton.setAttribute('aria-controls', articleToc.id);
  outlineButton.setAttribute('aria-keyshortcuts', 't');
  outlineButton.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>';
  if (backLink) {
    backLink.after(outlineButton);
    articleToc.classList.add('has-icon-toggle');
    outlineButton.addEventListener('click', toggleOutline);
    articleToc.querySelector('summary').addEventListener('click', (event) => {
      if (!desktopOutline.matches) return;
      event.preventDefault();
      toggleOutline();
    });
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      if (!desktopOutline.matches || event.defaultPrevented || event.repeat || event.isComposing ||
          event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 't' ||
          target.isContentEditable || target.closest?.('input, textarea, select, [role="textbox"]')) return;
      event.preventDefault();
      toggleOutline();
    });
  }

  function finishOutlineAnimation() {
    if (!openingOutline && articleToc.contains(document.activeElement)) {
      outlineButton.focus({ preventScroll: true });
    }
    articleToc.open = openingOutline;
    outlineAnimation?.cancel();
    outlineAnimation = null;
    articleToc.classList.remove('is-animating');
    syncOutlineButton();
    activeLink?.removeAttribute('aria-current');
    activeLink = null;
    scheduleOutlineUpdate();
  }

  function toggleOutline() {
    // Reverse from the current frame when toggled before the motion finishes.
    if (outlineAnimation) {
      openingOutline = !openingOutline;
      outlineAnimation.reverse();
      return;
    }
    openingOutline = !articleToc.open;
    if (reducedMotion.matches || !desktopOutline.matches) {
      finishOutlineAnimation();
      return;
    }
    articleToc.open = true;
    syncOutlineButton();
    // Measure the fully expanded list with its current viewport height limit.
    updateOutline();
    const height = list.getBoundingClientRect().height;
    articleToc.classList.add('is-animating');
    outlineAnimation = list.animate([
      { height: '0px', opacity: 0, transform: 'translateY(-10px)', marginTop: '0px', paddingTop: '0px', paddingBottom: '0px' },
      { height: `${height}px`, opacity: 1, transform: 'translateY(0)', marginTop: '12px', paddingTop: '3px', paddingBottom: '8px' },
    ], {
      duration: 260,
      easing: 'cubic-bezier(.4, 0, .2, 1)',
      direction: openingOutline ? 'normal' : 'reverse',
      fill: 'both',
    });
    outlineAnimation.onfinish = finishOutlineAnimation;
  }

  function syncOutlineButton() {
    const label = articleToc.open ? 'Hide table of contents' : 'Show table of contents';
    outlineButton.setAttribute('aria-label', label);
    outlineButton.setAttribute('aria-expanded', String(articleToc.open));
    outlineButton.title = `${label} (T)`;
    if (backLink && desktopOutline.matches && !articleToc.open && articleToc.contains(document.activeElement)) {
      outlineButton.focus({ preventScroll: true });
    }
  }
  syncOutlineButton();

  function updateOutline() {
    frame = 0;
    if (!desktopOutline.matches) return;

    // Account for the title area before the rail sticks, and for short windows.
    if (articleToc.open && !outlineAnimation) {
      // The rail can move above the viewport near the article's end. Never let
      // that increase its height beyond the space available at its sticky top.
      const listTop = Math.max(68, list.getBoundingClientRect().top);
      list.style.setProperty('--outline-list-height', `${Math.max(0, window.innerHeight - listTop - 24)}px`);
    }

    let current = entries[0];
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top <= 100) current = entry;
      else break;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = entries.at(-1);
    }
    if (!current || current.link === activeLink) return;
    activeLink?.removeAttribute('aria-current');
    activeLink = current.link;
    activeLink.setAttribute('aria-current', 'location');

    // Follow reading progress inside the outline without moving the article.
    // Leave it alone while someone is browsing or using the keyboard in it.
    if (articleToc.open && !outlineAnimation && !articleToc.matches(':hover') && !articleToc.contains(document.activeElement)) {
      const viewport = list.getBoundingClientRect();
      const target = activeLink.getBoundingClientRect();
      if (target.top < viewport.top || target.bottom > viewport.bottom) {
        list.scrollTop += target.top - viewport.top - list.clientHeight / 3;
      }
    }
  }

  const scheduleOutlineUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateOutline);
  };
  const updateOutlineLayout = () => {
    if (outlineAnimation) finishOutlineAnimation();
    if (!desktopOutline.matches) {
      list.style.removeProperty('--outline-list-height');
      activeLink?.removeAttribute('aria-current');
      activeLink = null;
    }
    scheduleOutlineUpdate();
  };
  updateOutlineLayout();
  desktopOutline.addEventListener('change', updateOutlineLayout);
  window.addEventListener('scroll', scheduleOutlineUpdate, { passive: true });
  window.addEventListener('resize', scheduleOutlineUpdate);
  window.addEventListener('load', scheduleOutlineUpdate);
  articleToc.addEventListener('toggle', () => {
    syncOutlineButton();
    // Reopening at a later section should reveal the current location.
    activeLink?.removeAttribute('aria-current');
    activeLink = null;
    scheduleOutlineUpdate();
  });
  // Images and fonts can change the header or section positions after load.
  new ResizeObserver(scheduleOutlineUpdate).observe(document.querySelector('.article-main'));
}

if (filterButtons.length && resultCount) {
  const input = document.getElementById('blogSearch');
  const caseButton = document.querySelector('[data-search-case]');
  const searchCount = document.querySelector('[data-search-count]');
  const empty = document.querySelector('[data-search-empty]');
  const index = new Map(JSON.parse(document.getElementById('blogSearchIndex')?.textContent || '[]').map(item => [item.url, item]));
  let category = 'all', timer, composing = false, matchCase = false;
  const toggle = document.querySelector('.blog-search-toggle');
  const panel = document.getElementById('blogSearchPanel');
  function closeSearch() {
    clearTimeout(timer);
    composing = false;
    input.value = '';
    updateResults();
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus({preventScroll:true});
  }
  if (input && toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      if (!panel.hidden) return closeSearch();
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();
    });
    document.querySelector('[data-search-close]').addEventListener('click', closeSearch);
    document.addEventListener('keydown', event => {
      if (!panel.hidden && event.key === 'Escape' && !event.isComposing) {event.preventDefault(); closeSearch();}
    });
  }
  function updateResults() {
    clearTimeout(timer);
    const query = input?.value.trim() || '';
    const expression = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'u' : 'iu') : null;
    let visible = 0;
    for (const article of articles) {
      const entry = index.get(article.dataset.postUrl);
      const match = expression?.exec(entry?.text || '');
      const show = (category === 'all' || article.dataset.postCategory === category) && (!query || !!match);
      article.hidden = !show;
      article.querySelector('.search-excerpt')?.remove();
      const summary = article.querySelector('.archive-copy > p');
      if (summary) summary.hidden = !!query;
      if (!show) continue;
      visible++;
      if (match) {
        const text = entry.text;
        const start = Math.max(0, match.index - 65);
        const end = Math.min(text.length, match.index + match[0].length + 120);
        const excerpt = document.createElement('p'), mark = document.createElement('mark');
        excerpt.className = 'search-excerpt';
        mark.textContent = match[0];
        excerpt.append((start ? '…' : '') + text.slice(start, match.index), mark, text.slice(match.index + match[0].length, end) + (end < text.length ? '…' : ''));
        article.querySelector('.archive-copy h2').after(excerpt);
      }
    }
    for (const button of filterButtons) {
      const active = button.dataset.filter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    resultCount.textContent = query
      ? `${visible} ${visible === 1 ? 'article' : 'articles'} matching “${query}”${category === 'all' ? '' : ` in ${category}`}`
      : category === 'all' ? `Showing all ${visible} articles` : `Showing ${visible} ${visible === 1 ? 'article' : 'articles'} in ${category}`;
    if (empty) empty.hidden = visible > 0;
    if (searchCount) searchCount.textContent = query ? `${visible} found` : '';
  }
  for (const button of filterButtons) button.addEventListener('click', () => { category = button.dataset.filter; updateResults(); });
  input?.addEventListener('input', () => { clearTimeout(timer); if (!composing) timer = setTimeout(updateResults, 100); });
  input?.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
  input?.addEventListener('compositionend', () => { composing = false; updateResults(); });
  caseButton?.addEventListener('click', () => {
    matchCase = !matchCase;
    caseButton.setAttribute('aria-pressed', String(matchCase));
    updateResults();
  });
}
