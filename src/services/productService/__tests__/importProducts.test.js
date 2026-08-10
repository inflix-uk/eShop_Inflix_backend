const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const service = require('../importProducts');

/** Reference fixtures shaped like the lean docs loadReference() queries. */
function ref() {
    return service.buildReference({
        categories: [
            { name: 'Car-Fragrance', subCategory: ['Hanging', 'Vent Clip'] },
            { name: 'Home-Fragrances', subCategory: ['Reed-Diffuser'] },
        ],
        tags: [{ name: 'Home Fragrances' }, { name: 'Aroma Desire' }],
        attributes: [
            {
                _id: 'attr-brands',
                name: 'Brands',
                slug: 'brands',
                values: [{ name: 'Aroma Desire', slug: 'aroma-desire' }],
            },
            {
                _id: 'attr-scent',
                name: 'Scent',
                slug: 'scent',
                values: [
                    { name: 'White Tea', slug: 'white-tea' },
                    { name: 'English Pear', slug: 'english-pear' },
                ],
            },
            {
                _id: 'attr-color',
                name: 'Color',
                slug: 'color',
                values: [{ name: 'Sky Blue', slug: 'sky-blue', colorCode: '#87CEEB' }],
            },
            {
                _id: 'attr-cw',
                name: 'Comes With',
                slug: 'comes_with',
                values: [{ name: 'Car Vent Clip', slug: '1x-car-vent-clip' }],
            },
            {
                _id: 'attr-ts',
                name: 'Top Section',
                slug: 'top_section',
                values: [{ name: 'Free Delivery', slug: 'free_delivery' }],
            },
        ],
    });
}

describe('prepareProduct validation', () => {
    test('accepts and canonicalizes known values regardless of case', () => {
        const { product, errors } = service.prepareProduct(
            {
                category: 'car-fragrance',
                subCategory: JSON.stringify({ 'CAR-FRAGRANCE': ['hanging'] }),
                brand: 'aroma desire',
                tags: 'home fragrances, AROMA DESIRE',
                comesWithItems: ['Car Vent Clip'],
                topSectionItems: ['free_delivery'],
                variants: [{ attributes: [{ attributeSlug: 'scent', value: 'white tea' }] }],
            },
            ref()
        );

        assert.deepEqual(errors, []);
        assert.equal(product.category, 'Car-Fragrance');
        assert.equal(product.subCategory, JSON.stringify({ 'Car-Fragrance': ['Hanging'] }));
        assert.equal(product.brand, 'Aroma Desire');
        assert.equal(product.tags, 'Home Fragrances,Aroma Desire');
        // comes_with items are stored as slugs — names are normalized to slugs.
        assert.deepEqual(product.comesWithItems, ['1x-car-vent-clip']);
        assert.deepEqual(product.topSectionItems, ['free_delivery']);
    });

    test('rejects unknown category, brand, tag, comes_with and attribute values', () => {
        const { errors } = service.prepareProduct(
            {
                category: 'Car-Fragrence',
                brand: 'Nope',
                tags: 'NotATag',
                comesWithItems: ['mystery-item'],
                variants: [
                    { attributes: [{ attributeSlug: 'scent', value: 'Lavender' }] },
                    { attributes: [{ attributeSlug: 'ghost', value: 'x' }] },
                ],
            },
            ref()
        );

        assert.ok(errors.some((e) => e.includes('Unknown category "Car-Fragrence"')));
        assert.ok(errors.some((e) => e.includes('Unknown brand "Nope"')));
        assert.ok(errors.some((e) => e.includes('Unknown tag "NotATag"')));
        assert.ok(errors.some((e) => e.includes('Unknown comes_with item "mystery-item"')));
        assert.ok(errors.some((e) => e.includes('Unknown value "Lavender" for attribute "Scent"')));
        assert.ok(errors.some((e) => e.includes('Unknown variant attribute "ghost"')));
    });

    test('validates each part of a multi-category cell', () => {
        const good = service.prepareProduct({ category: 'Car-Fragrance,Home-Fragrances' }, ref());
        assert.deepEqual(good.errors, []);
        assert.equal(good.product.category, 'Car-Fragrance,Home-Fragrances');

        const bad = service.prepareProduct({ category: 'Car-Fragrance,Bogus' }, ref());
        assert.ok(bad.errors.some((e) => e.includes('Unknown category "Bogus"')));
    });

    test('condition is not validated (form allows custom conditions)', () => {
        const { errors } = service.prepareProduct({ condition: 'Totally Custom' }, ref());
        assert.deepEqual(errors, []);
    });

    test('skips all checks when reference data is unavailable', () => {
        const { errors } = service.prepareProduct(
            { category: 'Anything', brand: 'Whatever', tags: 'Nope' },
            null
        );
        assert.deepEqual(errors, []);
    });
});

