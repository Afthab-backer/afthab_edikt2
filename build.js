const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const postcss = require('postcss');
const cssnano = require('cssnano');
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

async function updateHTML() {
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

    // Keep image paths portable when source HTML was edited on Windows.
    const imgs = Array.from(doc.querySelectorAll('img'));
    for (const img of imgs) {
      const srcAttr = img.getAttribute('src') || '';
      const norm = srcAttr.replace(/\\/g, '/');
      if (norm !== srcAttr) img.setAttribute('src', norm);
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
  // Copy static assets as-is since images are pre-optimized upstream.
  const copyList = ['assets/images', 'assets/fonts', 'assets/js/vendor', 'assets/videos', 'videos'];
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
    console.log('Updating HTML...');
    await updateHTML();
    console.log('Copying extra assets...');
    await copyAssets();
    console.log('Build complete. Output in ./dist');
  } catch (err) {
    console.error('Build failed', err);
    process.exitCode = 1;
  }
}

run();
