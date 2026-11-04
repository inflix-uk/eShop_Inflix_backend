/**
 * "Prices & Content" spreadsheet: export variant prices / identifiers and product
 * descriptions / perks, edit them in Excel, and import them back.
 *
 * Rows are matched by product _id and variant _id (SKUs repeat across products and
 * some variants have none), so the import can only ever touch the exact variant a
 * row came from. Blank cells keep the stored value. Variants are never added,
 * removed or renamed here — use the product form or the full product import for that.
 */
const mongoose = require('mongoose');
const Product = require('../../models/product');

const VARIANT_NUMBER_FIELDS = [
    ['cost', 'Cost'],
    ['price', 'Price'],
    ['salePrice', 'salePrice'],
    ['quantity', 'Quantity'],
];
const VARIANT_TEXT_FIELDS = [
    ['sku', 'SKU'],
    ['ean', 'EIN'],
    ['mpn', 'MPN'],
];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const asText = (v) => (v === undefined || v === null ? '' : String(v).trim());
// Text compared the way Excel hands it back: trimmed, Windows line endings folded.
const foldLines = (v) => asText(v).replace(/\r\n?/g, '\n');
const sameText = (a, b) => foldLines(a) === foldLines(b);

function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const cleaned = String(value).replace(/[£$€,\s]/g, '');
    if (cleaned === '') return NaN;
    return Number(cleaned);
}

function parseYesNo(value) {
    const v = asText(value).toLowerCase();
    if (['yes', 'y', 'true', '1', 'on'].includes(v)) return true;
    if (['no', 'n', 'false', '0', 'off'].includes(v)) return false;
    return null;
}

/** Stored "null"/"undefined" text (old import bug) reads as empty. */
function cleanStored(value) {
    if (value === undefined || value === null) return '';
    const s = String(value);
    return ['null', 'undefined'].includes(s.trim().toLowerCase()) ? '' : s;
}

/**
 * Where the product description that the website shows actually lives.
 * The website renders Product_description_blocks when there are any, otherwise
 * Product_description. Blocks are editable here only when they hold exactly one
 * text block (true for nearly every product); anything richer stays in the admin.
 */
function descriptionSource(product) {
    const blocks = product.Product_description_blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) {
        return { editable: true, path: 'Product_description', value: cleanStored(product.Product_description) };
    }
    const textBlocks = [];
    blocks.forEach((row, r) => {
        if (row && row.type === 'row' && Array.isArray(row.columns)) {
            row.columns.forEach((col, c) => {
                (col.blocks || []).forEach((b, i) => {
                    textBlocks.push({ block: b, path: `Product_description_blocks.${r}.columns.${c}.blocks.${i}.content` });
                });
            });
        } else if (row) {
            textBlocks.push({ block: row, path: `Product_description_blocks.${r}.content` });
        }
    });
    if (textBlocks.length === 1 && textBlocks[0].block && textBlocks[0].block.type === 'text') {
        return { editable: true, path: textBlocks[0].path, value: cleanStored(textBlocks[0].block.content) };
    }
    return { editable: false, path: null, value: '' };
}

async function exportSheet({ ids } = {}) {
    const filter = { isdeleted: { $ne: true } };
    if (Array.isArray(ids) && ids.length > 0) {
        filter._id = { $in: ids.filter(isValidId) };
    }
    const products = await Product.find(filter)
        .select('name producturl brand status Product_summary Product_description Product_description_blocks perks_and_benefits variantValues productType')
        .sort({ brand: 1, name: 1 })
        .lean();

    const variants = [];
    const content = [];
    for (const p of products) {
        const productId = String(p._id);
        (p.variantValues || []).forEach((v) => {
            variants.push({
                productId,
                productName: p.name || '',
                variantId: String(v._id),
                variant: v.name || '',
                sku: cleanStored(v.SKU),
                ean: cleanStored(v.EIN),
                mpn: cleanStored(v.MPN),
                cost: v.Cost ?? '',
                price: v.Price ?? '',
                salePrice: isBlank(v.salePrice) ? '' : v.salePrice,
                quantity: v.Quantity ?? '',
                active: v.status === false ? 'No' : 'Yes',
            });
        });
        const desc = descriptionSource(p);
        const perks = p.perks_and_benefits || {};
        content.push({
            productId,
            productName: p.name || '',
            productUrl: p.producturl || '',
            summary: cleanStored(p.Product_summary),
            description: desc.value,
            descriptionEditable: desc.editable,
            perksEnabled: perks.status ? 'Yes' : 'No',
            perks: cleanStored(perks.description),
        });
    }
    return { products: products.length, variants, content };
}

