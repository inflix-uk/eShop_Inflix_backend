const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeConditions, attachConditions } = require('../productConditions');

const conditionNames = (options, extra = {}) => ({
    name: 'Condition',
    attributeSlug: 'condition',
    options: options.map((value) => ({ value, slug: value.toLowerCase().replace(/\s+/g, '-') })),
    ...extra,
});
const colourNames = {
    name: 'Colour',
    attributeSlug: 'colour',
    options: [{ value: 'Awesome Gray', slug: 'awesome-gray' }],
};

describe('summarizeConditions', () => {
    test('uses variantNames options that appear in active variants, best-first', () => {
        const product = {
            condition: 'Brand New',
            variantNames: [conditionNames(['Fair', 'Brand New', 'Excellent', 'Good']), colourNames],
            variantValues: [
                { name: 'fair-awesome-gray', Price: 300, Quantity: 2 },
                { name: 'excellent-awesome-gray', Price: 400, Quantity: 1 },
                { name: 'brand-new-awesome-gray', Price: 600, Quantity: 1 },
                { name: 'good-awesome-gray', Price: 350, Quantity: 0, status: false },
            ],
        };
        const out = summarizeConditions(product);
        assert.deepEqual(out.conditions, ['Brand New', 'Excellent', 'Fair']);
        assert.equal(out.cheapestCondition, 'Fair');
    });

    test('cheapest prefers salePrice > 0 and ignores out-of-stock variants', () => {
        const product = {
            variantNames: [conditionNames(['Brand New', 'Good'])],
            variantValues: [
                { name: 'brand-new-128gb', Price: 900, salePrice: '250', Quantity: 1 },
                { name: 'good-128gb', Price: 300, salePrice: '0', Quantity: 3 },
                { name: 'good-256gb', Price: 100, Quantity: 0 },
            ],
        };
        assert.equal(summarizeConditions(product).cheapestCondition, 'Brand New');
    });

    test('"very-good" is not mistaken for "good"', () => {
        const product = {
            variantNames: [conditionNames(['Good', 'Very Good'])],
            variantValues: [{ name: 'very-good-black', Price: 100, Quantity: 1 }],
        };
        assert.deepEqual(summarizeConditions(product).conditions, ['Very Good']);
    });

    test('handles legacy underscore slugs and mixed-case variant names', () => {
        const product = {
            variantNames: [{ name: 'Conditions', options: [{ value: 'Brand New', slug: 'brand_new' }, { value: 'Excellent' }] }],
            variantValues: [
                { name: 'Brand New-Red-32GB', Price: 10, Quantity: 1 },
                { name: 'excellent-red-32gb', Price: 5, Quantity: 1 },
            ],
        };
        const out = summarizeConditions(product);
        assert.deepEqual(out.conditions, ['Brand New', 'Excellent']);
        assert.equal(out.cheapestCondition, 'Excellent');
    });

    test('falls back to variant attributes when variantNames has no condition', () => {
        const product = {
            condition: 'Brand New',
            variantValues: [
                { name: 'x', Price: 50, Quantity: 1, attributes: [{ attributeSlug: 'variant-condition', value: 'Good' }] },
                { name: 'y', Price: 80, Quantity: 1, attributes: [{ attributeName: 'Condition', value: 'Pristine' }] },
            ],
        };
        const out = summarizeConditions(product);
        assert.deepEqual(out.conditions, ['Pristine', 'Good']);
        assert.equal(out.cheapestCondition, 'Good');
    });

    test('shows variantNames options when no variant name matches', () => {
        const product = {
            condition: 'Brand New',
            variantNames: [conditionNames(['Excellent', 'Brand New'])],
            variantValues: [{ name: 'garbage', Price: 10, Quantity: 1 }],
        };
        const out = summarizeConditions(product);
        assert.deepEqual(out.conditions, ['Brand New', 'Excellent']);
        assert.equal(out.cheapestCondition, null);
    });

    test('falls back to product.condition', () => {
        assert.deepEqual(summarizeConditions({ condition: 'Refurbished' }), {
            conditions: ['Refurbished'],
            cheapestCondition: null,
        });
        assert.deepEqual(summarizeConditions({}), { conditions: [], cheapestCondition: null });
        assert.deepEqual(summarizeConditions(null), { conditions: [], cheapestCondition: null });
    });

    test('unknown conditions sort after known ones', () => {
        const product = {
            variantNames: [conditionNames(['Like New', 'Fair', 'Brand New'])],
            variantValues: [
                { name: 'like-new', Price: 1, Quantity: 1 },
                { name: 'fair', Price: 1, Quantity: 1 },
                { name: 'brand-new', Price: 1, Quantity: 1 },
            ],
        };
        assert.deepEqual(summarizeConditions(product).conditions, ['Brand New', 'Fair', 'Like New']);
    });
});

describe('attachConditions', () => {
    test('adds fields and strips requested ones', () => {
        const [out] = attachConditions(
            [{
                _id: '1',
                variantNames: [conditionNames(['Good'])],
                variantValues: [{ name: 'good', Price: 1, Quantity: 1, status: true, attributes: [] }],
            }],
            { omit: ['variantNames'], omitVariantFields: ['status', 'attributes'] }
        );
        assert.deepEqual(out.conditions, ['Good']);
        assert.equal(out.cheapestCondition, 'Good');
        assert.equal('variantNames' in out, false);
        assert.deepEqual(out.variantValues, [{ name: 'good', Price: 1, Quantity: 1 }]);
    });
});