describe('prepareProduct grandfather clause (unchanged stored values pass)', () => {
    // A live product carrying orphaned reference data: categories/tags that
    // have since been deleted from the reference collections.
    const existing = {
        category: 'Home-Fragrances,Brand-New',
        subCategory: JSON.stringify({ 'Ghost-Category': ['Ghost-Sub'] }),
        brand: 'Retired Brand',
        tags: 'Home Fragrances,Deleted Tag',
        comesWithItems: ['ghost-item'],
        variantValues: [
            { attributes: [{ attributeSlug: 'scent', value: 'Discontinued Musk', valueSlug: 'discontinued-musk' }] },
        ],
    };

    test('an export round-trips over itself even with orphaned values', () => {
        const { product, errors } = service.prepareProduct(
            {
                category: 'Home-Fragrances,Brand-New',
                subCategory: JSON.stringify({ 'Ghost-Category': ['Ghost-Sub'] }),
                brand: 'retired brand', // case-insensitive match
                tags: 'Home Fragrances,Deleted Tag',
                comesWithItems: ['ghost-item'],
                variants: [{ attributes: [{ attributeSlug: 'scent', value: 'Discontinued Musk' }] }],
            },
            ref(),
            existing
        );
        assert.deepEqual(errors, []);
        // Stored spellings win over the file's casing.
        assert.equal(product.category, 'Home-Fragrances,Brand-New');
        assert.equal(product.brand, 'Retired Brand');
        assert.deepEqual(product.comesWithItems, ['ghost-item']);
    });

    test('stored valueSlug also grandfathers a variant attribute pair', () => {
        const { errors } = service.prepareProduct(
            { variants: [{ attributes: [{ attributeSlug: 'scent', value: 'discontinued-musk' }] }] },
            ref(),
            existing
        );
        assert.deepEqual(errors, []);
    });

    test('CHANGED values still validate strictly on update', () => {
        const { errors } = service.prepareProduct(
            {
                category: 'Home-Fragrances,Christmas-Deals', // changed → each part must exist
                brand: 'Another Ghost',
                variants: [{ attributes: [{ attributeSlug: 'scent', value: 'Motor Oil' }] }],
            },
            ref(),
            existing
        );
        assert.ok(errors.some(e => e.includes('Unknown category "Christmas-Deals"')), errors.join('; '));
        assert.ok(errors.some(e => e.includes('Unknown brand "Another Ghost"')), errors.join('; '));
        assert.ok(errors.some(e => e.includes('Unknown value "Motor Oil"')), errors.join('; '));
    });

    test('creates (no existing product) still validate everything', () => {
        const { errors } = service.prepareProduct(
            { category: 'Brand-New', brand: 'Retired Brand' },
            ref(),
            null
        );
        assert.ok(errors.some(e => e.includes('Unknown category "Brand-New"')));
        assert.ok(errors.some(e => e.includes('Unknown brand "Retired Brand"')));
    });
});

describe('buildVariant enrichment', () => {
    test('resolves display name, canonical spelling/slug and colorCode', () => {
        const variant = service.buildVariant(
            { attributes: [{ attributeSlug: 'color', value: 'sky blue' }] },
            'variant',
            ref()
        );

        assert.deepEqual(variant.attributes, [
            {
                attributeName: 'Color',
                attributeSlug: 'color',
                value: 'Sky Blue',
                valueSlug: 'sky-blue',
                colorCode: '#87CEEB',
                model: null,
            },
        ]);
        assert.equal(variant.name, 'sky-blue');
        assert.equal(variant.status, true);
        assert.equal(variant.Quantity, 0);
    });

    test('falls back to "single" name for single products', () => {
        const variant = service.buildVariant({}, 'single', ref());
        assert.equal(variant.name, 'single');
    });
});

