// Derive the real list of conditions a product is sold in (for listing cards),
// instead of relying on the single product-level `condition` string.
const { toSeoSlug, variantNameToSeoSlug } = require('./slugUtils');

// Best-first display order; unknown conditions go last (original order kept).
const CONDITION_ORDER = [
    'brand-new',
    'pristine',
    'open-box',
    'excellent',
    'very-good',
    'good',
    'fair',
    'refurbished',
];
const CONDITION_ALIASES = { new: 'brand-new' };

const normSlug = (text) => toSeoSlug(String(text || '').replace(/_/g, '-'));

const conditionRank = (slug) => {
    const idx = CONDITION_ORDER.indexOf(CONDITION_ALIASES[slug] || slug);
    return idx === -1 ? CONDITION_ORDER.length : idx;
};

const isConditionKey = (...values) =>
    values.some((v) => /condition/i.test(String(v || '')));

const isActiveVariant = (v) => v && v.status !== false && v.status !== 'false';

const variantUnitPrice = (v) => {
    const sale = Number(v.salePrice);
    if (Number.isFinite(sale) && sale > 0) return sale;
    const price = Number(v.Price);
    return Number.isFinite(price) && price > 0 ? price : null;
};

/** Condition options from product.variantNames: [{ slug, label }]. */
function optionsFromVariantNames(variantNames) {
    if (!Array.isArray(variantNames)) return [];
    const entry = variantNames.find((vn) => vn && isConditionKey(vn.name, vn.attributeSlug));
    if (!entry || !Array.isArray(entry.options)) return [];
    const out = [];
    for (const opt of entry.options) {
        if (!opt) continue;
        const raw = typeof opt === 'string' ? { value: opt } : opt;
        const label = String(raw.value || raw.name || raw.option || '').trim();
        const slug = normSlug(raw.slug || label);
        if (!label || !slug || out.some((o) => o.slug === slug)) continue;
        out.push({ slug, label });
    }
    return out;
}

/** Condition attribute on a variant (structured attributes), if any. */
function conditionFromAttributes(variant) {
    if (!Array.isArray(variant.attributes)) return null;
    const attr = variant.attributes.find(
        (a) => a && isConditionKey(a.attributeSlug, a.attributeName) && String(a.value || '').trim()
    );
    if (!attr) return null;
    const label = String(attr.value).trim();
    return { slug: normSlug(attr.valueSlug || label), label };
}

/** Match a variant to a condition option via its hyphen-joined name/slug (longest match wins, so "very-good" beats "good"). */
function conditionFromName(variant, options) {
    const haystacks = [variant.name, variant.slug]
        .map((s) => variantNameToSeoSlug(String(s || '')))
        .filter(Boolean)
        .map((s) => `-${s}-`);
    if (haystacks.length === 0) return null;
    let best = null;
    for (const opt of options) {
        if (haystacks.some((h) => h.includes(`-${opt.slug}-`))) {
            if (!best || opt.slug.length > best.slug.length) best = opt;
        }
    }
    return best;
}

const variantListPrice = (v) => {
    const price = Number(v.Price);
    return Number.isFinite(price) && price > 0 ? price : null;
};

const variantLinkSlug = (v) =>
    String(v.slug || '').trim() || variantNameToSeoSlug(String(v.name || '')) || '';

/**
 * Per-condition card data for listings: each condition becomes its own card with its
 * own price, stock and a link to a variant in that condition.
 * Shown price = cheapest in-stock variant, else cheapest variant overall.
 */
function buildConditionListing(cond, variants) {
    let best = null; // { v, price, inStock }
    let minList = null;
    let inStockCount = 0;
    for (const v of variants) {
        const qty = Number(v.Quantity) || 0;
        const inStock = qty > 0;
        if (inStock) inStockCount += 1;
        const list = variantListPrice(v);
        if (list != null && (minList == null || list < minList)) minList = list;
        const price = variantUnitPrice(v);
        if (price == null) continue;
        const better =
            !best ||
            (inStock && !best.inStock) ||
            (inStock === best.inStock && price < best.price);
        if (better) best = { v, price, inStock };
    }
    const linkVariant = best ? best.v : variants[0];
    return {
        label: cond.label,
        slug: cond.slug,
        price: best ? best.price : null,
        originalPrice: best ? variantListPrice(best.v) || best.price : minList,
        minPrice: minList,
        inStock: inStockCount > 0,
        inStockCount,
        variantCount: variants.length,
        variantSlug: linkVariant ? variantLinkSlug(linkVariant) : '',
    };
}

/**
 * @returns {{ conditions: string[], cheapestCondition: string|null, conditionListings: object[] }}
 */
