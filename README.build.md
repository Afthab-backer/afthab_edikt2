Production build

Run the production build to generate an optimized `dist/` directory with:
- concatenated + minified CSS (`dist/assets/css/styles.min.css`)
- concatenated + minified JS (`dist/assets/js/scripts.min.js`)
- static images/videos copied as-is from `assets/`
- HTML files rewritten to use the bundled CSS/JS assets

Quick start:

```bash
npm install
npm run build
```

Notes:
- Image optimization is intentionally not part of this build. Keep source assets pre-optimized.
- The script uses simple PurgeCSS heuristics — review resulting CSS to ensure nothing important was removed.
- After verification, deploy the `dist/` folder to your hosting.
