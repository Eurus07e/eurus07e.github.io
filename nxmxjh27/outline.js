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
  const backLink = document.querySelector('.article-main > .back-link, [data-outline-anchor]');
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

// Use the same outline control and links at every viewport width.
(() => {
  const tools = document.querySelector('.worklist-tools');
  const title = document.querySelector('.worklist-title');
  const button = title.querySelector('.article-toc-toggle');
  const outline = document.querySelector('.article-toc');
  const content = outline.querySelector('.worklist-outline-content');
  const mobile = matchMedia('(max-width:640px)');
  const menu = document.querySelector('.nav-menu-toggle');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motion;
  let expanded = false;

  function showMobileOutline(show) {
    if (show === expanded) return;
    expanded = show;
    outline.open = true;
    outline.inert = !show;
    function finish() {
      outline.open = expanded;
      motion?.cancel();
      motion = null;
    }
    if (reduceMotion.matches) {
      finish();
    } else if (motion) {
      motion.reverse();
    } else {
      // Keep the backdrop stationary while the content moves, as in Setting.
      motion = content.animate([
        {opacity:0, transform:'translateY(-3px)'},
        {opacity:1, transform:'none'}
      ], {duration:180, easing:'ease-in-out', direction:show?'normal':'reverse', fill:'both'});
      motion.onfinish = finish;
    }
  }

  function placeOutline() {
    motion?.cancel();
    motion = null;
    expanded = false;
    outline.open = false;
    outline.inert = false;
    if (mobile.matches) {
      tools.prepend(button);
      tools.append(outline);
    } else {
      title.append(button);
      title.closest('header').after(outline);
    }
  }
  placeOutline();
  mobile.addEventListener('change', placeOutline);

  button.addEventListener('click', event => {
    if (!mobile.matches) return;
    // The shared reader handles desktop clicks. Keep mobile details visible through exit.
    event.stopImmediatePropagation();
    if (menu.getAttribute('aria-expanded') === 'true') menu.click();
    showMobileOutline(!expanded);
  }, {capture:true});
  document.addEventListener('click', event => {
    if (!mobile.matches || button.contains(event.target)) return;
    if (!outline.contains(event.target) || event.target.closest('a')) {
      showMobileOutline(false);
    }
  });
  // Retract the capsule into the AI entry while leaving via the mobile navigation.
  const nav = menu.closest('nav');
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!mobile.matches || reduceMotion.matches || !link || event.defaultPrevented ||
        event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || link.target ||
        link.pathname === location.pathname) return;
    event.preventDefault();
    tools.classList.add('is-leaving');
    setTimeout(() => location.assign(link.href), 180);
  });
  window.addEventListener('pageshow', () => tools.classList.remove('is-leaving'));
  document.addEventListener('keydown', event => {
    if (mobile.matches && outline.open && event.key === 'Escape') {
      showMobileOutline(false);
      button.focus();
    }
  });
})();
