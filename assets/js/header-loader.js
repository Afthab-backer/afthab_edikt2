// Centralized header loader
(function(){
  if (window._headerLoaderAdded) return; window._headerLoaderAdded = true;

  function ensureFavicon() {
    try {
      const head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;
      const faviconHref = '/assets/images/edikt%20logo/fevicon.png';

      let icon = head.querySelector('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        head.appendChild(icon);
      }
      icon.type = 'image/png';
      icon.href = faviconHref;

      let shortcutIcon = head.querySelector('link[rel="shortcut icon"]');
      if (!shortcutIcon) {
        shortcutIcon = document.createElement('link');
        shortcutIcon.rel = 'shortcut icon';
        head.appendChild(shortcutIcon);
      }
      shortcutIcon.type = 'image/png';
      shortcutIcon.href = faviconHref;
    } catch (e) {
      console.warn('header-loader: failed to ensure favicon', e);
    }
  }

  function normalizeHref(href) {
    return String(href || '')
      .trim()
      .toLowerCase()
      .replace(/^[./]+/, '')
      .split('#')[0]
      .split('?')[0];
  }

  function resolveNavTarget(pathname) {
    const raw = decodeURIComponent((pathname || '').toLowerCase()).replace(/\/+$/, '');
    const leaf = raw.split('/').pop() || '';
    const page = leaf.replace(/\.html?$/, '');

    if (!raw || raw === '/' || !page || page === 'index') return 'index.html';

    if (page === 'about') return 'about.html';
    if (page === 'services' || page === 'service') return 'services.html';
    if (page === 'team') return 'team.html';
    if (page === 'project-client-review' || page === 'client-stories' || page === 'clientstories') return 'project-client-review.html';
    if (page === 'work_with_us' || page === 'work-with-us' || page === 'workwithus' || page === 'work') return 'work_with_us.html';

    // Project listing + project detail aliases should highlight Projects.
    if (
      page === 'project' ||
      page.startsWith('project-') ||
      page.includes('website-stpi') ||
      page.includes('conference') ||
      page.includes('salem') ||
      page.includes('brij') ||
      page.includes('logo')
    ) {
      return 'project.html';
    }

    return null;
  }

  function initActiveNav(scope) {
    const root = scope && scope.querySelector ? scope : document;
    const nav = root.querySelector('.navbar') || document.querySelector('.navbar');
    if (!nav) return false;

    const links = Array.from(nav.querySelectorAll('a[href]'));
    if (!links.length) return false;

    const targetHref = resolveNavTarget(window.location.pathname);
    links.forEach(link => link.classList.remove('active'));
    if (!targetHref) return false;

    const targetNoExt = targetHref.replace(/\.html?$/, '');
    const target = links.find(link => {
      const rawHref = String(link.getAttribute('href') || '')
        .trim()
        .toLowerCase()
        .split('#')[0]
        .split('?')[0];
      const href = normalizeHref(rawHref);

      // Home link can be "/" while target resolves as index.html.
      if (targetHref === 'index.html') {
        return rawHref === '/' || href === '' || href === 'index' || href === 'index.html';
      }

      return href === targetHref || href === targetNoExt;
    });
    if (!target) return false;

    target.classList.add('active');
    return true;
  }

  function runScripts(nodes) {
    // sequentially insert scripts preserving order and awaiting external loads
    const seq = nodes.reduce((p, s) => p.then(() => new Promise(resolve => {
      try {
        const ns = document.createElement('script');
        if (s.src) {
          ns.src = s.src;
          if (s.type) ns.type = s.type;
          ns.async = false;
          ns.onload = resolve; ns.onerror = resolve;
          document.head.appendChild(ns);
        } else {
          ns.textContent = s.textContent;
          document.body.appendChild(ns);
          resolve();
        }
      } catch (e) { console.warn('header-loader runScripts error', e); resolve(); }
    })), Promise.resolve());

    return seq;
  }

  function insertHeader(html) {
    const container = document.getElementById('site-header');
    if (!container) return Promise.resolve();
    container.innerHTML = html;
    const scripts = Array.from(container.querySelectorAll('script'));
    return runScripts(scripts).then(() => {
      try { if (typeof initHeaderScroll === 'function') initHeaderScroll(); } catch (e) {}
      try { if (typeof initMobileMenu === 'function') initMobileMenu(); } catch (e) {}
      try { initActiveNav(container); } catch (e) {}
    });
  }

  function loadHeader() {
    ensureFavicon();
    return fetch('header.html?_=' + Date.now(), { cache: 'no-store' })
      .then(res => res.text())
      .then(html => insertHeader(html))
      .catch(err => console.warn('header-loader: failed to load header', err));
  }

  // If #site-header exists on load, load header early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }

})();
