// Vercel serves a root-level 404.html for unmatched routes; mirror the built 404 page there.
import { copyFileSync, existsSync } from 'node:fs';
if (existsSync('dist/404/index.html')) copyFileSync('dist/404/index.html', 'dist/404.html');
