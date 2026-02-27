const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');
const postcss = require('postcss');
const cssnano = require('cssnano');
const purgecss = require('@fullhuman/postcss-purgecss');
const terser = require('terser');
const { minify } = require('html-minifier-terser');
const { JSDOM } = require('jsdom');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

async function clean() {
  await fs.remove(DIST);
  await fs.ensureDir(DIST);
}

async function buildCSS() {
  const cssFiles = glob.sync('assets/css/**/*.css', { cwd: ROOT }).map(p => path.join(ROOT, p));
  if (!cssFiles.length) return;
  let css = '';
  for (const f of cssFiles) css += '\n/* ' + path.relative(ROOT, f) + ' */\n' + await fs.readFile(f, 'utf8');

  const result = await postcss([
    purgecss({ content: ['*.html', 'components/*.html'], defaultExtractor: content => content.match(/[-_a-zA-Z0-9:\/]+/g) || [] }),
    cssnano()
  ]).process(css, { from: undefined });

  const outDir = path.join(DIST, 'assets', 'css');
  await fs.ensureDir(outDir);
  await fs.writeFile(path.join(outDir, 'styles.min.css'), result.css, 'utf8');
  console.log('CSS built ->', path.join('dist', 'assets', 'css', 'styles.min.css'));
}

async function buildJS() {
  const jsFiles = glob.sync('assets/js/**/*.js', { cwd: ROOT }).map(p => path.join(ROOT, p));
  if (!jsFiles.length) return;
  let js = '';
  for (const f of jsFiles) js += '\n// ' + path.relative(ROOT, f) + '\n' + await fs.readFile(f, 'utf8');

  const min = await terser.minify(js, { format: { comments: false } });
  const outDir = path.join(DIST, 'assets', 'js');
  await fs.ensureDir(outDir);
  await fs.writeFile(path.join(outDir, 'scripts.min.js'), min.code, 'utf8');
  console.log('JS built ->', path.join('dist', 'assets', 'js', 'scripts.min.js'));
}

async function processImages() {
  const patterns = ['assets/images/**/*.{jpg,jpeg,png,webp,avif}'];
  const files = patterns.flatMap(p => glob.sync(p, { cwd: ROOT, nodir: true }));
  const manifest = {};
  const sizes = [320, 640, 1024, 1600];
  const formats = ['avif', 'webp'];
  const MAX_FALLBACK_WIDTH = 1600; // clamp large originals to this width

  for (const rel of files) {
    const src = path.join(ROOT, rel);
    const stat = await fs.stat(src).catch(() => null);
    if (!stat) continue;
    const info = await sharp(src).metadata();
    const base = rel.replace(/\\/g, '/');
    manifest[base] = { variants: [], width: info.width || null, height: info.height || null };

    for (const w of sizes) {
      if (info.width && w > info.width) continue; // skip upscales
      for (const fmt of formats) {
        const ext = fmt;
        const outRel = base.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '') + `-${w}.${ext}`;
        const outPath = path.join(DIST, outRel);
        await fs.ensureDir(path.dirname(outPath));
        await sharp(src).resize({ width: w }).toFormat(fmt, { quality: 80 }).toFile(outPath);
        manifest[base].variants.push({ format: fmt, width: w, path: outRel.replace(/\\/g, '/') });
      }
    }

    // generate a fallback optimized variant (clamped to MAX_FALLBACK_WIDTH)
    const fallbackWidth = info.width && info.width > MAX_FALLBACK_WIDTH ? MAX_FALLBACK_WIDTH : info.width;
    for (const fmt of formats) {
      const outRel = base.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '') + `-orig.${fmt}`;
      const outPath = path.join(DIST, outRel);
      await fs.ensureDir(path.dirname(outPath));
      if (fallbackWidth && info.width && fallbackWidth !== info.width) {
        // resize down to clamped width
        await sharp(src).resize({ width: fallbackWidth }).toFormat(fmt, { quality: 80 }).toFile(outPath);
      } else {
        await sharp(src).toFormat(fmt, { quality: 80 }).toFile(outPath);
      }
      // compute fallback height proportionally if available
      let fallbackHeight = info.height || null;
      if (info.width && fallbackWidth && info.height) {
        fallbackHeight = Math.round((fallbackWidth / info.width) * info.height);
      }
      manifest[base].variants.push({ format: fmt, width: fallbackWidth || null, path: outRel.replace(/\\/g, '/') });
    }

    // update manifest primary dimensions to the fallback (avoid exposing huge original sizes)
    if (fallbackWidth) manifest[base].width = fallbackWidth;
    if (info.height && manifest[base].width && info.width) manifest[base].height = Math.round((manifest[base].width / info.width) * info.height);
  }

  // Per project preference: do not write images-manifest.json to disk.
  // The manifest is still returned in-memory so HTML rewriting can continue,
  // but we avoid persisting the JSON file.
  // await fs.writeJson(path.join(DIST, 'images-manifest.json'), manifest, { spaces: 2 });
  console.log('Images processed ->', Object.keys(manifest).length, 'files (manifest not written to disk)');
  return manifest;
}

