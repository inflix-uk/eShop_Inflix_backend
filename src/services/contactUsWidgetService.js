const NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function defaultWidgetPayload() {
  return {
    isActive: true,
    title: 'Contact us',
    description:
      'We would love to speak with you. Fill in the form below and we will get back to you.',
    submitButtonLabel: 'Send',
    successMessage: 'Your message has been sent. We will get back to you soon.',
    fields: [
      {
        name: 'full_name',
        label: 'Name',
        type: 'text',
        placeholder: 'Your name',
        required: true,
        minLength: 2,
        maxLength: 200,
        pattern: '',
        helpText: '',
        options: [],
        showWhenField: '',
        showWhenValue: '',
        sortOrder: 0,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'you@example.com',
        required: true,
        minLength: null,
        maxLength: 320,
        pattern: '',
        helpText: '',
        options: [],
        showWhenField: '',
        showWhenValue: '',
        sortOrder: 1,
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'How can we help?',
        required: true,
        minLength: 2,
        maxLength: 300,
        pattern: '',
        helpText: '',
        options: [],
        showWhenField: '',
        showWhenValue: '',
        sortOrder: 2,
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Your message',
        required: true,
        minLength: 10,
        maxLength: 10000,
        pattern: '',
        helpText: '',
        options: [],
        showWhenField: '',
        showWhenValue: '',
        sortOrder: 3,
      },
    ],
  };
}

function normalizeField(f, index) {
  const name = String(f.name || '').trim();
  const type = f.type;
  const options = Array.isArray(f.options)
    ? f.options
        .map((o) => ({
          label: String(o.label || '').trim(),
          value: String(o.value !== undefined && o.value !== null ? o.value : '').trim(),
        }))
        .filter((o) => o.label || o.value)
    : [];
  return {
    name,
    label: String(f.label || '').trim(),
    type,
    placeholder: String(f.placeholder || '').trim(),
    required: Boolean(f.required),
    minLength: f.minLength === '' || f.minLength === null || f.minLength === undefined ? null : Number(f.minLength),
    maxLength: f.maxLength === '' || f.maxLength === null || f.maxLength === undefined ? null : Number(f.maxLength),
    pattern: String(f.pattern || '').trim(),
    helpText: String(f.helpText || '').trim(),
    options,
    showWhenField: String(f.showWhenField || '').trim(),
    showWhenValue: String(f.showWhenValue || '').trim(),
    sortOrder: Number.isFinite(Number(f.sortOrder)) ? Number(f.sortOrder) : index,
  };
}

/**
 * Validate widget schema before save (admin).
 * @returns {{ ok: boolean, message?: string, fields?: unknown[] }}
 */
function validateWidgetSchema(body) {
  const fields = Array.isArray(body.fields) ? body.fields.map(normalizeField) : [];
  if (fields.length === 0) {
    return { ok: false, message: 'Add at least one form field.' };
  }
  const seen = new Set();
  const allNames = new Set(fields.map((x) => x.name));
  for (let i = 0; i < fields.length; i += 1) {
    const f = fields[i];
    if (!NAME_RE.test(f.name)) {
      return {
        ok: false,
        message: `Invalid field key "${f.name}". Use letters, numbers, underscore; start with a letter (max 64).`,
      };
    }
    if (seen.has(f.name)) {
      return { ok: false, message: `Duplicate field key: ${f.name}` };
    }
    seen.add(f.name);
    if (!f.label) {
      return { ok: false, message: `Each field needs a label (field: ${f.name}).` };
    }
    if (['select', 'radio'].includes(f.type) && (!f.options || f.options.length < 1)) {
      return { ok: false, message: `Field "${f.label}" needs at least one option.` };
    }
    if (f.showWhenField && !allNames.has(f.showWhenField)) {
      return { ok: false, message: `Conditional field "${f.name}" references unknown field "${f.showWhenField}".` };
    }
  }
  fields.sort((a, b) => a.sortOrder - b.sortOrder);
  return { ok: true, fields };
}

function coerceAnswerString(v) {
  if (v === true || v === 'true' || v === '1' || v === 'on' || v === 'yes') return 'true';
  if (v === false || v === 'false' || v === '0' || v === 'off' || v === 'no') return 'false';
  return String(v ?? '');
}

