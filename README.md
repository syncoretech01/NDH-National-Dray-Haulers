# National Dray Haulers — Website

Production-quality multi-page marketing site for National Dray Haulers, a Virginia-based
intermodal / container drayage carrier serving the Port of Virginia.

## Stack
- **Vite 6** multi-page build (static HTML per route, shared partials via a small Vite plugin in `vite.config.js`)
- **GSAP + ScrollTrigger**, **Lenis** smooth scroll, **Three.js** hero (3D drayage rig)
- **Express** server: serves `dist/` and handles the four forms (`/api/quote`, `/api/contact`, `/api/driver`, `/api/credit`) with **multer** uploads
- Submissions are saved as JSON in `data/submissions/`, uploaded documents in `data/uploads/<ref>/`
- Optional email notifications via **nodemailer** when `SMTP_*` env vars are set (see `.env.example`)

## Run
```bash
npm install
npm run serve      # builds to dist/ then starts http://localhost:3000
```
Development with HMR (API proxied to the Express server on :3000):
```bash
npm start          # terminal 1 — API + static server
npm run dev        # terminal 2 — Vite dev server on :5173
```

## Pages
`/` Home · `/services/` · `/service-areas/` · `/why-ndh/` · `/about/` · `/request-a-quote/` ·
`/credit-application/` · `/drivers/` · `/contact/` · `/privacy-policy/` · `/terms-of-service/` · 404

## Structure
```
index.html, <route>/index.html   page markup (uses <!--#include name attr="..." --> partials)
src/partials/                    head (SEO/meta/JSON-LD), header, footer, shell (preloader/cursor), icons
src/styles/                      tokens, base, components, layout, sections, forms, pages
src/js/main.js                   boot: smooth scroll, header, cursor, transitions, reveals, forms, page modules
src/js/lib/                      core (gsap/lenis), shell, reveal system, map, 3D hero, testimonial slider, forms
src/js/pages/                    home, service-areas, contact modules (code-split)
public/                          images (WebP, 800/1600), logo variants, favicon, OG image, robots, sitemap
server.js                        Express API + static host
```

## Content notes
Company statistics, pay ranges, insurance limits, credentials and email addresses in the copy are
realistic placeholders for launch review — verify them against NDH's actual figures before go-live.
Photography is licensed from Pexels/Unsplash (see `public/images/CREDITS.txt`).

## Vercel deployment
`vercel.json` builds the static site to `dist/` and deploys `api/[form].js` as a serverless function
for the four forms (multipart parsed with busboy). Serverless functions have no persistent disk, so
submissions are delivered by email — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM` and `NOTIFY_EMAIL` in the Vercel project environment. Until then every submission is
written to the function logs (Vercel → Project → Logs) with its reference number.