describe('enrichVariantNames', () => {
    test('fills display name, attributeId and canonical option slugs', () => {
        const [vn] = service.enrichVariantNames(
            [{ name: 'scent', attributeSlug: 'scent', hasModels: false, options: [{ value: 'white tea' }] }],
            ref()
        );
        assert.equal(vn.name, 'Scent');
        assert.equal(vn.attributeId, 'attr-scent');
        assert.deepEqual(vn.options, [
            { value: 'White Tea', slug: 'white-tea', colorCode: null, model: null },
        ]);
    });
});

describe('buildCreateDoc', () => {
    test('defaults: draft status when status is null, empty varImgGroup', () => {
        const doc = service.buildCreateDoc(
            { name: 'X', status: null, variants: [{}] },
            'x',
            ref()
        );
        assert.equal(doc.status, false);
        assert.deepEqual(doc.varImgGroup, []);
        assert.equal(doc.producturl, 'x');
        assert.equal(doc.variantValues.length, 1);
    });
});

describe('buildUpdateDoc merge semantics', () => {
    const existing = {
        productType: { type: 'variant' },
        tags: 'Old Tag',
        category: 'Car-Fragrance',
        status: true,
        Seo_Meta: {
            metaTitle: 'Stored title',
            metaDescription: 'Stored description',
            metaKeywords: 'stored',
            metaSchemas: ['{"@type":"Product"}'],
        },
        variantNames: [{ name: 'Scent', attributeSlug: 'scent' }],
        variantValues: [
            {
                name: 'white-tea-s',
                slug: 'white-tea-s',
                variantId: 'KEEP-ME-1234',
                SKU: 'WT-S',
                status: false,
                metaTitle: 'Variant SEO',
                metaSchemas: ['kept'],
                metaImage: { url: 'x' },
                variantImages: [{ url: 'stored.png' }],
                Cost: 4,
                Price: 19.99,
                salePrice: '9.99',
                Quantity: 25,
            },
        ],
    };

    test('blank fields are left out of the $set entirely', () => {
        const set = service.buildUpdateDoc(
            { name: 'New Name', category: '', tags: null, status: null, productType: { type: null } },
            existing,
            ref()
        );

        assert.equal(set.name, 'New Name');
        assert.ok(!('category' in set));
        assert.ok(!('tags' in set));
        assert.ok(!('status' in set));
        assert.ok(!('productType' in set));
        // Never touched by imports:
        assert.ok(!('producturl' in set));
        assert.ok(!('varImgGroup' in set));
        assert.ok(!('battery' in set));
    });

    test('explicit boolean false IS applied', () => {
        const set = service.buildUpdateDoc({ status: false }, existing, ref());
        assert.equal(set.status, false);
    });

    test('Seo_Meta merges per field and always preserves stored metaSchemas', () => {
        const set = service.buildUpdateDoc(
            { Seo_Meta: { metaTitle: 'New title', metaDescription: '', metaKeywords: null } },
            existing,
            ref()
        );
        assert.equal(set.Seo_Meta.metaTitle, 'New title');
        assert.equal(set.Seo_Meta.metaDescription, 'Stored description');
        assert.equal(set.Seo_Meta.metaKeywords, 'stored');
        assert.deepEqual(set.Seo_Meta.metaSchemas, ['{"@type":"Product"}']);
    });

    test('matched variants keep variantId, status, SEO and images; file values win when provided', () => {
        const set = service.buildUpdateDoc(
            {
                variants: [
                    {
                        name: 'white-tea-s',
                        SKU: 'WT-S',
                        Price: 21.99,       // provided → wins
                        Cost: null,         // blank → stored value survives
                        Quantity: null,     // blank → stored value survives
                        salePrice: null,
                        imageUrls: [],      // none in file → stored images survive
                        attributes: [{ attributeSlug: 'scent', value: 'White Tea' }],
                    },
                ],
            },
            existing,
            ref()
        );

        const [variant] = set.variantValues;
        assert.equal(variant.variantId, 'KEEP-ME-1234');
        assert.equal(variant.status, false);
        assert.equal(variant.metaTitle, 'Variant SEO');
        assert.deepEqual(variant.metaSchemas, ['kept']);
        assert.deepEqual(variant.variantImages, [{ url: 'stored.png' }]);
        assert.equal(variant.Price, 21.99);
        assert.equal(variant.Cost, 4);
        assert.equal(variant.Quantity, 25);
        assert.equal(variant.salePrice, '9.99');
    });

    test('unmatched variants come in fresh with a new variantId', () => {
        const set = service.buildUpdateDoc(
            { variants: [{ name: 'bamboo-m', SKU: 'BM-M', Price: 24.99 }] },
            existing,
            ref()
        );
        const [variant] = set.variantValues;
        assert.notEqual(variant.variantId, 'KEEP-ME-1234');
        assert.equal(variant.status, true);
        assert.equal(variant.Price, 24.99);
    });

    test('variantNames are preserved when the file provides none, replaced when it does', () => {
        const kept = service.buildUpdateDoc({ variantNames: [] }, existing, ref());
        assert.ok(!('variantNames' in kept));

        const replaced = service.buildUpdateDoc(
            {
                productType: { type: 'variant' },
                variantNames: [{ name: 'scent', attributeSlug: 'scent', options: [{ value: 'White Tea' }] }],
            },
            existing,
            ref()
        );
        assert.equal(replaced.variantNames[0].name, 'Scent');
    });

    test('explicitly flipping to single clears variantNames', () => {
        const set = service.buildUpdateDoc({ productType: { type: 'single' } }, existing, ref());
        assert.deepEqual(set.variantNames, []);
        assert.deepEqual(set.productType, { type: 'single' });
    });
});