function isFieldVisible(field, answers) {
  if (!field.showWhenField) return true;
  const cur = coerceAnswerString(answers[field.showWhenField]);
  const want = coerceAnswerString(field.showWhenValue);
  return cur === want;
}

/**
 * @param {object[]} fields sorted
 * @param {Record<string, unknown>} answers raw from client
 * @returns {{ ok: boolean, errors?: Record<string, string>, sanitized?: Record<string, string> }}
 */
function validateSubmission(fields, answers) {
  const sanitized = {};
  const errors = {};
  const src = answers && typeof answers === 'object' ? answers : {};

  for (const field of fields) {
    const ctx = { ...src, ...sanitized };
    if (!isFieldVisible(field, ctx)) {
      continue;
    }
    let raw = src[field.name];
    if (field.type === 'checkbox') {
      raw = raw === true || raw === 'true' || raw === '1' || raw === 'on';
      sanitized[field.name] = raw ? 'yes' : 'no';
      if (field.required && !raw) {
        errors[field.name] = 'This box must be ticked.';
      }
      continue;
    }

    let str = raw === undefined || raw === null ? '' : String(raw).trim();
    if (field.type === 'textarea') {
      str = raw === undefined || raw === null ? '' : String(raw);
      str = str.trim();
    }

    if (field.required && !str) {
      errors[field.name] = 'This field is required.';
      continue;
    }
    if (!str && !field.required) {
      sanitized[field.name] = '';
      continue;
    }

    if (field.type === 'email' && !EMAIL_RE.test(str)) {
      errors[field.name] = 'Enter a valid email address.';
      continue;
    }

    if (field.minLength != null && Number(field.minLength) > 0 && str.length < Number(field.minLength)) {
      errors[field.name] = `At least ${field.minLength} characters.`;
      continue;
    }
    if (field.maxLength != null && Number(field.maxLength) > 0 && str.length > Number(field.maxLength)) {
      errors[field.name] = `At most ${field.maxLength} characters.`;
      continue;
    }

    if (field.pattern) {
      try {
        const re = new RegExp(field.pattern);
        if (!re.test(str)) {
          errors[field.name] = 'Invalid format.';
          continue;
        }
      } catch {
        /* ignore broken admin regex */
      }
    }

    if (field.type === 'select' || field.type === 'radio') {
      const allowed = new Set((field.options || []).map((o) => o.value));
      if (!allowed.has(str)) {
        errors[field.name] = 'Pick a valid option.';
        continue;
      }
    }

    sanitized[field.name] = str;
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }
  return { ok: true, sanitized };
}

function buildSubmissionEmailHtml(widget, sanitized) {
  const rows = (widget.fields || [])
    .filter((f) => isFieldVisible(f, sanitized))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((f) => {
      const v = sanitized[f.name];
      const display = f.type === 'checkbox' ? (v === 'yes' ? 'Yes' : 'No') : escapeHtml(String(v ?? ''));
      return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:180px;">${escapeHtml(f.label)}</td><td style="padding:8px;border:1px solid #ddd;">${display}</td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;">
  <h2>${escapeHtml(widget.title || 'Contact form')}</h2>
  <p>New submission from the website contact widget.</p>
  <table style="border-collapse:collapse;width:100%;max-width:640px;">${rows}</table>
</body></html>`;
}

function replyToFromAnswers(fields, sanitized) {
  const emailField = fields.find((f) => f.type === 'email');
  const email = emailField ? String(sanitized[emailField.name] || '').trim() : '';
  const nameField = fields.find((f) => f.name === 'full_name' || /name/i.test(f.name)) || fields.find((f) => f.type === 'text');
  const rawName = nameField ? String(sanitized[nameField.name] || '').trim() : '';
  const safeName = rawName.replace(/[\r\n<>"]/g, ' ').slice(0, 120) || 'Website visitor';
  if (email && EMAIL_RE.test(email)) {
    return `"${safeName}" <${email}>`;
  }
  return undefined;
}

module.exports = {
  defaultWidgetPayload,
  validateWidgetSchema,
  validateSubmission,
  buildSubmissionEmailHtml,
  replyToFromAnswers,
  escapeHtml,
  NAME_RE,
};
