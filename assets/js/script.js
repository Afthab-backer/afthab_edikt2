


/* ===============================
   SMOOTH SCROLL
   =============================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href && href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});


/* ===============================
   MOBILE MENU
   Ensure binding runs after DOM is ready so elements are found reliably
   =============================== */
function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navbar = document.querySelector('.navbar');

  if (mobileMenuToggle && navbar && !mobileMenuToggle._bound) {
    mobileMenuToggle.addEventListener('click', function () {
      navbar.classList.toggle('active');
      this.classList.toggle('active');
      const isOpen = this.classList.contains('active');
      this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // mark it bound so we don't double-bind
    mobileMenuToggle._bound = true;
    return true;
  }
  return false;
}

// Try to initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  if (initMobileMenu()) return;

  // If header is injected asynchronously (via fetch), observe DOM for the toggle
  const observer = new MutationObserver((mutations, obs) => {
    if (initMobileMenu()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  // safety: stop observing after 5s to avoid leaking
  setTimeout(() => observer.disconnect(), 5000);
});

// Bulletproof delegated toggle: works even when header is injected later
if (!window._mobileMenuDelegateAdded) {
  document.addEventListener('click', function (e) {
    const toggle = e.target && e.target.closest && e.target.closest('.mobile-menu-toggle');
    if (!toggle) return;

    // prefer navbar inside same header if present
    const header = toggle.closest && toggle.closest('.header');
    const navbar = (header && header.querySelector('.navbar')) || document.querySelector('.navbar');
    if (!navbar) return;

    navbar.classList.toggle('active');
    toggle.classList.toggle('active');
    try { toggle.setAttribute('aria-expanded', toggle.classList.contains('active') ? 'true' : 'false'); } catch (e) {}
  }, false);
  window._mobileMenuDelegateAdded = true;
}


/* ==================================================================
   Watch for injected header fragment and execute any inline scripts
   This solves the common issue where pages fetch('header.html') and
   assign innerHTML — script tags inside innerHTML don't execute.
   ================================================================== */
(function watchInjectedHeader(){
  if (window._headerWatcherAdded) return; window._headerWatcherAdded = true;

  const runScriptsInNode = (node) => {
    try {
      const scripts = Array.from(node.querySelectorAll('script'));
      scripts.forEach(s => {
        const ns = document.createElement('script');
        if (s.src) {
          ns.src = s.src;
          if (s.type) ns.type = s.type;
          if (s.defer) ns.defer = true;
          document.head.appendChild(ns);
        } else {
          ns.textContent = s.textContent;
          document.body.appendChild(ns);
        }
      });
    } catch (e) { console.warn('runScriptsInNode failed', e); }
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        // header could be inserted as <header class="header"> or inside #site-header container
        if (n.matches && (n.matches('header.header') || n.matches('#site-header'))) {
          const headerEl = n.matches('header.header') ? n : n.querySelector('header.header');
          if (headerEl) {
            runScriptsInNode(headerEl);
            // re-run mobile menu init to bind listeners if needed
            try { initMobileMenu(); } catch (e) {}
          }
        }
        // also handle the case where header is nested deeper
        const headerChild = n.querySelector && n.querySelector('header.header');
        if (headerChild) {
          runScriptsInNode(headerChild);
          try { initMobileMenu(); } catch (e) {}
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // if header already present on load, ensure scripts run
  // If the header was injected before this script ran, run scripts immediately
  const existingNow = document.querySelector('header.header') || document.querySelector('#site-header');
  if (existingNow) {
    runScriptsInNode(existingNow);
    try { initMobileMenu(); } catch (e) {}
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const existing = document.querySelector('header.header') || document.querySelector('#site-header');
      if (existing) {
        runScriptsInNode(existing);
        try { initMobileMenu(); } catch (e) {}
      }
    });
  }

})();


/* ===============================
   CONTACT FORM
   =============================== */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const message = document.getElementById('message')?.value.trim();

    if (!name || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    alert('Thank you for your message! We will get back to you soon.');
    this.reset();
  });
}


/* ===============================
   REVEAL ANIMATIONS
   =============================== */
(function enhancedReveal() {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  });
})();

// Ensure hero and orbit elements are visible immediately on small viewports
// This prevents a rare case where the IntersectionObserver doesn't trigger
// for certain device-emulation sizes (e.g. 430x932) and elements remain hidden.
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
      const forceShow = document.querySelectorAll('.hero, .hero-title, .hero-subtitle, .orbit-wrapper');
      forceShow.forEach(el => el.classList.add('revealed'));
    }
  } catch (e) {
    // defensive: do not interrupt other scripts
    console.warn('force reveal failed', e);
  }
});

