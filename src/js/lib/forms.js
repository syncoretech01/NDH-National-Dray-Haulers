import { qs, qsa, scrollTo, toast } from './core.js';

const MAX_FILE = 10 * 1024 * 1024;
const fmtSize = (b) => (b > 1024 * 1024 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.',
  phone: (v) => v.replace(/\D/g, '').length >= 10 || 'Enter a valid 10-digit phone number.',
  zip: (v) => /^\d{5}(-\d{4})?$/.test(v) || 'Enter a valid ZIP code.',
  ein: (v) => /^\d{2}-?\d{7}$/.test(v) || 'Enter a valid EIN (XX-XXXXXXX).',
  year: (v) => /^(19|20)\d{2}$/.test(v) || 'Enter a 4-digit year.',
  number: (v) => !isNaN(parseFloat(v)) || 'Enter a number.',
  container: (v) => /^[A-Za-z]{4}\d{7}$/.test(v.replace(/\s/g, '')) || 'Container numbers are 4 letters + 7 digits (e.g. MSCU1234567).',
  date: (v) => !isNaN(Date.parse(v)) || 'Enter a valid date.'
};

function fieldWrap(input) { return input.closest('.field') || input.closest('.check') || input.parentElement; }

export function validateField(input) {
  const wrap = fieldWrap(input);
  const err = wrap?.querySelector('.error');
  let msg = '';
  const v = (input.value || '').trim();
  if (input.disabled || input.closest('[hidden]')) { wrap?.classList.remove('is-invalid'); return true; }
  if (input.type === 'checkbox') {
    if (input.required && !input.checked) msg = 'This is required.';
  } else if (input.type === 'radio') {
    const group = qsa(`input[name="${input.name}"]`, input.form);
    if (input.required && !group.some((r) => r.checked)) msg = 'Select an option.';
  } else if (input.type === 'file') {
    if (input.required && !input.files.length) msg = 'Please attach a file.';
  } else {
    if (input.required && !v) msg = 'This field is required.';
    else if (v && input.dataset.validate && validators[input.dataset.validate]) {
      const r = validators[input.dataset.validate](v); if (r !== true) msg = r;
    } else if (v && input.minLength > 0 && v.length < input.minLength) msg = `Minimum ${input.minLength} characters.`;
  }
  if (wrap) {
    wrap.classList.toggle('is-invalid', !!msg);
    wrap.classList.toggle('is-valid', !msg && !!v);
    if (err) err.textContent = msg || err.dataset.default || '';
  }
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}

export function validateScope(scope) {
  const inputs = qsa('input, select, textarea', scope).filter((i) => i.type !== 'hidden' && !i.disabled && !i.closest('[hidden]'));
  let first = null;
  inputs.forEach((i) => { if (!validateField(i) && !first) first = i; });
  if (first) { first.focus({ preventScroll: true }); scrollTo(fieldWrap(first) || first, { offset: -140 }); }
  return !first;
}

