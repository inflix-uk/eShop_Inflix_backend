const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const Product = require('../../../models/product');
const service = require('../importProducts');

/**
 * A soft-deleted product used to be matched by producturl and UPDATED, which
 * revived it with its old variant options merged into the file's. A fresh file
 * must now create a clean product and move the deleted copy out of the way.
 */
const DELETED_ID = '6ad88a9a47aabe3bc09979d7';
const deletedDoc = {
    _id: DELETED_ID,
    name: 'Samsung Galaxy A16',
    producturl: 'samsung-galaxy-a16',
    isdeleted: true,
    productType: { type: 'variant' },
    variantNames: [{ name: 'Colour', attributeSlug: 'variant-colour', options: [{ value: 'Old Pink', slug: 'old-pink' }] }],
    variantValues: [{ name: 'old-pink', SKU: 'OLD-1', Price: 99, attributes: [{ attributeSlug: 'variant-colour', value: 'Old Pink' }] }],
};

const phoneRef = () => service.buildReference({
    attributes: [
        { _id: 'a1', name: 'Storage', slug: 'storage', values: [{ name: '128GB', slug: '128gb' }] },
        { _id: 'a2', name: 'Variant Colour', slug: 'variant-colour', values: [{ name: 'Black', slug: 'black' }, { name: 'Old Pink', slug: 'old-pink' }] },
        { _id: 'a3', name: 'Condition', slug: 'condition', values: [{ name: 'Brand New', slug: 'brand-new' }] },
        { _id: 'a4', name: 'SIM', slug: 'sim', values: [{ name: 'Dual SIM', slug: 'dual-sim' }] },
    ],
});

const fileProduct = () => ({
    producturl: 'samsung-galaxy-a16',
    name: 'Samsung Galaxy A16',
    productType: { type: 'variant' },
    variantNames: [
        { name: 'Storage', attributeSlug: 'storage', options: [{ value: '128GB' }] },
        { name: 'Variant Colour', attributeSlug: 'variant-colour', options: [{ value: 'Black' }] },
        { name: 'Condition', attributeSlug: 'condition', options: [{ value: 'Brand New' }] },
        { name: 'SIM', attributeSlug: 'sim', options: [{ value: 'Dual SIM' }] },
    ],
    variants: [{
        SKU: 'A16-128-BLK',
        Price: 149,
        Quantity: 5,
        attributes: [
            { attributeSlug: 'storage', value: '128GB' },
            { attributeSlug: 'variant-colour', value: 'Black' },
            { attributeSlug: 'condition', value: 'Brand New' },
            { attributeSlug: 'sim', value: 'Dual SIM' },
        ],
    }],
});

/** Mongo query filter matcher for the few shapes importProducts uses. */
function matches(doc, filter) {
    return Object.entries(filter).every(([k, cond]) => {
        if (cond && typeof cond === 'object' && '$ne' in cond) return doc[k] !== cond.$ne;
        if (cond && typeof cond === 'object' && '$in' in cond) return cond.$in.includes(doc[k]);
        return doc[k] === cond;
    });
}

describe('re-importing a deleted product', () => {
    let saved;
    let updates;
    const originals = {};

    beforeEach(() => {
        saved = [];
        updates = [];
        originals.find = Product.find;
        originals.findOne = Product.findOne;
        originals.updateOne = Product.updateOne;
        originals.save = Product.prototype.save;
        originals.loadReference = service.loadReference;

        const docs = [deletedDoc];
        Product.find = (filter = {}) => ({ lean: async () => docs.filter((d) => matches(d, filter)) });
        Product.findOne = (filter = {}) => ({ lean: async () => docs.find((d) => matches(d, filter)) || null });
        Product.updateOne = async (filter, update) => { updates.push({ filter, update }); return { modifiedCount: 1 }; };
        Product.prototype.save = async function save() { saved.push(this.toObject()); return this; };
        service.loadReference = async () => phoneRef();
    });

    afterEach(() => {
        Product.find = originals.find;
        Product.findOne = originals.findOne;
        Product.updateOne = originals.updateOne;
        Product.prototype.save = originals.save;
        service.loadReference = originals.loadReference;
    });

    test('creates a fresh product with only the file variants and frees the url', async () => {
        const res = await service.importProducts([fileProduct()], { updateExisting: true });
        assert.equal(res.results.created, 1);
        assert.equal(res.results.updated, 0);
        assert.equal(res.results.replacedDeleted, 1);
        assert.equal(res.details[0].replacesDeleted, true);

        // The deleted doc is only renamed, never updated with the file's data.
        assert.equal(updates.length, 1);
        assert.equal(updates[0].filter._id, DELETED_ID);
        assert.deepEqual(updates[0].update, { $set: { producturl: `samsung-galaxy-a16-deleted-${DELETED_ID}` } });

        assert.equal(saved.length, 1);
        const doc = saved[0];
        assert.equal(doc.producturl, 'samsung-galaxy-a16');
        assert.equal(doc.isdeleted, false);
        assert.deepEqual(doc.variantValues.map((v) => v.SKU), ['A16-128-BLK']);
        const options = doc.variantNames.flatMap((vn) => vn.options.map((o) => o.value));
        assert.ok(!options.includes('Old Pink'), 'old variant options must not come back');
        assert.deepEqual(doc.variantNames.map((vn) => vn.attributeSlug), ['storage', 'variant-colour', 'condition', 'sim']);
    });

    test('dry run reports a create, writes nothing and keeps the url', async () => {
        const res = await service.importProducts([fileProduct()], { updateExisting: true, dryRun: true });
        assert.equal(res.results.created, 1);
        assert.equal(res.results.updated, 0);
        assert.equal(res.details[0].action, 'would create');
        assert.equal(res.details[0].producturl, 'samsung-galaxy-a16');
        assert.equal(updates.length, 0);
        assert.equal(saved.length, 0);
    });

    test('a file without producturl takes the name slug from the deleted product too', async () => {
        const p = fileProduct();
        delete p.producturl;
        const res = await service.importProducts([p], { updateExisting: true });
        assert.equal(res.results.created, 1);
        assert.equal(saved[0].producturl, 'samsung-galaxy-a16');
        assert.equal(updates.length, 1);
    });

    test('updateExisting=false does not skip it as "Already exists"', async () => {
        const res = await service.importProducts([fileProduct()], { updateExisting: false, dryRun: true });
        assert.equal(res.results.skipped, 0);
        assert.equal(res.results.created, 1);
    });
});
