const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const service = require('../createProduct');

describe('parseVariantNameToAttributes', () => {
    const variantNames = service.processVariantAttributes([
        { name: 'Condition', attributeSlug: 'condition', options: [{ value: 'Brand New' }, { value: 'Good' }] },
        { name: 'Variant Colour', attributeSlug: 'variant-colour', options: [{ value: 'Awesome' }, { value: 'Awesome Gray', colorCode: '#777' }] },
        { name: 'Storage', attributeSlug: 'storage', options: [{ value: '128GB' }] },
    ]);

    test('keeps multi-word values whole by matching option slugs', () => {
        const attrs = service.parseVariantNameToAttributes('brand-new-awesome-gray-128gb', variantNames);
        assert.deepEqual(
            attrs.map((a) => [a.attributeSlug, a.value, a.valueSlug]),
            [
                ['condition', 'Brand New', 'brand-new'],
                ['variant-colour', 'Awesome Gray', 'awesome-gray'],
                ['storage', '128GB', '128gb'],
            ]
        );
        assert.equal(attrs[1].colorCode, '#777');
    });

    test('backs off a longer match when it would strand a later attribute', () => {
        const defs = service.processVariantAttributes([
            { name: 'A', attributeSlug: 'a', options: [{ value: 'Red' }, { value: 'Red Wine' }] },
            { name: 'B', attributeSlug: 'b', options: [{ value: 'Wine Glass' }] },
        ]);
        const attrs = service.parseVariantNameToAttributes('red-wine-glass', defs);
        assert.deepEqual(attrs.map((a) => a.value), ['Red', 'Wine Glass']);
    });

    test('falls back to one part per attribute when no options are known', () => {
        const attrs = service.parseVariantNameToAttributes('red-32gb', [
            { name: 'Color', attributeSlug: 'color', options: [] },
            { name: 'Storage', attributeSlug: 'storage', options: [] },
        ]);
        assert.deepEqual(attrs.map((a) => a.value), ['red', '32gb']);
    });
});
