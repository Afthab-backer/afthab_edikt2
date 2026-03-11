Production build

Run the production build to generate an optimized `dist/` directory with:
- minified CSS files preserved by path (for example, `dist/assets/css/style.css`)
- concatenated + minified JS (`dist/assets/js/scripts.min.js`)
- static images/videos copied as-is from `assets/`
- HTML files rewritten to use bundled JS while preserving each page's CSS links

Quick start:

```bash
npm install
npm run build
```

Notes:
- Image optimization is intentionally not part of this build. Keep source assets pre-optimized.
- The script uses simple PurgeCSS heuristics — review resulting CSS to ensure nothing important was removed.
- After verification, deploy the `dist/` folder to your hosting.
