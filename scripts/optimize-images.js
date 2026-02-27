#!/usr/bin/env node
const sharp = require('sharp');
const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');

// Simple CLI params (no extra deps)
const argv = require('process').argv.slice(2);
const srcDir = argv[0] || 'assets/images';
const outBase = argv[1] || 'assets/images/optimized';
const sizes = (argv[2] && argv[2].split(',').map(s => parseInt(s,10))) || [400,800,1600];
const formats = (argv[3] && argv[3].split(',')) || ['avif','webp'];

async function processFile(file) {
  const rel = path.relative(srcDir, file);
  const dir = path.dirname(rel);
  const name = path.parse(rel).name;
  const outDir = path.join(outBase, dir);
  await fs.ensureDir(outDir);

  const tasks = [];
  for (const w of sizes) {
    for (const fmt of formats) {
      const outFile = path.join(outDir, `${name}-w${w}.${fmt}`);
      tasks.push(
        sharp(file)
          .resize({ width: w })
          .toFormat(fmt, { quality: 80 })
          .toFile(outFile)
          .then(() => ({ file: outFile, ok: true }))
          .catch(err => ({ file: outFile, ok: false, err }))
      );
    }
  }
  return Promise.all(tasks);
}

async function run() {
  console.log('Scanning for images in', srcDir);
  const patterns = [`${srcDir}/**/*.{jpg,jpeg,png,webp,avif}`];
  const files = patterns.flatMap(p => glob.sync(p, { nodir: true }));
  if (!files.length) return console.log('No images found.');
  console.log(`Found ${files.length} images — generating ${sizes.length} sizes × ${formats.length} formats.`);

  let completed = 0;
  for (const f of files) {
    // skip already-optimized folder
    if (f.includes(`${path.sep}optimized${path.sep}`) || f.includes('/optimized/')) continue;
    try {
      const res = await processFile(f);
      completed += 1;
      process.stdout.write(`.${completed}`);
    } catch (e) {
      console.error('Error processing', f, e);
    }
  }
  console.log('\nDone. Optimized images are in', outBase);
}

run().catch(err => { console.error(err); process.exit(1); });
