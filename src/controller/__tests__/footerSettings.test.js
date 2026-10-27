const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const FooterSettings = require('../../models/footerSettings');
const footerSettingsController = require('../footerSettingsController');

function createMockRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

const req = (overrides = {}) => ({ headers: {}, params: {}, body: {}, ...overrides });

/** Stand-in for the stored document: `findOne()` works both awaited and with `.lean()`. */
function stubStore(existing) {
  const calls = [];
  FooterSettings.findOne = () => {
    const doc = existing ? { ...existing, toObject: () => ({ ...existing }) } : null;
    const promise = Promise.resolve(doc);
    promise.lean = async () => (existing ? { ...existing } : null);
    return promise;
  };
  FooterSettings.findOneAndUpdate = async (filter, update) => {
    calls.push(update);
    const saved = { ...(existing || {}), ...update.$set };
    return { ...saved, toObject: () => ({ ...saved }) };
  };
  return calls;
}

describe('footer settings: payment methods, contact, custom HTML, layout', () => {
  const originalFindOne = FooterSettings.findOne;
  const originalFindOneAndUpdate = FooterSettings.findOneAndUpdate;

  afterEach(() => {
    FooterSettings.findOne = originalFindOne;
    FooterSettings.findOneAndUpdate = originalFindOneAndUpdate;
  });

  test('a store that never saved the new blocks still gets them, switched off', async () => {
    stubStore({ section2: { title: 'Useful links', links: [] } });
    const res = createMockRes();

    await footerSettingsController.getFooterSettingsPublic(req(), res);

    assert.equal(res.statusCode, 200);
    const { data } = res.body;
    assert.equal(data.sectionPayments.isEnabled, false);
    assert.deepEqual(data.sectionPayments.logos, []);
    assert.equal(data.sectionContact.isEnabled, false);
    assert.equal(data.customHtml.isEnabled, false);
    assert.equal(data.customHtml.position, 'below_columns');
    assert.deepEqual(data.layout.hiddenColumns, []);
    assert.equal(data.layout.columnOrder[0], 'section1');
    assert.equal(data.section2.title, 'Useful links');
  });

  test('saving the payment methods tab stores the heading, description and icons', async () => {
    const calls = stubStore(null);
    const res = createMockRes();

    await footerSettingsController.updateFooterSection(
      req({
        params: { section: 'sectionPayments' },
        body: {
          isEnabled: true,
          heading: 'We accept',
          description: 'All major cards',
          logos: [{ name: 'Visa', image: '/footer/payments/visa.png' }, { name: 'Klarna' }],
        },
      }),
      res
    );

    assert.equal(res.statusCode, 200);
    const stored = calls[0].$set.sectionPayments;
    assert.equal(stored.isEnabled, true);
    assert.equal(stored.heading, 'We accept');
    assert.equal(stored.description, 'All major cards');
    assert.deepEqual(
      stored.logos.map((l) => [l.name, l.image, l.order]),
      [['Visa', '/footer/payments/visa.png', 0], ['Klarna', '', 1]]
    );
    assert.equal(res.body.data.heading, 'We accept');
  });

  test('saving custom HTML keeps the markup and CSS exactly as typed', async () => {
    const calls = stubStore(null);
    const res = createMockRes();
    const html = '<div class="pay">\n  <a href="tel:+441610000000">Call us</a>\n</div>';

    await footerSettingsController.updateFooterSection(
      req({
        params: { section: 'customHtml' },
        body: { isEnabled: true, position: 'replace_columns', html, css: '.pay a { color: #fff; }' },
      }),
      res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls[0].$set.customHtml, {
      isEnabled: true,
      position: 'replace_columns',
      html,
      css: '.pay a { color: #fff; }',
    });
  });

  test('saving one tab does not touch the others', async () => {
    const calls = stubStore({
      customHtml: { isEnabled: true, position: 'above_columns', html: '<p>Hi</p>', css: '' },
    });
    const res = createMockRes();

    await footerSettingsController.updateFooterSection(
      req({ params: { section: 'layout' }, body: { hiddenColumns: ['section3'], colors: { background: '#0b1f3a' } } }),
      res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(calls[0].$set), ['layout']);
    assert.deepEqual(calls[0].$set.layout.hiddenColumns, ['section3']);
    assert.equal(calls[0].$set.layout.colors.background, '#0b1f3a');
  });

  test('Save All stores the new blocks and keeps the ones that were not sent', async () => {
    const calls = stubStore({
      sectionContact: { isEnabled: true, title: 'Contact', items: [{ type: 'email', value: 'hi@example.com' }] },
    });
    const res = createMockRes();

    await footerSettingsController.saveFooterSettings(
      req({
        body: {
          section2: { title: 'Useful links', links: [] },
          sectionPayments: { isEnabled: true, heading: 'We accept', logos: [{ name: 'PayPal' }] },
        },
      }),
      res
    );

    assert.equal(res.statusCode, 200);
    const stored = calls[0].$set;
    assert.equal(stored.sectionPayments.logos[0].name, 'PayPal');
    assert.equal(stored.sectionContact.title, 'Contact');
    assert.equal(stored.sectionContact.items[0].value, 'hi@example.com');
    assert.equal(stored.customHtml.isEnabled, false);
  });

  test('an unknown section name is still refused', async () => {
    stubStore(null);
    const res = createMockRes();

    await footerSettingsController.updateFooterSection(
      req({ params: { section: 'section5' }, body: { title: 'x' } }),
      res
    );

    assert.equal(res.statusCode, 400);
  });
});
