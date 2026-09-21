/**
 * Vercel serverless handler for the four site forms:
 *   POST /api/quote | /api/contact | /api/driver | /api/credit
 * Parses multipart submissions (fields + document uploads), validates, and delivers them by email
 * when SMTP_* env vars are configured. Every submission is also written to the function log so
 * nothing is lost while email is being set up.
 */
import Busboy from 'busboy';
import crypto from 'node:crypto';

export const config = { api: { bodyParser: false } };

const FORMS = {
  quote: { label: 'Quote Request', required: ['company', 'contact_name', 'email', 'phone', 'move_type'] },
  contact: { label: 'Contact Message', required: ['name', 'email', 'message'] },
  driver: { label: 'Driver Application', required: ['first_name', 'last_name', 'email', 'phone', 'cdl_class'] },
  credit: { label: 'Credit Application', required: ['legal_name', 'ein', 'ap_email', 'ap_phone', 'sig_name', 'sig_agree'] }
};
const PREFIX = { quote: 'QT', contact: 'CT', driver: 'DR', credit: 'CR' };
const ALLOWED = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx']);
const MAX_FILE = 10 * 1024 * 1024;
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ''));
const makeRef = (form) => `NDH-${PREFIX[form] || 'XX'}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

function parse(req) {
  return new Promise((resolve, reject) => {
    const fields = {}, files = [];
    let bb;
    try { bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 20 } }); } catch (e) { return reject(new Error('Invalid form encoding.')); }
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      const ext = (info.filename || '').toLowerCase().replace(/^.*(\.[a-z0-9]+)$/, '$1');
      if (!info.filename) { stream.resume(); return; }
      if (!ALLOWED.has(ext)) { stream.resume(); return reject(new Error(`File type ${ext || 'unknown'} is not allowed. Upload PDF, JPG, PNG, DOC or XLS files.`)); }
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('limit', () => reject(new Error(`${info.filename} is larger than 10 MB.`)));
      stream.on('end', () => files.push({ field: name, filename: info.filename, contentType: info.mimeType, content: Buffer.concat(chunks) }));
    });
    bb.on('error', reject);
    bb.on('finish', () => resolve({ fields, files }));
    req.pipe(bb);
  });
}

async function notify(form, ref, fields, files) {
  if (!process.env.SMTP_HOST) return false;
  const nodemailer = (await import('nodemailer')).default;
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const rows = Object.entries(fields).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `<tr><td style="padding:4px 10px;color:#666">${esc(k)}</td><td style="padding:4px 10px"><b>${esc(v)}</b></td></tr>`).join('');
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL || 'dispatch@nationaldrayhaulers.com',
    replyTo: fields.email || fields.ap_email || undefined,
    subject: `[NDH] ${FORMS[form].label} ${ref}`,
    html: `<h2>${FORMS[form].label} &mdash; ${ref}</h2><table>${rows}</table><p>${files.length} attachment(s).</p>`,
    attachments: files.slice(0, 10).map((f) => ({ filename: f.filename, content: f.content, contentType: f.contentType }))
  });
  return true;
}

export default async function handler(req, res) {
  const form = req.query.form;
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed' }); }
  if (!FORMS[form]) return res.status(404).json({ ok: false, error: 'Unknown form.' });

  let parsed;
  try { parsed = await parse(req); } catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
  const { fields, files } = parsed;

  if (fields._website) return res.json({ ok: true, ref: makeRef(form) }); // honeypot
  const missing = FORMS[form].required.filter((k) => !String(fields[k] || '').trim());
  if (missing.length) return res.status(422).json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  const emailField = fields.email || fields.ap_email;
  if (emailField && !isEmail(emailField)) return res.status(422).json({ ok: false, error: 'Please provide a valid email address.' });

  const ref = makeRef(form);
  const record = {
    ref, form, label: FORMS[form].label, receivedAt: new Date().toISOString(),
    ip: req.headers['x-forwarded-for']?.split(',')[0], page: fields._page,
    fields: Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith('_'))),
    files: files.map((f) => ({ field: f.field, name: f.filename, size: f.content.length }))
  };
  console.log('SUBMISSION', JSON.stringify(record));
  try {
    const emailed = await notify(form, ref, fields, files);
    if (!emailed) console.warn(`SMTP not configured; ${ref} logged only.`);
  } catch (e) { console.error('Email notification failed:', e.message); }
  return res.json({ ok: true, ref, message: 'Received' });
}
