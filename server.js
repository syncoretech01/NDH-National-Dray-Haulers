/**
 * National Dray Haulers - production server
 * Serves the built site from /dist and handles form submissions (+ document uploads).
 * Submissions are persisted to /data/submissions as JSON and, when SMTP_* env vars are set,
 * emailed to NOTIFY_EMAIL via nodemailer.
 */
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');
const DATA = path.join(__dirname, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const SUBMISSIONS = path.join(DATA, 'submissions');
for (const d of [UPLOADS, SUBMISSIONS]) fs.mkdirSync(d, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

/* ---------- Uploads ---------- */
const ALLOWED = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx']);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    req._ref ||= makeRef(req.params.form);
    const dir = path.join(UPLOADS, req._ref);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60);
    cb(null, `${file.fieldname}__${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new Error(`File type ${ext || 'unknown'} is not allowed. Upload PDF, JPG, PNG, DOC or XLS files.`));
    cb(null, true);
  }
});

/* ---------- Helpers ---------- */
const FORMS = {
  quote: { label: 'Quote Request', required: ['company', 'contact_name', 'email', 'phone', 'move_type'] },
  contact: { label: 'Contact Message', required: ['name', 'email', 'message'] },
  driver: { label: 'Driver Application', required: ['first_name', 'last_name', 'email', 'phone', 'cdl_class'] },
  credit: { label: 'Credit Application', required: ['legal_name', 'ein', 'ap_email', 'ap_phone', 'sig_name', 'sig_agree'] }
};
const PREFIX = { quote: 'QT', contact: 'CT', driver: 'DR', credit: 'CR' };
function makeRef(form) {
  return `NDH-${PREFIX[form] || 'XX'}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ''));
const rate = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (rate.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now); rate.set(ip, hits);
  return hits.length > 12;
}

async function notify(form, ref, body, files) {
  if (!process.env.SMTP_HOST) return;
  try {
    const nodemailer = (await import('nodemailer')).default;
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
    const rows = Object.entries(body).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `<tr><td style="padding:4px 10px;color:#666">${k}</td><td style="padding:4px 10px"><b>${String(v).replace(/</g, '&lt;')}</b></td></tr>`).join('');
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL || 'dispatch@nationaldrayhaulers.com',
      replyTo: body.email || body.ap_email || undefined,
      subject: `[NDH] ${FORMS[form].label} ${ref}`,
      html: `<h2>${FORMS[form].label} - ${ref}</h2><table>${rows}</table><p>${files.length} attachment(s) saved to server.</p>`,
      attachments: files.slice(0, 10).map((f) => ({ filename: f.originalname, path: f.path }))
    });
  } catch (e) { console.error('Email notification failed:', e.message); }
}

/* ---------- API ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ndh-web', time: new Date().toISOString() }));

app.post('/api/:form', (req, res, next) => {
  if (!FORMS[req.params.form]) return res.status(404).json({ ok: false, error: 'Unknown form.' });
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    next();
  });
}, async (req, res) => {
  const form = req.params.form;
  const body = req.body || {};
  const files = req.files || [];
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  // Honeypot + timing checks (bots)
  if (body._website) return res.json({ ok: true, ref: makeRef(form) });
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'Too many requests. Please try again in a few minutes or call (703) 200-1393.' });

  const missing = FORMS[form].required.filter((k) => !String(body[k] || '').trim());
  if (missing.length) return res.status(422).json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  const emailField = body.email || body.ap_email;
  if (emailField && !isEmail(emailField)) return res.status(422).json({ ok: false, error: 'Please provide a valid email address.' });

  const ref = req._ref || makeRef(form);
  const record = {
    ref, form, label: FORMS[form].label, receivedAt: new Date().toISOString(), ip,
    userAgent: req.headers['user-agent'], page: body._page,
    fields: Object.fromEntries(Object.entries(body).filter(([k]) => !k.startsWith('_'))),
    files: files.map((f) => ({ field: f.fieldname, name: f.originalname, size: f.size, path: path.relative(DATA, f.path) }))
  };
  fs.writeFileSync(path.join(SUBMISSIONS, `${ref}.json`), JSON.stringify(record, null, 2));
  console.log(`[${new Date().toLocaleTimeString()}] ${FORMS[form].label} received -> ${ref} (${files.length} files)`);
  notify(form, ref, body, files);
  res.json({ ok: true, ref, message: 'Received' });
});

/* ---------- Static site ---------- */
if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run "npm run build" first.');
}
app.use(express.static(DIST, { extensions: ['html'], maxAge: '1h', setHeaders: (res, p) => { if (/\/assets\//.test(p)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'Not found' });
  res.status(404).sendFile(path.join(DIST, '404', 'index.html'), (err) => { if (err) res.type('text').send('404 Not Found'); });
});

app.listen(PORT, () => {
  console.log(`\n  National Dray Haulers site running at http://localhost:${PORT}\n  Submissions -> ${SUBMISSIONS}\n`);
});