/* ===============================
   ACTIVE NAV LINK
   =============================== */
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
});


/* ===============================
   TRAILING BLOB CURSOR (Work With Us page only)
   - keeps native system cursor visible
   - a white 3D-ish blob follows smoothly behind
   =============================== */
(function () {
  // Site-wide magnetic blob cursor
  const blob = document.createElement('div');
  blob.className = 'cursor-blob';
  document.body.appendChild(blob);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let x = mouseX, y = mouseY;
  let vx = 0, vy = 0;
  let lastMouseX = mouseX, lastMouseY = mouseY;
  let mouseVX = 0, mouseVY = 0;
  let lastMoveTime = Date.now();

  const interactiveSelector = 'a, button, .job-btn, .magic-btn, input, textarea, select, label, img';
  let interactiveElements = Array.from(document.querySelectorAll(interactiveSelector));

  function refreshInteractive() {
    interactiveElements = Array.from(document.querySelectorAll(interactiveSelector));
  }
  window.addEventListener('resize', refreshInteractive);
  window.addEventListener('scroll', refreshInteractive, true);

  let magnet = null;
  let magnetX = 0, magnetY = 0;
  const magnetRadius = 140; // px

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    blob.style.opacity = '1';
    // compute mouse velocity (difference since last mousemove)
    mouseVX = mouseX - lastMouseX;
    mouseVY = mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    lastMoveTime = Date.now();

    // find nearest interactive element
    let minDist = Infinity;
    let nearest = null;
    for (const el of interactiveElements) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const d = Math.hypot(dx, dy);
      if (d < minDist) {
        minDist = d;
        nearest = { el, cx, cy, d };
      }
    }

    if (nearest && nearest.d < magnetRadius) {
      if (magnet !== nearest.el) {
        if (magnet) magnet.classList.remove('magnetic-target');
        magnet = nearest.el;
        magnet.classList.add('magnetic-target');
      }
      magnetX = nearest.cx;
      magnetY = nearest.cy;
      blob.classList.add('blob--magnetic');
    } else {
      if (magnet) magnet.classList.remove('magnetic-target');
      magnet = null;
      blob.classList.remove('blob--magnetic');
    }
  });

  document.addEventListener('mouseleave', () => blob.style.opacity = '0');
  document.addEventListener('mouseenter', () => blob.style.opacity = '1');

  function animate() {
    const now = Date.now();
    const idleThreshold = 220; // ms before considering the cursor idle

    // compute trailing target based on recent mouse velocity so blob follows from behind
    let desiredX = mouseX;
    let desiredY = mouseY;

    if (magnet) {
      desiredX = magnetX + (mouseX - magnetX) * 0.28;
      desiredY = magnetY + (mouseY - magnetY) * 0.28;
    } else {
      // when mouse is moving, offset the desired point by a fraction of mouse velocity
      if (Math.abs(mouseVX) > 0.5 || Math.abs(mouseVY) > 0.5) {
        const trailFactor = 6; // higher = more trailing distance
        desiredX = mouseX - mouseVX * trailFactor;
        desiredY = mouseY - mouseVY * trailFactor;
      } else if (now - lastMoveTime > idleThreshold) {
        // cursor idle: stop chasing the cursor so blob doesn't stick to it
        desiredX = x;
        desiredY = y;
      }
    }

    // spring-like acceleration toward desired point
    const ax = (desiredX - x) * 0.12;
    const ay = (desiredY - y) * 0.12;

    // integrate velocity with damping
    vx = (vx + ax) * 0.86;
    vy = (vy + ay) * 0.86;

    x += vx;
    y += vy;

    blob.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(animate);
  }
  animate();

  // Hover states (enlarge) for interactive elements
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) blob.classList.add('blob--hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) blob.classList.remove('blob--hover');
  });

  // Click / press feedback for interactive elements
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // only left click
    if (e.target.closest(interactiveSelector)) blob.classList.add('blob--active');
  });
  document.addEventListener('mouseup', () => blob.classList.remove('blob--active'));

  // Touch support: brief active state when touching interactive elements
  document.addEventListener('touchstart', (e) => {
    if (e.target && e.target.closest && e.target.closest(interactiveSelector)) blob.classList.add('blob--active');
  }, { passive: true });
  document.addEventListener('touchend', () => blob.classList.remove('blob--active'));

})();


