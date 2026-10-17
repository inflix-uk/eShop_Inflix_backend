/**
 * Shape guards for the admin-editable footer blocks (payment methods, contact,
 * custom HTML/CSS, layout). Pure functions, no DB: the controller runs every
 * incoming and outgoing value through these so the storefront always receives
 * a complete, predictable object.
 */

/** Built-in footer columns, in their default left-to-right order. */
const FOOTER_BASE_COLUMNS = [
  'section1',
  'section2',
  'section3',
  'sectionNewsletter',
  'sectionContact',
];

const CONTACT_TYPES = ['phone', 'email', 'whatsapp', 'address'];

const CUSTOM_HTML_POSITIONS = ['above_columns', 'below_columns', 'replace_columns'];

const FOOTER_COLOR_KEYS = ['background', 'text', 'heading', 'linkHover', 'border'];

const str = (value) => (typeof value === 'string' ? value : '');

/** Only plain hex colours are stored; anything else falls back to the theme default. */
function normalizeHexColor(value) {
  const s = str(value).trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s) ? s.toLowerCase() : '';
}

function normalizePayments(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const logos = Array.isArray(src.logos)
    ? src.logos
        .map((logo) => ({
          name: str(logo?.name).trim(),
          image: str(logo?.image).trim(),
          isActive: logo?.isActive !== false,
        }))
        .filter((logo) => logo.name || logo.image)
        .map((logo, index) => ({
          ...logo,
          name: logo.name || 'Payment method',
          order: index,
        }))
    : [];

  return {
    isEnabled: src.isEnabled === true,
    heading: str(src.heading).trim(),
    description: str(src.description).trim(),
    logos,
  };
}

function normalizeContact(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const items = Array.isArray(src.items)
    ? src.items
        .map((item) => ({
          type: CONTACT_TYPES.includes(item?.type) ? item.type : 'phone',
          label: str(item?.label).trim(),
          value: str(item?.value).trim(),
          isActive: item?.isActive !== false,
        }))
        .filter((item) => item.value)
        .map((item, index) => ({ ...item, order: index }))
    : [];

  return {
    isEnabled: src.isEnabled === true,
    title: str(src.title).trim(),
    items,
  };
}

function normalizeCustomHtml(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    isEnabled: src.isEnabled === true,
    position: CUSTOM_HTML_POSITIONS.includes(src.position) ? src.position : 'below_columns',
    html: str(src.html),
    css: str(src.css),
  };
}

function normalizeLayout(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};

  const requested = Array.isArray(src.columnOrder) ? src.columnOrder : [];
  const columnOrder = [];
  for (const key of [...requested, ...FOOTER_BASE_COLUMNS]) {
    if (FOOTER_BASE_COLUMNS.includes(key) && !columnOrder.includes(key)) {
      columnOrder.push(key);
    }
  }

  const hiddenColumns = Array.isArray(src.hiddenColumns)
    ? FOOTER_BASE_COLUMNS.filter((key) => src.hiddenColumns.includes(key))
    : [];

  const rawColors = src.colors && typeof src.colors === 'object' ? src.colors : {};
  const colors = {};
  for (const key of FOOTER_COLOR_KEYS) {
    colors[key] = normalizeHexColor(rawColors[key]);
  }

  return { columnOrder, hiddenColumns, colors };
}

module.exports = {
  FOOTER_BASE_COLUMNS,
  CONTACT_TYPES,
  CUSTOM_HTML_POSITIONS,
  FOOTER_COLOR_KEYS,
  normalizeHexColor,
  normalizePayments,
  normalizeContact,
  normalizeCustomHtml,
  normalizeLayout,
};