function summarizeConditions(product) {
    const p = product || {};
    const options = optionsFromVariantNames(p.variantNames);
    const variants = (Array.isArray(p.variantValues) ? p.variantValues : []).filter(isActiveVariant);

    const found = new Map(); // slug -> label
    const byCondition = new Map(); // slug -> variants
    let cheapest = null;
    for (const v of variants) {
        // variantNames options are what the product page shows, so prefer them
        let cond = options.length ? conditionFromName(v, options) : null;
        if (!cond) {
            const fromAttr = conditionFromAttributes(v);
            if (fromAttr) cond = options.find((o) => o.slug === fromAttr.slug) || fromAttr;
        }
        if (!cond) continue;
        if (!found.has(cond.slug)) found.set(cond.slug, cond.label);
        if (!byCondition.has(cond.slug)) byCondition.set(cond.slug, []);
        byCondition.get(cond.slug).push(v);

        const qty = Number(v.Quantity) || 0;
        const price = variantUnitPrice(v);
        if (qty > 0 && price != null && (!cheapest || price < cheapest.price)) {
            cheapest = { price, label: cond.label };
        }
    }

    let list = [...found.entries()].map(([slug, label]) => ({ slug, label }));
    // Variants exist but none could be matched: show the product page's options
    if (list.length === 0 && options.length) list = options;
    if (list.length === 0 && String(p.condition || '').trim()) {
        const label = String(p.condition).trim();
        list = [{ slug: normSlug(label), label }];
    }

    const sorted = list
        .map((c, i) => ({ ...c, i }))
        .sort((a, b) => conditionRank(a.slug) - conditionRank(b.slug) || a.i - b.i);
    const conditions = sorted.map((c) => c.label);

    // Only conditions that actually have variants get their own listing card.
    const conditionListings = sorted
        .filter((c) => byCondition.has(c.slug))
        .map((c) => buildConditionListing(c, byCondition.get(c.slug)));

    return { conditions, cheapestCondition: cheapest ? cheapest.label : null, conditionListings };
}

/**
 * Adds `conditions` + `cheapestCondition` to each product (returns new objects).
 * `variantsKey` reads variants from another field (e.g. a slim projection);
 * `omit` lists top-level fields to drop afterwards (only fetched for this);
 * `omitVariantFields` drops per-variant fields likewise.
 */
function attachConditions(products, { variantsKey, omit = [], omitVariantFields = [] } = {}) {
    return (products || []).map((product) => {
        const source = variantsKey ? { ...product, variantValues: product[variantsKey] } : product;
        const out = { ...product, ...summarizeConditions(source) };
        for (const key of omit) delete out[key];
        if (omitVariantFields.length && Array.isArray(out.variantValues)) {
            out.variantValues = out.variantValues.map((v) => {
                const copy = { ...v };
                for (const key of omitVariantFields) delete copy[key];
                return copy;
            });
        }
        return out;
    });
}

// For aggregates that projected `variantNames` + `conditionVariants` only for this.
const attachProjectedConditions = (products) =>
    attachConditions(products, { variantsKey: 'conditionVariants', omit: ['variantNames', 'conditionVariants'] });

// Aggregation helpers: condition-only attributes keep the projection small.
const conditionAttributesExpr = (attributesPath) => ({
    $filter: {
        input: { $ifNull: [attributesPath, []] },
        as: 'a',
        cond: {
            $or: [
                { $regexMatch: { input: { $toString: { $ifNull: ['$$a.attributeSlug', ''] } }, regex: 'condition', options: 'i' } },
                { $regexMatch: { input: { $toString: { $ifNull: ['$$a.attributeName', ''] } }, regex: 'condition', options: 'i' } },
            ],
        },
    },
});

// Slim variants for summarizeConditions in $project (for endpoints that don't return variants).
const conditionVariantsProjection = {
    $map: {
        input: { $ifNull: ['$variantValues', []] },
        as: 'v',
        in: {
            name: '$$v.name',
            slug: '$$v.slug',
            status: '$$v.status',
            Quantity: '$$v.Quantity',
            Price: '$$v.Price',
            salePrice: '$$v.salePrice',
            attributes: conditionAttributesExpr('$$v.attributes'),
        },
    },
};

/** $match clause: product sold in a condition matching `regex` (variantNames option or variant attribute). */
function conditionMatchClauses(regex) {
    return [
        { condition: { $regex: regex } },
        {
            variantNames: {
                $elemMatch: {
                    $or: [{ name: { $regex: /condition/i } }, { attributeSlug: { $regex: /condition/i } }],
                    'options.value': { $regex: regex },
                },
            },
        },
        {
            'variantValues.attributes': {
                $elemMatch: {
                    $or: [{ attributeSlug: { $regex: /condition/i } }, { attributeName: { $regex: /condition/i } }],
                    value: { $regex: regex },
                },
            },
        },
    ];
}

module.exports = {
    summarizeConditions,
    attachConditions,
    attachProjectedConditions,
    conditionAttributesExpr,
    conditionVariantsProjection,
    conditionMatchClauses,
};
