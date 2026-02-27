// Lightweight site-wide lazy-loading enhancer.
// Adds `loading="lazy"` to non-critical images and iframes,
// and sets `decoding="async"` where appropriate.
(function(){
  function isCritical(img){
    if (!img) return false;
    // keep logos, hero/hero-like, orbit center, and explicitly-marked images
    if (img.closest && (img.closest('header') || img.closest('.hero') || img.closest('.orbit-center') || img.closest('.project-hero-header') || img.closest('.project-hero-grid') || img.closest('.project-fullwidth') )) return true;
    if (img.classList && (img.classList.contains('logo') || img.classList.contains('footer-logo') || img.classList.contains('hero') || img.classList.contains('salem-overview-img') )) return true;
    if (img.getAttribute && img.getAttribute('data-priority') === 'true') return true;
    return false;
  }

  function applyLazy(){
    try{
      var imgs = Array.prototype.slice.call(document.getElementsByTagName('img'));
      imgs.forEach(function(img){
        try{
          if (img.loading) return; // respect existing attribute
          if (isCritical(img)) return;
          img.loading = 'lazy';
          if (!img.decoding) img.decoding = 'async';
        }catch(e){}
      });

      var iframes = Array.prototype.slice.call(document.getElementsByTagName('iframe'));
      iframes.forEach(function(fr){
        try{
          if (fr.loading) return;
          if (fr.getAttribute && fr.getAttribute('data-priority') === 'true') return;
          fr.loading = 'lazy';
        }catch(e){}
      });
    }catch(e){}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyLazy); else applyLazy();

  // also apply after dynamic content (header/footer fragments) settle
  // some pages append header/footer later; re-run once after short delay
  setTimeout(applyLazy, 900);
  setTimeout(applyLazy, 2500);
})();
