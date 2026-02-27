Production build

Run the production build to generate an optimized `dist/` directory with:
- concatenated + minified CSS (`dist/assets/css/styles.min.css`)
- concatenated + minified JS (`dist/assets/js/scripts.min.js`)
- responsive AVIF/WebP variants for images (see `dist/images-manifest.json`)
- HTML files rewritten to use `picture` elements and the bundled assets

Quick start:

```bash
npm install
npm run build
```

Notes:
- Default image quality: lossy (~80). Edit `build.js` to change quality or add sizes.
- The script uses simple PurgeCSS heuristics — review resulting CSS to ensure nothing important was removed.
- After verification, deploy the `dist/` folder to your hosting.
