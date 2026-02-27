#!/usr/bin/env node
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlFiles = glob.sync('*.html').concat(glob.sync('components/**/*.html'));
if (!htmlFiles.length) {
  console.log('No HTML files found.');
  process.exit(0);
}

function normalizeSrc(src) {
  if (!src) return src;
  return src.replace(/\\\\/g, '/');
}

htmlFiles.forEach(file => {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const dom = new JSDOM(raw);
    const doc = dom.window.document;

    // Fix backslashes in all img src attributes
    const imgs = Array.from(doc.querySelectorAll('img'));
    imgs.forEach(img => {
      const src = img.getAttribute('src');
      if (!src) return;
      const clean = normalizeSrc(src);
      if (clean !== src) img.setAttribute('src', clean);
    });

    // Heuristic: find the true hero/LCP image by looking for images inside elements
    // with hero-like class names (e.g. 'hero', 'project-hero', 'full-bleed').
    const heroClassRegex = /hero|hero-header|project-hero|hero-texts|hero-title|project-hero-grid|full-bleed|overview-wrap/i;
    function findHeroImage(images) {
      for (const img of images) {
        let el = img.parentElement;
        while (el) {
          if (el.className && typeof el.className === 'string' && heroClassRegex.test(el.className)) return img;
          el = el.parentElement;
        }
      }
      return null;
    }

    const heroImg = findHeroImage(imgs);

    imgs.forEach((img, idx) => {
      // default decoding for all images
      img.setAttribute('decoding', 'async');

      // If this is the detected hero image, ensure eager + high priority
      if (heroImg && img.isSameNode(heroImg)) {
        // remove any existing loading attr then set eager (prevents duplicates)
        if (img.hasAttribute('loading')) img.removeAttribute('loading');
        img.setAttribute('loading', 'eager');
        try { img.setAttribute('fetchpriority', 'high'); } catch (e) {}
      } else {
        // Non-hero images: avoid forcing lazy on very small UI icons
        const widthAttr = img.getAttribute('width');
        const small = widthAttr ? parseInt(widthAttr, 10) < 100 : false;
        if (!small && !img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
      }
    });

    // Also fix srcset and source tags inside picture
    const sources = Array.from(doc.querySelectorAll('source'));
    sources.forEach(s => {
      if (s.srcset) s.srcset = normalizeSrc(s.srcset);
      if (s.src) s.src = normalizeSrc(s.src);
    });

    // Preload only the detected hero/LCP image (production-safe).
    if (heroImg) {
      // Prefer AVIF (or other source type) from the surrounding <picture> if available
      let heroSrc = null;
      let heroSrcset = null;
      const picture = heroImg.closest('picture');
      if (picture) {
        const avifSource = picture.querySelector('source[type="image/avif"]');
        const webpSource = picture.querySelector('source[type="image/webp"]');
        const anySource = avifSource || webpSource || picture.querySelector('source[srcset]');
        if (anySource) {
          const srcset = anySource.getAttribute('srcset');
          if (srcset) {
            // pick the first candidate URL from srcset
            const first = srcset.split(',')[0].trim().split(/\s+/)[0];
            if (first) heroSrc = first;
            heroSrcset = srcset;
          }
        }
      }
      if (!heroSrc) {
        heroSrc = heroImg.getAttribute('src');
      }

      if (heroSrc) {
        const head = doc.querySelector('head');
        if (head) {
          const href = heroSrc.startsWith('/') ? heroSrc : '/' + heroSrc;
          const existing = Array.from(head.querySelectorAll('link[rel="preload"][as="image"]')).some(l => l.getAttribute('href') === href || l.getAttribute('imagesrcset') === heroSrcset);
          if (!existing) {
            const link = doc.createElement('link');
            link.setAttribute('rel', 'preload');
            link.setAttribute('as', 'image');

            // If we have a responsive srcset for AVIF/WebP, set imagesrcset/imagesizes for responsive preload
            if (heroSrcset) {
              link.setAttribute('imagesrcset', heroSrcset);
              const sizesAttr = heroImg.getAttribute('sizes') || '100vw';
              link.setAttribute('imagesizes', sizesAttr);
            } else {
              link.setAttribute('href', href);
            }

            // also set type when heroSrc is a single file
            if (!heroSrcset) {
              const ext = href.split('.').pop().toLowerCase();
              if (ext === 'avif') link.setAttribute('type', 'image/avif');
              else if (ext === 'webp') link.setAttribute('type', 'image/webp');
              else if (ext === 'jpg' || ext === 'jpeg') link.setAttribute('type', 'image/jpeg');
              else if (ext === 'png') link.setAttribute('type', 'image/png');
            }

            const firstStylesheet = head.querySelector('link[rel="stylesheet"]');
            if (firstStylesheet) head.insertBefore(link, firstStylesheet);
            else head.appendChild(link);
          }
        }
      }
    }

    // Write back only if different
    const out = dom.serialize();
    if (out !== raw) {
      fs.writeFileSync(file, out, 'utf8');
      console.log('Patched', file);
    }
  } catch (e) {
    console.error('Failed:', file, e.message);
  }
});

console.log('All pages processed.');
