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

test('a variant whose id changed is still matched by its unique name', async () => {
    const Product = require('../../../models/product');
    const { importSheet } = require('../bulkSheet');
    const pid = '6ad88a9a47aabe3bc09979d7';
    const original = Product.find;
    Product.find = () => ({
        select: () => ({
            lean: async () => [{
                _id: pid,
                name: 'Fold',
                variantValues: [
                    { _id: '6ae877e672ca0ebbc5e77b93', name: 'excellent-512gb-cream', Price: 100 },
                    { _id: '6ae877e672ca0ebbc5e77b94', name: 'good-512gb-cream', Price: 90 },
                    { _id: '6ae877e672ca0ebbc5e77b95', name: 'good-512gb-cream', Price: 80 },
                ],
            }],
        }),
    });
    try {
        const res = await importSheet({
            dryRun: true,
            variants: [
                { row: 2, productId: pid, variantId: '000000000000000000000001', variant: 'excellent-512gb-cream', price: '120' },
                { row: 3, productId: pid, variantId: '000000000000000000000002', variant: 'good-512gb-cream', price: '95' },
            ],
        });
        assert.strictEqual(res.changeCount, 1);
        assert.deepStrictEqual(res.changes[0], { product: 'Fold', variant: 'excellent-512gb-cream', field: 'Price', from: 100, to: 120 });
        // Two variants share that name, so the row is not guessed.
        assert.strictEqual(res.errors.length, 1);
        assert.strictEqual(res.errors[0].row, 3);
    } finally {
        Product.find = original;
    }
});