/* ===============================
   DUPLICATE LOGO TRACK FOR MARQUEE (robust)
   Duplicate logos until the track's width comfortably exceeds the
   container width so the CSS marquee can loop without gaps. Waits
   for images to load before measuring, and avoids infinite loops.
   =============================== */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.logo-track').forEach(function (track) {
    try {
    if (track.dataset.duplicated === 'true') return;

      // container that masks/frames the track (used to measure visible width)
      var container = track.parentElement;
      var containerWidth = container ? container.clientWidth : track.clientWidth;

      // limit duplications to avoid runaway loops
      var maxIterations = 12;

      // snapshot the original set once (avoid re-duplicating clones)
      var originalSnapshot = Array.from(track.querySelectorAll(':scope > .client-box'));
      if (originalSnapshot.length === 0) originalSnapshot = Array.from(track.children);

      function duplicateOnce() {
        originalSnapshot.forEach(function (it) { track.appendChild(it.cloneNode(true)); });
      }

      function ensureWidth() {
        
        // compute width of a single original cycle (sum of original items)
        var originalWidth = originalSnapshot.reduce(function (sum, el) {
          var r = el.getBoundingClientRect();
          var style = window.getComputedStyle(el);
          var marginLeft = parseFloat(style.marginLeft) || 0;
          var marginRight = parseFloat(style.marginRight) || 0;
          // include margins in the per-item width so scroll-distance matches track.scrollWidth
          return sum + (r.width || el.offsetWidth || 0) + marginLeft + marginRight;
        }, 0) || 0;

        // If we couldn't measure, fallback to container width
        if (originalWidth <= 0) originalWidth = containerWidth || window.innerWidth;

        // ensure at least two copies of the original cycle exist so the loop can be seamless
        var currentCopies = Math.max(1, Math.floor(track.querySelectorAll(':scope > .client-box').length / Math.max(1, originalSnapshot.length)));

        while (currentCopies < 2 && maxIterations-- > 0) {
          duplicateOnce();
          currentCopies++;
        }

        // Now ensure the track is wide enough for the container (avoid visible empty space during animation)
        var iter = 0;
        var multiplier = 2; // we need at least two cycles; multiplier 2 is sufficient
        var target = (containerWidth > 0) ? containerWidth * multiplier : window.innerWidth * multiplier;
        while (track.scrollWidth < target && iter < maxIterations) {
          duplicateOnce();
          iter++;
        }
        

        // set the scroll distance to exactly one original cycle for seamless looping
        // add a tiny fudge (2px) to avoid off-by-sub-pixel gaps in certain browsers
        var scrollDistance = Math.round(originalWidth) + 2;
        track.style.setProperty('--scroll-distance', `-${scrollDistance}px`);

        // ensure at least 3 cycles so JS-driven loop can slide smoothly without visible reset
        var currentCopies = Math.max(1, Math.floor(track.querySelectorAll(':scope > .client-box').length / Math.max(1, originalSnapshot.length)));
        while (currentCopies < 3 && maxIterations-- > 0) {
          duplicateOnce();
          currentCopies++;
        }

        track.dataset.duplicated = 'true';

        // JS-driven marquee to avoid CSS animation seam: move by pixels each frame
        (function startJsMarquee(trackEl, cycleWidth) {
          if (trackEl._marqueeStarted) return;
          trackEl._marqueeStarted = true;

          // disable CSS animation to avoid conflict
          trackEl.style.animation = 'none';

          var x = 0;
          var last = performance.now();
          // duration in seconds for one cycle (match previous desktop timing)
          var duration = (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ? 32 : 60;
          var speed = cycleWidth / duration; // pixels per second

          function frame(now) {
            var dt = (now - last) / 1000;
            last = now;
            // pause when hovered
            if (!trackEl.parentElement.matches(':hover')) {
              x -= speed * dt;
              // when we've moved one full cycle, wrap by adding cycleWidth
              if (x <= -cycleWidth) x += cycleWidth;
              trackEl.style.transform = `translateX(${Math.round(x)}px)`;
            }
            trackEl._marqueeRaf = requestAnimationFrame(frame);
          }

          trackEl._marqueeRaf = requestAnimationFrame(frame);

          // clean up on page unload
          window.addEventListener('beforeunload', function () {
            if (trackEl._marqueeRaf) cancelAnimationFrame(trackEl._marqueeRaf);
          });
        })(track, scrollDistance);
      }

      // Wait for images to load before measuring widths
      var imgs = track.querySelectorAll('img');
      if (imgs.length === 0) {
        ensureWidth();
      } else {
        var loaded = 0;
        var checkLoaded = function () {
          loaded++;
          if (loaded >= imgs.length) ensureWidth();
        };
        imgs.forEach(function (img) {
          if (img.complete) {
            loaded++;
          } else {
            img.addEventListener('load', checkLoaded);
            img.addEventListener('error', checkLoaded);
          }
        });
        if (loaded >= imgs.length) ensureWidth();
        // safety: if images hang, ensure duplication after 2s
        setTimeout(function () { if (track.dataset.duplicated !== 'true') ensureWidth(); }, 2000);
      }

    } catch (e) {
      console.error('logo-track duplication failed', e);
    }
  });
});


  /* ===============================
     TEAM CARD MOBILE TAP HANDLER
     - On small/touch devices, toggle `.active` on the tapped card so
       the bio overlay appears only when the user selects the card.
     =============================== */
  document.addEventListener('DOMContentLoaded', () => {
    function isMobileSized() {
      return window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && window.innerWidth <= 1024);
    }

    if (!isMobileSized()) return;

    const teamCards = Array.from(document.querySelectorAll('.team-card'));
    if (!teamCards.length) return;

    teamCards.forEach(card => {
      card.addEventListener('click', function (e) {
        // if clicking an internal link/button, let it proceed
        if (e.target.closest('a, button')) return;

        const isActive = card.classList.contains('active');
        // close any open cards
        teamCards.forEach(c => c.classList.remove('active'));
        // toggle this card
        if (!isActive) card.classList.add('active');
      });
    });

    // close active card when tapping outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.team-card')) {
        teamCards.forEach(c => c.classList.remove('active'));
      }
    });
  });


