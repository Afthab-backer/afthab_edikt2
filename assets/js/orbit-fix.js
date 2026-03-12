// Keeps orbit content visually upright by counter-rotating each item
// The CSS handles positioning; this JS reads the rotator's computed
// rotation and applies an inline counter-rotation so icons stay straight.
(function(){
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from((root||document).querySelectorAll(sel)); }

  function getRotationDeg(el){
    const st = getComputedStyle(el).transform;
    if (!st || st === 'none') return 0;
    // matrix(a, b, c, d, tx, ty)
    const vals = st.split('(')[1].split(')')[0].split(',');
    const a = parseFloat(vals[0]);
    const b = parseFloat(vals[1]);
    const angle = Math.atan2(b, a) * (180 / Math.PI);
    return Number.isFinite(angle) ? angle : 0;
  }

  function initOrbitFix(){
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const wrapper = q('.orbit-wrapper');
    if (!wrapper) return;
    wrapper.classList.add('orbit-fix-active');
    const rotator = q('.orbit-rotator', wrapper);
    if (!rotator) return;

    const orbits = qa('.orbit', rotator);
    if (!orbits.length) return;

    const contents = orbits.map(o => q('.orbit-content', o));
    let state = wrapper._orbitFixState;

    if (!state) {
      let rafId = null;
      let lifecycleBound = false;

      function frame(){
        // Guard against stale references when restoring from page cache.
        if (!document.body || !document.body.contains(rotator)) {
          stop();
          return;
        }

        const rotDeg = getRotationDeg(rotator) || 0;
        orbits.forEach((o, i)=>{
          const v = getComputedStyle(o).getPropertyValue('--angle') || '0deg';
          const angle = parseFloat(v) || 0;
          const desired = -(rotDeg + angle);
          const c = contents[i];
          if (c) {
            c.style.setProperty(
              'transform',
              `translate(-50%,-50%) rotate(${desired.toFixed(3)}deg)`,
              'important'
            );
          }
        });

        rafId = requestAnimationFrame(frame);
      }

      function start(){
        if (rafId) return;
        rafId = requestAnimationFrame(frame);
      }

      function stop(){
        if (!rafId) return;
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      function bindLifecycle(){
        if (lifecycleBound) return;
        lifecycleBound = true;

        // Critical for back/forward navigation restores (bfcache).
        window.addEventListener('pageshow', start);
        window.addEventListener('pagehide', stop);

        document.addEventListener('visibilitychange', function(){
          if (document.hidden) stop();
          else start();
        });
      }

      state = { start, stop, bindLifecycle };
      wrapper._orbitFixState = state;
      state.bindLifecycle();
    }

    state.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrbitFix);
  } else {
    initOrbitFix();
  }

  // Re-run init on page restores to ensure RAF is resumed from bfcache.
  window.addEventListener('pageshow', initOrbitFix);
})();