async function updateHTML(manifest) {
  const htmlFiles = glob.sync('*.html', { cwd: ROOT });
  for (const hf of htmlFiles) {
    const src = path.join(ROOT, hf);
    const html = await fs.readFile(src, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Replace simple header fetch snippets with a robust fetch that executes scripts
    // Find any inline script that fetches 'header.html' and replace its body
    Array.from(doc.querySelectorAll('script')).forEach(s => {
      const txt = (s.textContent || '').trim();
      if (txt.includes("fetch('header.html") || txt.includes('fetch("header.html')) {
        s.textContent = `(function(){
          fetch('header.html?_=' + Date.now())
            .then(res => res.text())
            .then(html => {
              const container = document.getElementById('site-header');
              if (!container) return;
              container.innerHTML = html;
              // execute scripts found inside header fragment
              Array.from(container.querySelectorAll('script')).forEach(s => {
                try {
                  const ns = document.createElement('script');
                  if (s.src) { ns.src = s.src; if (s.type) ns.type = s.type; if (s.defer) ns.defer = true; document.head.appendChild(ns); }
                  else { ns.textContent = s.textContent; document.body.appendChild(ns); }
                } catch (e) { console.error(e); }
              });
            });
        })();`;
      }
    });

    const imgs = Array.from(doc.querySelectorAll('img'));
    for (const img of imgs) {
      let srcAttr = img.getAttribute('src') || '';
      // normalize backslashes to forward slashes so Windows paths are handled
      const norm = srcAttr.replace(/\\/g, '/');
      if (!norm.startsWith('assets/images/')) continue;
      // update the img src to normalized form
      img.setAttribute('src', norm);
      const info = manifest[norm];
      if (!info) continue;

      // build srcset strings per format
      const byFormat = {};
      info.variants.forEach(v => {
        byFormat[v.format] = byFormat[v.format] || [];
        byFormat[v.format].push(`${v.path} ${v.width}w`);
      });

      const picture = doc.createElement('picture');
      if (byFormat['avif']) {
        const s = doc.createElement('source');
        s.setAttribute('type', 'image/avif');
        s.setAttribute('srcset', byFormat['avif'].join(', '));
        picture.appendChild(s);
      }
      if (byFormat['webp']) {
        const s = doc.createElement('source');
        s.setAttribute('type', 'image/webp');
        s.setAttribute('srcset', byFormat['webp'].join(', '));
        picture.appendChild(s);
      }

      // update original img to be the fallback (use largest orig variant)
      const fallback = img.cloneNode(false);
      const origVariant = info.variants.find(v => v.width === info.width) || info.variants[0];
      if (origVariant) fallback.setAttribute('src', origVariant.path);
      fallback.setAttribute('loading', 'lazy');
      if (info.width) fallback.setAttribute('width', String(info.width));
      if (info.height) fallback.setAttribute('height', String(info.height));

      picture.appendChild(fallback);
      img.replaceWith(picture);
    }

    // Rewrite CSS/JS references to bundled files
      // Preserve external font or critical stylesheet links (e.g. Google Fonts).
      // Remove local stylesheet links but keep preconnect/preload and external stylesheets.
      const head = doc.querySelector('head') || doc.documentElement;
      Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).forEach(h => {
        const href = h.getAttribute('href') || '';
        // Keep external stylesheets (fonts, cdn) and data URIs; remove local css files.
        if (/^(https?:)?\/\//.test(href) || href.indexOf('fonts.googleapis.com') !== -1 || href.startsWith('data:')) {
          return; // keep
        }
        h.parentNode.removeChild(h);
      });
      // ensure bundled stylesheet is present
      if (!doc.querySelector('link[href="assets/css/styles.min.css"]')) {
        const newLink = doc.createElement('link');
        newLink.setAttribute('rel', 'stylesheet');
        newLink.setAttribute('href', 'assets/css/styles.min.css');
        head.appendChild(newLink);
      }

    const scripts = doc.querySelectorAll('script[src]');
    scripts.forEach(s => s.parentNode.removeChild(s));
    const body = doc.querySelector('body') || doc.documentElement;
    const newScript = doc.createElement('script');
    newScript.setAttribute('src', 'assets/js/scripts.min.js');
    newScript.setAttribute('defer', '');
    body.appendChild(newScript);

    const min = await minify(dom.serialize(), { collapseWhitespace: true, removeComments: true, minifyCSS: true });
    const outPath = path.join(DIST, hf);
    await fs.writeFile(outPath, min, 'utf8');
    console.log('HTML ->', path.join('dist', hf));
  }
}

async function copyAssets() {
  // copy other static files (fonts, extras)
  const copyList = ['assets/fonts', 'assets/js/vendor'];
  for (const p of copyList) {
    if (await fs.pathExists(p)) {
      await fs.copy(p, path.join(DIST, p));
    }
  }
}

async function run() {
  try {
    console.log('Cleaning dist...');
    await clean();
    console.log('Building CSS...');
    await buildCSS();
    console.log('Building JS...');
    await buildJS();
    console.log('Processing images (this may take a while)...');
    const manifest = await processImages();
    console.log('Updating HTML...');
    await updateHTML(manifest);
    console.log('Copying extra assets...');
    await copyAssets();
    console.log('Build complete. Output in ./dist');
  } catch (err) {
    console.error('Build failed', err);
    process.exitCode = 1;
  }
}

run();