describe('image reuse on update (round-tripped exports stay lossless)', () => {
    const storedThumb = {
        filename: 'local-thumb.png',
        path: '/uploads/local-thumb.png',
        url: 'https://cdn.example.com/thumb.png',
        altText: 'Hand-written alt',
        description: 'Hand-written description',
    };
    const storedGallery = [
        { filename: 'g1.png', path: '/uploads/g1.png', url: 'https://cdn.example.com/g1.png', altText: 'g1 alt' },
        { filename: 'g2.png', path: '/uploads/g2.png', url: 'https://cdn.example.com/g2.png', altText: 'g2 alt' },
    ];
    const existing = {
        productType: { type: 'single' },
        thumbnail_image: storedThumb,
        Gallery_Images: storedGallery,
        variantValues: [
            {
                name: 'single',
                SKU: 'SGL-1',
                variantId: 'VAR-1',
                variantImages: [{ filename: 'v1.png', path: '/uploads/v1.png', url: 'https://cdn.example.com/v1.png', altText: 'v1 alt' }],
            },
        ],
    };

    test('unchanged thumbnail URL keeps the stored doc (alt text, path, filename)', () => {
        const set = service.buildUpdateDoc(
            { thumbnailUrl: 'https://cdn.example.com/thumb.png' },
            existing,
            ref()
        );
        assert.deepEqual(set.thumbnail_image, storedThumb);
    });

    test('a genuinely new thumbnail URL builds a fresh doc', () => {
        const set = service.buildUpdateDoc(
            { thumbnailUrl: 'https://cdn.example.com/replacement.png' },
            existing,
            ref()
        );
        assert.equal(set.thumbnail_image.url, 'https://cdn.example.com/replacement.png');
        assert.equal(set.thumbnail_image.altText, '');
        assert.equal(set.thumbnail_image.path, null);
    });

    test('a URL that matches the stored PATH also reuses the stored doc', () => {
        const set = service.buildUpdateDoc(
            { thumbnailUrl: '/uploads/local-thumb.png' },
            existing,
            ref()
        );
        assert.deepEqual(set.thumbnail_image, storedThumb);
    });

    test('gallery mixes reused and fresh docs, in file order', () => {
        const set = service.buildUpdateDoc(
            { galleryUrls: ['https://cdn.example.com/g2.png', 'https://cdn.example.com/new.png'] },
            existing,
            ref()
        );
        assert.equal(set.Gallery_Images.length, 2);
        assert.deepEqual(set.Gallery_Images[0], storedGallery[1]); // reused, reordered per file
        assert.equal(set.Gallery_Images[1].url, 'https://cdn.example.com/new.png');
        assert.equal(set.Gallery_Images[1].altText, '');
    });

    test('matched variant keeps its stored image doc when the URL is unchanged', () => {
        const set = service.buildUpdateDoc(
            {
                variants: [
                    { name: 'single', SKU: 'SGL-1', imageUrls: ['https://cdn.example.com/v1.png'] },
                ],
            },
            existing,
            ref()
        );
        const [variant] = set.variantValues;
        assert.equal(variant.variantId, 'VAR-1');
        assert.deepEqual(variant.variantImages, existing.variantValues[0].variantImages);
    });
});
