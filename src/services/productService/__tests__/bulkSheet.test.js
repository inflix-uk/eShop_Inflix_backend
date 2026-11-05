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

test.describe('split export / import (Product Details & Pricing vs Descriptions & Perks)', () => {
    const Product = require('../../../models/product');
    const { exportSheet, importSheet } = require('../bulkSheet');
    const pid = '6ad88a9a47aabe3bc09979d7';
    const vid = '6ae877e672ca0ebbc5e77b93';
    const stored = {
        _id: pid,
        name: 'Fold',
        producturl: 'fold',
        Product_summary: 'Old summary',
        Product_description: '<p>Old</p>',
        perks_and_benefits: { status: true, description: '<p>Perks</p>' },
        variantValues: [{ _id: vid, name: 'good-512gb', Price: 100, SKU: 'F-1' }],
    };

    function stubProduct(onSelect) {
        const original = { find: Product.find, bulkWrite: Product.bulkWrite };
        const writes = [];
        Product.find = () => {
            const chain = {
                select: (fields) => { onSelect(fields); return chain; },
                sort: () => chain,
                lean: async () => [stored],
            };
            return chain;
        };
        Product.bulkWrite = async (ops) => { writes.push(...ops); };
        return { writes, restore: () => Object.assign(Product, original) };
    }

    test('part=prices exports variant rows only and does not load description fields', async () => {
        let selected = '';
        const stub = stubProduct((f) => { selected = f; });
        try {
            const res = await exportSheet({ part: 'prices' });
            assert.equal(res.variants.length, 1);
            assert.equal(res.content.length, 0);
            assert.ok(!/Product_description|perks_and_benefits|Product_summary/.test(selected), selected);
        } finally {
            stub.restore();
        }
    });

    test('part=content exports description rows only and does not load variants', async () => {
        let selected = '';
        const stub = stubProduct((f) => { selected = f; });
        try {
            const res = await exportSheet({ part: 'content' });
            assert.equal(res.variants.length, 0);
            assert.equal(res.content.length, 1);
            assert.ok(!/variantValues/.test(selected), selected);
        } finally {
            stub.restore();
        }
    });

    test('no part keeps the combined export', async () => {
        const stub = stubProduct(() => {});
        try {
            const res = await exportSheet({});
            assert.equal(res.variants.length, 1);
            assert.equal(res.content.length, 1);
        } finally {
            stub.restore();
        }
    });

    test('a pricing import only writes variant fields', async () => {
        const stub = stubProduct(() => {});
        try {
            const res = await importSheet({
                dryRun: false,
                variants: [{ row: 2, productId: pid, variantId: vid, price: '120', sku: 'F-2' }],
                content: [],
            });
            assert.equal(res.changeCount, 2);
            assert.equal(stub.writes.length, 1);
            const keys = Object.keys(stub.writes[0].updateOne.update.$set).filter((k) => k !== 'updatedAt');
            assert.deepEqual(keys.sort(), ['variantValues.0.Price', 'variantValues.0.SKU']);
        } finally {
            stub.restore();
        }
    });

    test('a descriptions import only writes content fields', async () => {
        const stub = stubProduct(() => {});
        try {
            await importSheet({
                dryRun: false,
                variants: [],
                content: [{ row: 2, productId: pid, summary: 'New summary', perks: '<p>New perks</p>' }],
            });
            const keys = Object.keys(stub.writes[0].updateOne.update.$set).filter((k) => k !== 'updatedAt');
            assert.deepEqual(keys.sort(), ['Product_summary', 'perks_and_benefits.description']);
        } finally {
            stub.restore();
        }
    });
});