/**
 * Apply edited rows. Body shape:
 *   { variants: [{ row, productId, variantId, sku, ean, mpn, cost, price, salePrice, quantity, active }],
 *     content:  [{ row, productId, summary, description, perksEnabled, perks }],
 *     dryRun }
 * Returns a change list and per-row errors; with dryRun nothing is written.
 */
async function importSheet({ variants = [], content = [], dryRun = true } = {}) {
    const errors = [];
    const warnings = [];
    const changes = [];
    const productIds = new Set();
    variants.forEach((r) => isValidId(asText(r.productId)) && productIds.add(asText(r.productId)));
    content.forEach((r) => isValidId(asText(r.productId)) && productIds.add(asText(r.productId)));

    const products = await Product.find({ _id: { $in: [...productIds] } })
        .select('name isdeleted Product_summary Product_description Product_description_blocks perks_and_benefits variantValues')
        .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));

    // productId -> { $set }
    const sets = new Map();
    const setFor = (pid) => {
        if (!sets.has(pid)) sets.set(pid, {});
        return sets.get(pid);
    };
    const record = (product, variantName, field, from, to) => {
        changes.push({ product: product.name || String(product._id), variant: variantName || '', field, from, to });
    };

    // ---- Variant prices ----
    variants.forEach((r) => {
        const row = r.row;
        const pid = asText(r.productId);
        const vid = asText(r.variantId);
        const product = byId.get(pid);
        if (!product || product.isdeleted) {
            errors.push({ sheet: 'Variant Prices', row, message: 'Product not found (keep the product_id column from the export)' });
            return;
        }
        const list = product.variantValues || [];
        let index = list.findIndex((v) => String(v._id) === vid);
        if (index === -1 && !isBlank(r.variant)) {
            // Saving the product form used to give every variant a new id, so a sheet
            // exported before that save no longer matches by id. Fall back to the
            // variant name, but only when exactly one variant has it.
            const name = asText(r.variant).toLowerCase();
            const same = list.map((v, i) => (asText(v.name).toLowerCase() === name ? i : -1)).filter((i) => i !== -1);
            if (same.length === 1) index = same[0];
        }
        if (index === -1) {
            errors.push({ sheet: 'Variant Prices', row, message: `Variant not found on "${product.name}" (keep the variant_id column from the export)` });
            return;
        }
        const variant = product.variantValues[index];
        const $set = setFor(pid);

        for (const [key, field] of VARIANT_NUMBER_FIELDS) {
            if (isBlank(r[key])) continue;
            const n = parseNumber(r[key]);
            if (!Number.isFinite(n) || n < 0) {
                errors.push({ sheet: 'Variant Prices', row, message: `${key} "${r[key]}" is not a valid number` });
                continue;
            }
            // Keep the number exactly as typed: some stored prices have 3 decimals
            // and rounding here would change them without anyone editing the cell.
            const value = field === 'Quantity' ? Math.round(n) : n;
            const current = isBlank(variant[field]) ? null : Number(variant[field]);
            if (current !== value) {
                $set[`variantValues.${index}.${field}`] = value;
                record(product, variant.name, field, current, value);
            }
        }
        for (const [key, field] of VARIANT_TEXT_FIELDS) {
            if (isBlank(r[key])) continue;
            const value = asText(r[key]);
            const current = cleanStored(variant[field]);
            if (current !== value) {
                $set[`variantValues.${index}.${field}`] = value;
                record(product, variant.name, field === 'EIN' ? 'EAN' : field, current, value);
            }
        }
        // Flag prices that look like placeholders; they are still applied if confirmed.
        const valueAfter = (field) => ($set[`variantValues.${index}.${field}`] ?? variant[field]);
        const price = Number(valueAfter('Price'));
        const sale = Number(valueAfter('salePrice'));
        const touched = ['Price', 'salePrice'].some((f) => `variantValues.${index}.${f}` in $set);
        if (touched && price > 0 && sale > 0) {
            if (sale >= price) {
                warnings.push({ sheet: 'Variant Prices', row, message: `sale price ${sale} is not below price ${price} — it will not show as a sale` });
            } else if (sale < price * 0.3) {
                warnings.push({ sheet: 'Variant Prices', row, message: `sale price ${sale} is more than 70% below price ${price} — check it is not a placeholder` });
            }
        }
        if (!isBlank(r.active)) {
            const on = parseYesNo(r.active);
            if (on === null) {
                errors.push({ sheet: 'Variant Prices', row, message: `active must be Yes or No, got "${r.active}"` });
            } else if ((variant.status !== false) !== on) {
                $set[`variantValues.${index}.status`] = on;
                record(product, variant.name, 'Active', variant.status !== false ? 'Yes' : 'No', on ? 'Yes' : 'No');
            }
        }
    });

    // ---- Descriptions & perks ----
    content.forEach((r) => {
        const row = r.row;
        const pid = asText(r.productId);
        const product = byId.get(pid);
        if (!product || product.isdeleted) {
            errors.push({ sheet: 'Descriptions & Perks', row, message: 'Product not found (keep the product_id column from the export)' });
            return;
        }
        const $set = setFor(pid);
        if (!isBlank(r.summary) && !sameText(r.summary, cleanStored(product.Product_summary))) {
            $set.Product_summary = asText(r.summary);
            record(product, '', 'Summary', '(changed)', '(changed)');
        }
        if (!isBlank(r.description)) {
            const desc = descriptionSource(product);
            if (!desc.editable) {
                errors.push({ sheet: 'Descriptions & Perks', row, message: `"${product.name}" uses a multi-part description; edit it in the product form` });
            } else if (!sameText(r.description, desc.value)) {
                $set[desc.path] = asText(r.description);
                record(product, '', 'Description', '(changed)', '(changed)');
            }
        }
        const perks = product.perks_and_benefits || {};
        if (!isBlank(r.perksEnabled)) {
            const on = parseYesNo(r.perksEnabled);
            if (on === null) {
                errors.push({ sheet: 'Descriptions & Perks', row, message: `perks_enabled must be Yes or No, got "${r.perksEnabled}"` });
            } else if (!!perks.status !== on) {
                $set['perks_and_benefits.status'] = on;
                record(product, '', 'Perks shown', perks.status ? 'Yes' : 'No', on ? 'Yes' : 'No');
            }
        }
        if (!isBlank(r.perks) && !sameText(r.perks, cleanStored(perks.description))) {
            $set['perks_and_benefits.description'] = asText(r.perks);
            record(product, '', 'Perks text', '(changed)', '(changed)');
        }
    });

    const toWrite = [...sets.entries()].filter(([, $set]) => Object.keys($set).length > 0);
    if (!dryRun && toWrite.length > 0) {
        await Product.bulkWrite(
            toWrite.map(([pid, $set]) => ({
                updateOne: { filter: { _id: pid }, update: { $set: { ...$set, updatedAt: new Date() } } },
            }))
        );
    }

    return {
        dryRun: !!dryRun,
        productsChanged: toWrite.length,
        changeCount: changes.length,
        changes: changes.slice(0, 500),
        errors,
        warnings: warnings.slice(0, 200),
        warningCount: warnings.length,
    };
}

module.exports = { exportSheet, importSheet, descriptionSource, parseNumber };
