import { defineConfig } from 'vite';
import { resolve, dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGES = [
  'index', 'services', 'service-areas', 'why-ndh', 'about', 'request-a-quote',
  'credit-application', 'drivers', 'contact', 'privacy-policy', 'terms-of-service', '404'
];

/**
 * Tiny partials plugin:
 *   <!--#include head title="..." description="..." path="/services/" -->
 * Replaces the comment with src/partials/<name>.html, substituting {{key}} tokens.
 */
function partials() {
  const dir = resolve(__dirname, 'src/partials');
  const re = /<!--#include\s+([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
  const attrRe = /([\w-]+)="([^"]*)"/g;
  const render = (html, depth = 0) => {
    if (depth > 5) return html;
    return html.replace(re, (_, name, attrs) => {
      const file = join(dir, `${name}.html`);
      if (!existsSync(file)) return `<!-- missing partial: ${name} -->`;
      const vars = {};
      for (const m of attrs.matchAll(attrRe)) vars[m[1]] = m[2];
      let out = readFileSync(file, 'utf8');
      out = out.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (__, k, d) => (k in vars ? vars[k] : d ?? ''));
      return render(out, depth + 1);
    });
  };
  return {
    name: 'ndh-partials',
    enforce: 'pre',
    transformIndexHtml: { order: 'pre', handler: (html) => render(html) },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/partials/')) server.ws.send({ type: 'full-reload' });
    }
  };
}

export default defineConfig({
  plugins: [partials()],
  appType: 'mpa',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: Object.fromEntries(
        PAGES.map((p) => [p, resolve(__dirname, p === 'index' ? 'index.html' : `${p}/index.html`)])
      ),
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap', 'gsap/ScrollTrigger']
        }
      }
    }
  }
});
