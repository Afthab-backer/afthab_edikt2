// Centralized header loader
(function(){
  if (window._headerLoaderAdded) return; window._headerLoaderAdded = true;

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
    });
  }

  function loadHeader() {
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
