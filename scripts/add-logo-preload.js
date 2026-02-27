#!/usr/bin/env node
const fs = require('fs-extra');
const glob = require('glob');
const { JSDOM } = require('jsdom');

const href = '/assets/images/edikt%20logo/edikt%20media%20logo%20png.webp';
const files = glob.sync('*.html');
if (!files.length) {
  console.log('No HTML files found');
  process.exit(0);
}

files.forEach(file => {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const dom = new JSDOM(raw);
    const doc = dom.window.document;
    const head = doc.querySelector('head');
    if (!head) return;

    const existing = Array.from(head.querySelectorAll('link[rel="preload"][as="image"]')).some(l => l.getAttribute('href') === href || l.getAttribute('href') === ('/' + href));
    if (existing) return;

    // create preload link
    const link = doc.createElement('link');
    link.setAttribute('rel', 'preload');
    link.setAttribute('as', 'image');
    link.setAttribute('href', href);
    link.setAttribute('type', 'image/webp');

    const firstStylesheet = head.querySelector('link[rel="stylesheet"]');
    if (firstStylesheet) head.insertBefore(link, firstStylesheet);
    else head.appendChild(link);

    const out = dom.serialize();
    if (out !== raw) {
      fs.writeFileSync(file, out, 'utf8');
      console.log('Inserted preload in', file);
    }
  } catch (e) {
    console.error('Failed', file, e.message);
  }
});

console.log('Done.');
