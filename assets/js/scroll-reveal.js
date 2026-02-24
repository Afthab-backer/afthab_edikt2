// ===============================
// UNIVERSAL SCROLL REVEAL (FAST + SAFE)
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  const groups = [
    { selector: ".projects-hero .hero-title", stagger: 0 },
    { selector: ".projects-hero .hero-subtitle", stagger: 120 },
    { selector: ".projects-grid-page .project-item", stagger: 120 },
    { selector: ".service-360-card", stagger: 120 },
    { selector: ".services-grid .service-card", stagger: 120 },
    { selector: ".reveal", stagger: 80 }
  ];

  groups.forEach(group => {

    const items = document.querySelectorAll(group.selector);
    if (!items.length) return;

    let localIndex = 0;   // 🔥 resets per group

    const observer = new IntersectionObserver((entries) => {

      entries.forEach(entry => {

        if (entry.isIntersecting) {

          entry.target.style.transitionDelay =
            `${localIndex * group.stagger}ms`;

          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
          localIndex++;

        }

      });

    }, {
      threshold: 0.2,
      rootMargin: "0px 0px -60px 0px"
    });

    items.forEach(el => observer.observe(el));

  });

});