/* ===============================
   JOB MODAL (WORK WITH US)
   =============================== */
const jobs = {
  uiux: `
    <h2>UI/UX Designer</h2>
    <p>📍 Remote | 🧳 Full-time</p>

    <h4>About the Role</h4>
    <p>We're hiring a UI/UX Designer to craft intuitive user-friendly, and visually appealing digital experiences - from wireframes to prototypes - shaping how users interact with our products.</p>

    <h4>Key Responsibilities</h4>
    <p>The designer will conduct users research and usability testing, create wireframes, prototypes, and visual designs, collaborate with developers and product teams, ensure consistency across web and mobile platforms, and improve user experience based on feedback.</p>

    <h4>Requirements</h4>
    <p>Candidates should have proficiency in Figma, Adobe XD, and Sketch, Knowledge of Photoshop and Illustrator, familiarity with prototyping and wireframing tools, understanding of design systems and accessibility.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media offers a collaborative office environment, opportunities for career growth, exposure to diverse projects and industries, creative freedom and ownership of work, and learning and development support.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,
  frontend: `
    <h2>Frontend Developer</h2>
    <p>📍 remote | 🧳 Full-time</p>

    <h4>About the Role</h4>
    <p>We're looking for a Frontend Developer to bring our designs to life through clean, efficient, and scalable code. You'll be responsible for translating UI/UX designs into interactive and responsive digital experiences across devices.</p>

    <h4>Key Responsibilities</h4>
    <p>The developer will collaborate with designers and backend engineers to deliver seamless user experiences, build and maintain responsive websites and applications, optimize for performance and scalability, ensure consistency across browsers, and troubleshoot technical issues as needed.</p>

    <h4>Requirements</h4>
    <p>Candidates should have strong proficiency in HTML, CSS, and JavaScript, with experience in frameworks such as react or Angular. Familiarity with APIs, Git, responsive design principles, and cross-browser compatability is essential. An understanding of performance optimization and testing tools is preferred.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media offers exposure to innovative projects, opportunities for professional growth, creative freedom, a collaborative environment, and ongoing learning and development support.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,
  TeamManager: `
    <h2>Team Manager</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <pWe're seeking a Team Manager to lead and inspire our project teams, ensuring smooth
coordination, timely delivery, and quality outcomes. You'll act as the bridge between
management and team members, fostering collaboration, accountability, and
productivity.
</p>

    <h4>Key Responsibilities</h4>
    <p>The manager will oversee daily team operations, allocate tasks effectively, track project
progress, conduct meetings, resolve conflicts, and motivate team members to perform
at their best. They will also align team objectives with company goals and ensure
project milestones are achieved on time.</p>

    <h4>Requirements</h4>
    <p>Candidates should have proven leadership experience, excellent communication skills,
and strong organizational abilities. Familiarity with project management tools like
Trello, Asana, or Jira is preferred, along with the ability to mentor and motivate diverse
teams.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media provides leadership growth opportunities, exposure to dynamic projects, a
collaborative and supportive culture, and recognition for performance.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,
  Backend: `
    <h2>Backend Developer</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <pWe're hiring a Backend Developer to build and maintain the server-side logic,
databases, and APIs that power our digital platforms. You'll ensure our applications are
fast, reliable, and scalable while collaborating with other teams to deliver seamless
experiences.
</p>

    <h4>Key Responsibilities</h4>
    <p>The developer will design and manage server-side architecture, develop APIs, maintain
databases, optimize applications for speed and security, troubleshoot technical issues,
and collaborate with frontend developers for smooth integration.</p>

    <h4>Requirements</h4>
    <p>Candidates should have strong knowledge of Node.js, Python, PHP, or Java, along with
experience in databases like MySQL, MongoDB, or PostgreSQL. Familiarity with REST APIS,
GraphQL, version control systems, and cloud platforms is preferred.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media ensures opportunities for technical innovation, hands-on experience with
challenging projects, a collaborative environment, and career growth support.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,

  Telecaller: `
    <h2>Telecaller for Events</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <p>We're looking for a Telecaller to connect with clients, partners, and participants for our
events. You'll be responsible for outreach calls, providing accurate event information,
and helping increase engagement and attendance.
</p>

    <h4>Key Responsibilities</h4>
    <p>The telecaller will make outbound calls to potential clients and event participants,
share event details clearly, maintain call records, follow up regularly, assist in lead
generation, and support the events team with client engagement.</p>

    <h4>Requirements</h4>
    <p>Candidates should have strong communication and interpersonal skills, fluency in
English and regional languages, and the ability to handle queries professionally. Prior
telecalling or customer service experience is preferred.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media offers a supportive environment, incentives based on performance,
exposure to event management processes, and opportunities for career growth.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,

  Manager: `
    <h2>Manager</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <p>We're hiring a UI/UX Designer to craft intuitive, user-friendly, and visually appealing
digital experiences - from wireframes to prototypes - shaping how users interact with
our products.
</p>

    <h4>Key Responsibilities</h4>
    <p>The manager will supervise and guide team members, develop business strategies,
oversee budgets and timelines, monitor performance, ensure quality standards, and
report progress to leadership.</p>

    <h4>Requirements</h4>
    <p>Candidates should have proven managerial experience, strong leadership and
decision-making skills, and excellent communication abilities. Familiarity with project
and operations management tools is a plus.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media offers leadership opportunities, exposure to strategic projects, a
collaborative work culture, and performance-driven career growth.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,

  ClientAcquisition: `
    <h2>Client Acquisition</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <p>We're seeking a Client Acquisition Executive to expand our client base and generate
new business opportunities. You'll be responsible for identifying prospects, pitching our
services, and building long-term business relationships.
</p>

    <h4>Key Responsibilities</h4>
    <p>The executive will research and identify new leads, reach out through calls, emails, and
meetings, present Edikt Media's services, negotiate contracts, close deals, and ensure
smooth onboarding in collaboration with internal teams.</p>

    <h4>Requirements</h4>
    <p>Candidates should possess strong sales and communication skills, the ability to build
lasting relationships, and prior experience in business development or sales.
Knowledge of the creative and digital industries is an added advantage.</p>

    <h4>Perks & Benefits</h4>
    <p>Edikt Media offers growth-driven opportunities, performance-based incentives,
exposure to diverse industries, and continuous learning support.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,

  BusinessDev: `
    <h2>Business Developmeent Manager</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <p>We're seeking a Business Development Manager to drive strategic growth and expand
our client base. You'll identify new business opportunities, develop partnerships, and
lead sales initiatives to achieve revenue targets.
</p>

    <h4>Key Responsibilities</h4>
    <p>The manager will research and identify potential clients, develop and present
proposals, negotiate contracts, close deals, and coordinate with internal teams to
ensure smooth project onboarding and client satisfaction.</p>

    <h4>Requirements</h4>
    <p>Strong sales, negotiation, and communication skills; experience in business
development or account management; understanding of the creative, digital, or tech
industries is an added advantage.</p>

    <h4>Perks & Benefits</h4>
    <p>Performance-based incentives, exposure to diverse industries, opportunities for
professional growth, and continuous learning support.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,

  TelecallerTech: `
    <h2>Telecaller for Tech Solutions</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <p>We're seeking a Telecaller to generate leads and promote our technology solutions.
You will engage with potential clients, provide product information, and assist in
converting leads into opportunities.
</p>

    <h4>Key Responsibilities</h4>
    <p>Make outbound calls, respond to inbound inquiries, present Edikt Media's tech solutions,
follow up with prospects, schedule meetings, and update CRM records.</p>

    <h4>Requirements</h4>
    <p>Good communication and persuasion skills, ability to understand technical products,
and prior experience in sales or customer service is a plus.</p>

    <h4>Perks & Benefits</h4>
    <p>Performance-based incentives, skill development, and exposure to tech industry
clients.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,

  CompanySecretary: `
    <h2>Company Secretary</h2>
    <p>📍 remote | 🧳 Full-time</p>
    <h4>About the Role</h4>
    <p>We're looking for a Company Secretary to manage statutory compliance, corporate
governance, and legal documentation. You will ensure smooth administration and
adherence to regulatory requirements.
</p>

    <h4>Key Responsibilities</h4>
    <p>Maintain statutory registers, prepare board meeting minutes, ensure compliance with
corporate laws, liaise with regulatory authorities, and provide legal and administrative
support to management.</p>

    <h4>Requirements</h4>
    <p>Degree or certification in Company Secretaryship; knowledge of corporate governance
and compliance; attention to detail and organizational skills.</p>

    <h4>Perks & Benefits</h4>
    <p>Professional development opportunities, flexible work environment, and exposure to
corporate operations.</p>

    <h4>to Apply</h4>
    <p> kindly send us Resume & CV to us at:
    <strong>contactus@edikt.in</strong>
    </p>
  `,
};

function openJob(role) {
  const modal = document.getElementById('jobModal');
  const content = document.getElementById('jobContent');
  if (!modal || !content || !jobs[role]) return;

  content.innerHTML = jobs[role];
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeJob() {
  const modal = document.getElementById('jobModal');
  if (!modal) return;

  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ===============================
// HERO TEXT WORD STAGGER
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const heroText = document.querySelector(".hero-text-reveal");

  if (!heroText) return;

  const words = heroText.querySelectorAll(".word");

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        heroText.classList.add("revealed");

        words.forEach((word, index) => {
          word.style.transitionDelay = `${index * 220}ms`;
        });

        observer.unobserve(heroText);
      }
    },
    { threshold: 0.6 }
  );

  observer.observe(heroText);
});

// ===============================
// HERO SUBTITLE + BUTTON STAGGER
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const subtitle = document.querySelector(".hero-subtitle-reveal");
  const buttons = document.querySelector(".hero-buttons-reveal");

  if (!subtitle || !buttons) return;

  const lines = subtitle.querySelectorAll(".line");

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {

        // subtitle lines stagger
        subtitle.classList.add("revealed");
        lines.forEach((line, i) => {
          line.style.transitionDelay = `${i * 220}ms`;
        });

        // buttons after subtitle
        setTimeout(() => {
          buttons.classList.add("revealed");
        }, 520);

        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 }
  );

  observer.observe(subtitle);
});



// ===============================
// MAGIC BUTTON HOVER (GLOBAL)
// ===============================

document.addEventListener("mouseover", (e) => {
  const btn = e.target.closest(".magic-btn");
  if (!btn) return;

  btn.classList.remove("hover-out");
  btn.classList.add("hover-in");
});

document.addEventListener("mouseout", (e) => {
  const btn = e.target.closest(".magic-btn");
  if (!btn) return;

  btn.classList.remove("hover-in");
  btn.classList.add("hover-out");
});

/* ===============================
   FOOTER STAGGERED REVEAL
   Adds `revealed` to each footer child one-by-one when footer scrolls into view
   =============================== */
(function footerStaggerReveal(){
  // The footer is injected via fetch into the page; wait until it's present.
  function setup(container){
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const children = Array.from(container.children);
        children.forEach((child, i) => {
          setTimeout(() => child.classList.add('revealed'), i * 140);
        });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    observer.observe(container);
  }

  function waitForContainer() {
    const selector = '.footer-content.reveal-stagger';
    let attempts = 0;
    const interval = setInterval(() => {
      const container = document.querySelector(selector);
      if (container) {
        clearInterval(interval);
        setup(container);
        return;
      }
      attempts++;
      if (attempts > 60) clearInterval(interval);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContainer);
  } else {
    waitForContainer();
  }
})();

