// ===============================
// HEADER SCROLL BEHAVIOR
// ===============================

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScrollY = window.scrollY;

  function onScroll() {
    const currentScrollY = window.scrollY;

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

  window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll);

  onScroll(); // run once on load
}
