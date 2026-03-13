// ===============================
// HEADER SCROLL BEHAVIOR
// ===============================

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  if (header.dataset.scrollInit === '1') return;
  header.dataset.scrollInit = '1';

  let lastScrollY = window.scrollY;
  let latestScrollY = lastScrollY;
  let rafId = null;

  function applyScroll(currentScrollY) {

    /* TOP OF PAGE → FULL HEADER */
    if (currentScrollY === 0) {
      header.classList.remove('header--hidden', 'header--floating');
      lastScrollY = currentScrollY;
      return;
    }

    /* SCROLLING DOWN → HIDE HEADER */
    if (currentScrollY > lastScrollY) {
      header.classList.add('header--hidden');
      header.classList.remove('header--floating');
    }

    /* SCROLLING UP → SHOW FLOATING PILL */
    if (currentScrollY < lastScrollY) {
      header.classList.remove('header--hidden');
      header.classList.add('header--floating');
    }

    lastScrollY = currentScrollY;
  }

  function onScroll() {
    latestScrollY = window.scrollY;
    if (rafId) return;

    rafId = requestAnimationFrame(function () {
      rafId = null;
      applyScroll(latestScrollY);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  applyScroll(lastScrollY); // run once on load
}
