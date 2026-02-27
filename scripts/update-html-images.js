#!/usr/bin/env node
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const { JSDOM } = require('jsdom');

const argv = require('process').argv.slice(2);
const htmlGlob = argv[0] || '*.html';
const extraGlob = argv[1] || 'components/**/*.html';
const optimizedBase = argv[2] || 'assets/images/optimized';
const sizes = (argv[3] && argv[3].split(',').map(s => parseInt(s,10))) || [400,800,1600];
const formats = (argv[4] && argv[4].split(',')) || ['avif','webp'];

function normalizeSrc(src) {
  return src.replace(/^\//, '');
}

function optimizedPathFor(original, fmt) {
  // original like assets/images/.../name.ext
  const rel = normalizeSrc(original).replace(/^assets[\\/]/, '');
  const parsed = path.parse(rel);
  // rel without leading images/ (we want path under optimizedBase)
  const sub = path.join(parsed.dir, '');
  const baseDir = path.join(optimizedBase, parsed.dir);
  const variants = sizes.map(w => path.posix.join('/', baseDir.replace(/\\/g,'/'), `${parsed.name}-w${w}.${fmt}`));
  return variants.join(', ');
}

function existsOptimized(original, fmt) {
  const rel = normalizeSrc(original).replace(/^assets[\\/]/, '');
  const parsed = path.parse(rel);
  const baseDir = path.join(optimizedBase, parsed.dir);
  return sizes.every(w => fs.existsSync(path.join(baseDir, `${parsed.name}-w${w}.${fmt}`)));
}

function buildPictureHTML(originalSrc, imgEl) {
  const srcNorm = normalizeSrc(originalSrc);
  let html = '<picture>';
  // AVIF first
  if (existsOptimized(srcNorm, 'avif')) {
    const srcset = sizes.map(w => `/${path.posix.join(optimizedBase, path.dirname(srcNorm).replace(/\\/g,'/'), path.parse(srcNorm).name + `-w${w}.avif`)} ${w}w`).join(', ');
    html += `<source type="image/avif" srcset="${srcset}" sizes="(max-width:800px) 100vw, 800px">`;
  }
  if (existsOptimized(srcNorm, 'webp')) {
    const srcset = sizes.map(w => `/${path.posix.join(optimizedBase, path.dirname(srcNorm).replace(/\\/g,'/'), path.parse(srcNorm).name + `-w${w}.webp`)} ${w}w`).join(', ');
    html += `<source type="image/webp" srcset="${srcset}" sizes="(max-width:800px) 100vw, 800px">`;
  }
  // Keep original as fallback
  const alt = imgEl.getAttribute('alt') ? ` alt="${imgEl.getAttribute('alt')}"` : '';
  const cls = imgEl.getAttribute('class') ? ` class="${imgEl.getAttribute('class')}"` : '';
  const loading = imgEl.getAttribute('loading') || 'loading="lazy"';
  html += `<img src="/${srcNorm}"${alt}${cls} ${loading}>`;
  html += '</picture>';
  return html;
}

function processFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  const imgs = Array.from(doc.querySelectorAll('img'));
  let changed = false;
  imgs.forEach(img => {
    const src = img.getAttribute('src');
    if (!src) return;
    if (!/assets[\\/ ]?images[\\/]/i.test(src)) return;
    const pic = buildPictureHTML(src, img);
    img.outerHTML = pic;
    changed = true;
  });
  if (changed) {
    fs.writeFileSync(file, dom.serialize(), 'utf8');
    console.log('Updated', file);
  }
}

function run() {
  const files = glob.sync(htmlGlob).concat(glob.sync(extraGlob));
  if (!files.length) return console.log('No HTML files matched.');
  files.forEach(processFile);
  console.log('Done updating HTML files.');
}

run();
