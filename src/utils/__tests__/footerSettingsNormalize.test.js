const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  FOOTER_BASE_COLUMNS,
  normalizePayments,
  normalizeContact,
  normalizeCustomHtml,
  normalizeLayout,
} = require('../footerSettingsNormalize');

describe('normalizePayments', () => {
  test('missing data gives a complete, switched-off block', () => {
    assert.deepEqual(normalizePayments(undefined), {
      isEnabled: false,
      heading: '',
      description: '',
      logos: [],
    });
  });

  test('keeps logos in the order sent, drops empty rows, names image-only rows', () => {
    const result = normalizePayments({
      isEnabled: true,
      heading: '  We accept  ',
      description: 'Secure checkout',
      logos: [
        { name: 'Visa', image: '/footer/payments/visa.png', order: 7 },
        { name: '', image: '' },
        { name: ' ', image: 'https://cdn.example.com/klarna.svg', isActive: false },
      ],
    });

    assert.equal(result.isEnabled, true);
    assert.equal(result.heading, 'We accept');
    assert.deepEqual(result.logos, [
      { name: 'Visa', image: '/footer/payments/visa.png', isActive: true, order: 0 },
      { name: 'Payment method', image: 'https://cdn.example.com/klarna.svg', isActive: false, order: 1 },
    ]);
  });

  test('a logo with only a name is kept (the storefront has built-in icons)', () => {
    const result = normalizePayments({ logos: [{ name: 'PayPal' }] });
    assert.deepEqual(result.logos, [{ name: 'PayPal', image: '', isActive: true, order: 0 }]);
  });
});

describe('normalizeContact', () => {
  test('drops rows without a value and falls back to phone for unknown types', () => {
    const result = normalizeContact({
      isEnabled: true,
      title: 'Contact us',
      items: [
        { type: 'whatsapp', value: '+44 7700 900123', label: 'WhatsApp' },
        { type: 'fax', value: '0161 000 0000' },
        { type: 'email', value: '   ' },
      ],
    });

    assert.deepEqual(result.items, [
      { type: 'whatsapp', label: 'WhatsApp', value: '+44 7700 900123', isActive: true, order: 0 },
      { type: 'phone', label: '', value: '0161 000 0000', isActive: true, order: 1 },
    ]);
  });
});

describe('normalizeCustomHtml', () => {
  test('defaults to switched off, shown below the columns', () => {
    assert.deepEqual(normalizeCustomHtml(null), {
      isEnabled: false,
      position: 'below_columns',
      html: '',
      css: '',
    });
  });

  test('keeps the markup untouched and rejects an unknown position', () => {
    const html = '<div class="x">\n  Hi\n</div>';
    const result = normalizeCustomHtml({ isEnabled: true, position: 'sideways', html, css: '.x{color:red}' });
    assert.equal(result.position, 'below_columns');
    assert.equal(result.html, html);
    assert.equal(result.css, '.x{color:red}');
  });
});

describe('normalizeLayout', () => {
  test('missing data gives the default column order with nothing hidden', () => {
    const result = normalizeLayout(undefined);
    assert.deepEqual(result.columnOrder, FOOTER_BASE_COLUMNS);
    assert.deepEqual(result.hiddenColumns, []);
    assert.deepEqual(result.colors, { background: '', text: '', heading: '', linkHover: '', border: '' });
  });

  test('a partial or dirty order is completed and de-duplicated', () => {
    const result = normalizeLayout({
      columnOrder: ['sectionContact', 'section2', 'section2', 'nope'],
      hiddenColumns: ['section3', 'nope'],
    });
    assert.deepEqual(result.columnOrder, [
      'sectionContact',
      'section2',
      'section1',
      'section3',
      'sectionNewsletter',
    ]);
    assert.deepEqual(result.hiddenColumns, ['section3']);
  });

  test('only hex colours are kept', () => {
    const result = normalizeLayout({
      colors: {
        background: '#FFF',
        text: '#1a2B3c',
        heading: 'red',
        linkHover: '#fff;} body{display:none',
        border: 'url(javascript:alert(1))',
      },
    });
    assert.deepEqual(result.colors, {
      background: '#fff',
      text: '#1a2b3c',
      heading: '',
      linkHover: '',
      border: '',
    });
  });
});
