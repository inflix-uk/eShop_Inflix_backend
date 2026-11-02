const test = require('node:test');
const assert = require('node:assert');
const { descriptionSource, parseNumber } = require('../bulkSheet');

test('parseNumber accepts prices typed with currency signs and commas', () => {
    assert.strictEqual(parseNumber('£1,299.50'), 1299.5);
    assert.strictEqual(parseNumber(42), 42);
    assert.ok(Number.isNaN(parseNumber('abc')));
    assert.ok(Number.isNaN(parseNumber('')));
});

test('description without blocks reads Product_description', () => {
    const d = descriptionSource({ Product_description: '<p>Hi</p>', Product_description_blocks: [] });
    assert.deepStrictEqual(d, { editable: true, path: 'Product_description', value: '<p>Hi</p>' });
});

test('stored "null" text reads as empty', () => {
    assert.strictEqual(descriptionSource({ Product_description: 'null' }).value, '');
});

test('a single text block is edited in place (the website shows blocks first)', () => {
    const d = descriptionSource({
        Product_description: 'old',
        Product_description_blocks: [
            { type: 'row', columns: [{ blocks: [] }] },
            { type: 'row', columns: [{ blocks: [{ type: 'text', content: '<p>Shown</p>' }] }] },
        ],
    });
    assert.deepStrictEqual(d, {
        editable: true,
        path: 'Product_description_blocks.1.columns.0.blocks.0.content',
        value: '<p>Shown</p>',
    });
});

test('several blocks are left to the product form', () => {
    const d = descriptionSource({
        Product_description_blocks: [
            { type: 'row', columns: [{ blocks: [{ type: 'text', content: 'a' }, { type: 'image', src: 'x' }] }] },
        ],
    });
    assert.strictEqual(d.editable, false);
});
