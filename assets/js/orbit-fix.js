// Keeps orbit content visually upright by counter-rotating each item
// The CSS handles positioning; this JS reads the rotator's computed
// rotation and applies an inline counter-rotation so icons stay straight.
(function(){
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from((root||document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function(){
    console.log('orbit-fix.js loaded');
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const wrapper = q('.orbit-wrapper');
    if (!wrapper) return;
    const rotator = q('.orbit-rotator', wrapper);
    if (!rotator) return;

    const orbits = qa('.orbit', rotator);
    if (!orbits.length) return;

    const contents = orbits.map(o => q('.orbit-content', o));

    function getRotationDeg(el){
      const st = getComputedStyle(el).transform;
      if (!st || st === 'none') return 0;
      // matrix(a, b, c, d, tx, ty)
      const vals = st.split('(')[1].split(')')[0].split(',');
      const a = parseFloat(vals[0]);
      const b = parseFloat(vals[1]);
      const angle = Math.atan2(b, a) * (180 / Math.PI);
      return angle;
    }

    let rafId = null;
    function frame(){
      const rotDeg = getRotationDeg(rotator) || 0;
      orbits.forEach((o, i)=>{
        const v = getComputedStyle(o).getPropertyValue('--angle') || '0deg';
        const angle = parseFloat(v);
        const desired = -(rotDeg + angle);
        const c = contents[i];
        if (c) c.style.setProperty('transform', `translate(-50%,-50%) rotate(${desired}deg)`, 'important');
      });
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    // stop when page hidden to save CPU
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
      else if (!rafId) rafId = requestAnimationFrame(frame);
    });
  });
})();