function initUploads(form) {
  qsa('.upload', form).forEach((up) => {
    const input = qs('input[type="file"]', up);
    const list = qs('.upload__list', up.parentElement) || up.parentElement.appendChild(Object.assign(document.createElement('div'), { className: 'upload__list' }));
    const accept = (input.accept || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    let files = [];
    const sync = () => {
      const dt = new DataTransfer(); files.forEach((f) => dt.items.add(f)); input.files = dt.files;
      list.innerHTML = files.map((f, i) => `<div class="upload__file"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span class="name">${f.name}</span><span class="size">${fmtSize(f.size)}</span><button type="button" aria-label="Remove ${f.name}" data-i="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join('');
      validateField(input);
    };
    const add = (incoming) => {
      Array.from(incoming).forEach((f) => {
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        if (accept.length && !accept.includes(ext) && !accept.includes(f.type)) { toast(`${f.name}: file type not accepted.`, 'error'); return; }
        if (f.size > MAX_FILE) { toast(`${f.name} is larger than 10 MB.`, 'error'); return; }
        if (!input.multiple) files = [];
        if (files.length >= 5) { toast('Maximum 5 files per field.', 'error'); return; }
        files.push(f);
      });
      sync();
    };
    input.addEventListener('change', () => { add(input.files); });
    ['dragenter', 'dragover'].forEach((ev) => up.addEventListener(ev, (e) => { e.preventDefault(); up.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => up.addEventListener(ev, (e) => { e.preventDefault(); up.classList.remove('is-drag'); }));
    up.addEventListener('drop', (e) => add(e.dataTransfer.files));
    list.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { files.splice(+b.dataset.i, 1); sync(); } });
  });
}

function initRepeaters(form) {
  qsa('[data-repeater]', form).forEach((rep) => {
    const tpl = qs('template', rep);
    const list = qs('.repeater', rep);
    const add = qs('.repeater__add', rep);
    const max = parseInt(rep.dataset.max || 5, 10);
    const min = parseInt(rep.dataset.min || 1, 10);
    const label = rep.dataset.label || 'Item';
    let count = 0;
    const renumber = () => qsa('.repeater__item', list).forEach((it, i) => {
      qs('h4 span', it).textContent = `${label} ${i + 1}`;
      qsa('[name]', it).forEach((inp) => { inp.name = inp.name.replace(/\[\d+\]/, `[${i}]`); });
      const rm = qs('h4 button', it); if (rm) rm.style.display = qsa('.repeater__item', list).length > min ? '' : 'none';
    });
    const addItem = () => {
      if (qsa('.repeater__item', list).length >= max) return;
      const node = tpl.content.cloneNode(true);
      list.appendChild(node);
      count++;
      renumber();
      bindLive(list);
      if (add) add.style.display = qsa('.repeater__item', list).length >= max ? 'none' : '';
    };
    list.addEventListener('click', (e) => { if (e.target.closest('[data-remove]')) { e.target.closest('.repeater__item').remove(); renumber(); if (add) add.style.display = ''; } });
    add?.addEventListener('click', addItem);
    for (let i = 0; i < min; i++) addItem();
  });
}

function bindLive(scope) {
  qsa('input, select, textarea', scope).forEach((i) => {
    if (i.dataset.bound) return; i.dataset.bound = '1';
    i.addEventListener('blur', () => validateField(i));
    i.addEventListener('input', () => { if (fieldWrap(i)?.classList.contains('is-invalid')) validateField(i); });
    if (i.dataset.validate === 'phone') i.addEventListener('input', () => {
      const d = i.value.replace(/\D/g, '').slice(0, 10);
      i.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
    });
    if (i.dataset.validate === 'ein') i.addEventListener('input', () => { const d = i.value.replace(/\D/g, '').slice(0, 9); i.value = d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d; });
    if (i.dataset.validate === 'container') i.addEventListener('input', () => { i.value = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11); });
  });
}

function initConditionals(form) {
  const rules = qsa('[data-show-if]', form);
  const apply = () => rules.forEach((el) => {
    const [name, val] = el.dataset.showIf.split('=');
    const inputs = qsa(`[name="${name}"]`, form);
    let cur = '';
    inputs.forEach((i) => { if ((i.type === 'radio' || i.type === 'checkbox') ? i.checked : true) cur = i.type === 'checkbox' ? (i.checked ? 'on' : '') : i.value; });
    const show = val.split('|').includes(cur);
    el.hidden = !show;
    qsa('input, select, textarea', el).forEach((i) => { i.disabled = !show; });
  });
  form.addEventListener('change', apply); apply();
}

function initSteps(form) {
  const panels = qsa('[data-step]', form);
  if (!panels.length) return;
  const stepper = qsa('.stepper__item', form);
  const side = qsa('.form-steps li', form.closest('.form-shell') || document);
  let cur = 0;
  const show = (i) => {
    cur = i;
    panels.forEach((p, j) => p.classList.toggle('is-active', j === i));
    stepper.forEach((s, j) => { s.classList.toggle('is-active', j === i); s.classList.toggle('is-done', j < i); });
    side.forEach((s, j) => { s.classList.toggle('is-active', j === i); s.classList.toggle('is-done', j < i); });
    if (panels[i].dataset.step === 'review') buildReview(form, qs('.review-list', panels[i]));
    scrollTo(form, { offset: -110 });
  };
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) { e.preventDefault(); if (validateScope(panels[cur])) show(Math.min(cur + 1, panels.length - 1)); }
    if (e.target.closest('[data-prev]')) { e.preventDefault(); show(Math.max(cur - 1, 0)); }
    const jump = e.target.closest('[data-goto]'); if (jump) { e.preventDefault(); show(+jump.dataset.goto); }
  });
  form._validateCurrent = () => validateScope(panels[cur]);
  panels.forEach((p, j) => p.classList.toggle('is-active', j === 0));
}

function buildReview(form, list) {
  if (!list) return;
  const rows = [];
  qsa('[data-review]', form).forEach((i) => {
    if (i.disabled || i.closest('[hidden]')) return;
    let v = '';
    if (i.type === 'radio') { if (!i.checked) return; v = i.closest('label')?.querySelector('strong')?.textContent || i.value; }
    else if (i.type === 'checkbox') { if (!i.checked) return; v = i.closest('label')?.textContent.trim() || 'Yes'; }
    else if (i.tagName === 'SELECT') v = i.options[i.selectedIndex]?.text || '';
    else v = i.value;
    if (!v) return;
    rows.push(`<div><span>${i.dataset.review}</span><span>${String(v).replace(/</g, '&lt;')}</span></div>`);
  });
  list.innerHTML = rows.join('') || '<div><span>Nothing entered</span><span>Go back and fill in the form.</span></div>';
}

function initSignature(form) {
  qsa('[data-signature]', form).forEach((input) => {
    const sig = qs(input.dataset.signature);
    input.addEventListener('input', () => { if (sig) sig.textContent = input.value; });
  });
}

export function initForms() {
  qsa('form[data-form]').forEach((form) => {
    form.setAttribute('novalidate', '');
    bindLive(form); initUploads(form); initRepeaters(form); initConditionals(form); initSteps(form); initSignature(form);
    const btn = qs('button[type="submit"]', form);
    const msg = qs('.form-msg', form);
    const success = qs('.form-success', form);
    const started = Date.now();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg?.classList.remove('is-error');
      const ok = form._validateCurrent ? form._validateCurrent() && validateScope(form) : validateScope(form);
      if (!ok) { if (msg) { msg.textContent = 'Please review the highlighted fields.'; msg.classList.add('is-error'); } return; }
      const fd = new FormData(form);
      fd.append('_page', location.pathname);
      fd.append('_elapsed', String(Date.now() - started));
      btn?.classList.add('is-loading'); btn?.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(`/api/${form.dataset.form}`, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || 'We could not send your request. Please call (703) 200-1393.');
        form.classList.add('is-submitted');
        if (success) { success.classList.add('is-visible'); const ref = qs('[data-ref]', success); if (ref) ref.textContent = data.ref; }
        scrollTo(form, { offset: -120 });
        toast('Received. Our team will follow up shortly.', 'success');
        form.dispatchEvent(new CustomEvent('ndh:submitted', { detail: data }));
      } catch (err) {
        if (msg) { msg.textContent = err.message; msg.classList.add('is-error'); }
        toast(err.message, 'error');
      } finally {
        btn?.classList.remove('is-loading'); btn?.removeAttribute('aria-busy');
      }
    });
  });
}
