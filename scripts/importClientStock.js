/**
 * One-off bulk import of the client's two stock workbooks into the product
 * catalogue.
 *
 *   Used Products Couple .xlsx        -> sheet "Website Catalogue"  (44 rows, richly specced)
 *   Stocklist Brand New and Grade.xlsx-> sheet "Top 100 Combined"  (100 rows, thin)
 *
 * The two files describe the same catalogue in different shapes, so both are
 * normalised into the SAME payload the admin panel's CSV parser produces and
 * handed to the existing importProducts service. That service is idempotent on
 * `producturl`, validates against the live reference collections and merges on
 * update — re-running this script after a correction is safe and expected.
 *
 * Usage (from the backend directory):
 *   node scripts/importClientStock.js --seed        # create the reference data the rows need
 *   node scripts/importClientStock.js --dry-run     # validate every row, write nothing
 *   node scripts/importClientStock.js --commit      # write the products
 *   node scripts/importClientStock.js --seed --commit
 *
 *   --file=used|new|both   (default both)
 *   --report=<path>        write the per-row report as JSON
 *
 * Decisions taken with the client (see REPORT NOTES at the bottom of the run):
 *  - Neither workbook contains a price. Every product is created UNPUBLISHED
 *    (status:false) with Price/Cost/salePrice null, so nothing can be sold at
 *    zero. Prices are filled in later via the admin panel or a re-run.
 *  - Category = manufacturer (matching the existing "Apple" category),
 *    subcategory = device type, brand = manufacturer.
 *  - Where a row lists several grades without a per-grade unit split (the Used
 *    file), the whole quantity goes on the highest grade and the other grades
 *    get 0. Those rows are listed under "needsStockSplit" in the report.
 *    The Brand-New file states its per-grade counts explicitly, so those split
 *    exactly.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const ProductCategory = require('../src/models/productCategories');
const ProductTag = require('../src/models/productTags');
const VariantAttribute = require('../src/models/VariantAttribute');
const importProductsService = require('../src/services/productService/importProducts');
const { toSeoSlug } = require('../src/utils/slugUtils');

/** exceljs is not a backend dependency; the admin panel ships it. */
function loadExcelJS() {
    try {
        return require('exceljs');
    } catch {
        const { createRequire } = require('module');
        const adminRequire = createRequire(
            path.join(__dirname, '..', '..', 'eShop_Inflix_adminpanle', 'package.json')
        );
        return adminRequire('exceljs');
    }
}

const DOWNLOADS = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads');
const USED_FILE = process.env.USED_FILE || path.join(DOWNLOADS, 'Used Products Couple .xlsx');
const NEW_FILE = process.env.NEW_FILE || path.join(DOWNLOADS, 'Stocklist Brand New and Grade.xlsx');

// ---------------------------------------------------------------- helpers ---

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const low = (v) => norm(v).toLowerCase();

/** Cells the client uses to mean "we don't know" — never import these as data. */
const PLACEHOLDER = new Set([
    '', 'n/a', 'na', 'none', 'not specified', 'not verified', 'not stated',
    'unspecified', '-', '—', 'tbc',
]);
const real = (v) => (PLACEHOLDER.has(low(v)) ? '' : norm(v));

function cellVal(cell) {
    const v = cell && cell.value;
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
        if (Array.isArray(v.richText)) return norm(v.richText.map((r) => r.text).join(''));
        if (v.text) return norm(v.text);
        if (v.result !== undefined) return norm(v.result);
        if (v.hyperlink) return norm(v.hyperlink);
        return '';
    }
    return norm(v);
}

function readSheet(worksheet) {
    const header = [];
    const headerRow = worksheet.getRow(1);
    for (let c = 1; c <= worksheet.columnCount; c += 1) header.push(cellVal(headerRow.getCell(c)));

    const rows = [];
    for (let r = 2; r <= worksheet.rowCount; r += 1) {
        const row = worksheet.getRow(r);
        const record = { __line: r };
        let populated = false;
        header.forEach((h, i) => {
            const value = cellVal(row.getCell(i + 1));
            if (value) populated = true;
            record[h || `col${i + 1}`] = value;
        });
        if (populated) rows.push(record);
    }
    return rows;
}

// ------------------------------------------------------- domain vocabulary ---

/** Manufacturer spellings vary by row ("SAMSUNG", "Samsung ", "ONE PLUS"). */
const MANUFACTURERS = {
    apple: 'Apple',
    samsung: 'Samsung',
    google: 'Google',
    huawei: 'Huawei',
    xiaomi: 'Xiaomi',
    redmi: 'Xiaomi',          // Redmi is Xiaomi's sub-brand — merged, see report
    poco: 'Xiaomi',
    nokia: 'Nokia',
    hmd: 'Nokia',
    jbl: 'JBL',
    oppo: 'Oppo',
    oneplus: 'OnePlus',
    'one plus': 'OnePlus',
};

function manufacturerOf(raw, productName) {
    const key = low(raw).replace(/\s+/g, ' ');
    if (MANUFACTURERS[key]) return MANUFACTURERS[key];
    if (MANUFACTURERS[key.replace(/\s+/g, '')]) return MANUFACTURERS[key.replace(/\s+/g, '')];
    // Fall back to the first word of the product name.
    const first = low(productName).split(' ')[0];
    return MANUFACTURERS[first] || (norm(raw) ? norm(raw) : null);
}

/**
 * Device type drives the subcategory. Order matters — "Galaxy Tab Active Pro"
 * must match Tablets before the generic phone fallback.
 */
const DEVICE_RULES = [
    // "(?<!free )case" so a phone bundled "With Free Case" stays a phone.
    [/\bairtag\b|(?<!free )\bcase\b|\bbumper\b|\bcharger\b|\badapter\b|\bcable\b/i, 'Accessories'],
    [/\bearbud|\bheadphone|\bheadset\b|\bairpods\b|\bbuds\b|\bspeaker\b|\bvibe\b/i, 'Audio'],
    [/\bwatch\b/i, 'Smartwatches'],
    [/\bipad\b|\btab\b/i, 'Tablets'],
    [/\bipod\b/i, 'Media Players'],
    [/\bnokia (105|110|225|3210|2660)\b|\bflip\b/i, 'Feature Phones'],
];

function deviceTypeOf(productName) {
    for (const [pattern, type] of DEVICE_RULES) {
        if (pattern.test(productName)) return type;
    }
    return 'Smartphones';
}

/**
 * Condition vocabulary. The client's own Summary sheet defines the mapping:
 * A+ = Excellent, A = Very Good, B = Good, C = Fair. "New" and "CPO" come
 * from the Brand-New file. Ranked best-first: the whole quantity of an
 * unsplit multi-grade row goes on the first grade listed here.
 */
const CONDITION_ORDER = ['Brand New', 'Excellent', 'Very Good', 'Good', 'Fair', 'CPO', 'Ungraded'];
const CONDITION_ALIASES = {
    new: 'Brand New',
    'brand new': 'Brand New',
    'a+': 'Excellent',
    excellent: 'Excellent',
    pristine: 'Excellent',
    a: 'Very Good',
    'very good': 'Very Good',
    b: 'Good',
    good: 'Good',
    c: 'Fair',
    fair: 'Fair',
    cpo: 'CPO',
    'not stated': 'Ungraded',
};

const conditionOf = (raw) => CONDITION_ALIASES[low(raw)] || null;
const rankCondition = (name) => {
    const i = CONDITION_ORDER.indexOf(name);
    return i === -1 ? CONDITION_ORDER.length : i;
};

/**
 * The Brand-New file encodes grades two ways in one column:
 *   "New"
 *   "A+ (Excellent) – 9 units; B (Good) – 1 units"
 *   "CPO (CPO) – 7 units"
 * and the Used file uses a plain comma list: "Very good, Good, Fair".
 * Returns [{ condition, quantity|null }] best grade first.
 */
function parseGrades(raw) {
    const text = norm(raw);
    if (!text) return [{ condition: 'Ungraded', quantity: null }];

    // Graded form with explicit unit counts.
    if (/\d+\s*units?/i.test(text)) {
        const out = [];
        text.split(';').forEach((chunk) => {
            const m = chunk.match(/^\s*([^(]+?)\s*(?:\(([^)]*)\))?\s*[–-]\s*([\d.]+)\s*units?/i);
            if (!m) return;
            const condition = conditionOf(m[2]) || conditionOf(m[1]) || 'Ungraded';
            out.push({ condition, quantity: Math.round(Number(m[3]) || 0) });
        });
        if (out.length) return out.sort((a, b) => rankCondition(a.condition) - rankCondition(b.condition));
    }

    // Plain comma list, no per-grade counts.
    const parts = text.split(',').map(norm).filter(Boolean);
    const conditions = [...new Set(parts.map((p) => conditionOf(p) || 'Ungraded'))];
    return conditions
        .sort((a, b) => rankCondition(a) - rankCondition(b))
        .map((condition) => ({ condition, quantity: null }));
}

/**
 * Half the Brand-New rows are shouted ("APPLE IPHONE 17e 256GB WHITE"), which
 * reads badly as a storefront title. Title-case only those, preserving the
 * tokens that are legitimately upper-case (model codes, 5G, 256GB, roman-ish
 * suffixes) and restoring Apple's lower-case product prefixes.
 */
const KEEP_UPPER = /^(?:\d+(?:GB|TB|MP|W|MAH)|[45]G|DS|FE|XL|SE|LTE|NFC|OLED|LCD|CPO|EE|UK|SM-[A-Z0-9/]+|TA-?\s?\d+|[A-Z]{1,3}\d[A-Z0-9/-]*)$/;

function tidyTitle(raw) {
    const text = norm(raw);
    const letters = text.replace(/[^A-Za-z]/g, '');
    const upperRatio = letters ? (text.match(/[A-Z]/g) || []).length / letters.length : 0;
    let out = text;

    if (upperRatio > 0.7 && letters.length > 3) {
        out = text
            .split(' ')
            .map((word) => {
                if (KEEP_UPPER.test(word)) return word;
                if (/\d/.test(word) && /[A-Z]/.test(word)) return word; // model codes
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    return out
        .replace(/\bIphone\b/g, 'iPhone')
        .replace(/\bIpad\b/g, 'iPad')
        .replace(/\bIpod\b/g, 'iPod')
        .replace(/\bMacbook\b/g, 'MacBook')
        .replace(/\b(\d+)\s?gb\b/gi, '$1GB')
        .replace(/\b(\d+)\s?tb\b/gi, '$1TB')
        .replace(/\b([45])g\b/gi, '$1G')
        .replace(/\benterprise edition\b/gi, 'Enterprise Edition')
        .replace(/\bwifi\b/gi, 'Wi-Fi')
        // "Teal- Global Spec" -> "Teal - Global Spec"; leaves "Wi-Fi" alone.
        .replace(/(\w)-\s+/g, '$1 - ');
}

/**
 * Non-colliding producturl across the whole run and the live catalogue.
 * toSeoSlug drops "+", which would silently collapse "Galaxy S10+ 128GB" onto
 * "Galaxy S10 128GB" — two different phones — so spell it out first.
 */
function makeSlug(name, taken) {
    const base = toSeoSlug(name.replace(/\+/g, ' plus ')) || 'product';
    let slug = base;
    let n = 2;
    while (taken.has(slug)) {
        slug = `${base}-${n}`;
        n += 1;
    }
    taken.add(slug);
    return slug;
}

const specPair = (key, value) => (real(value) ? { key, value: real(value) } : null);

/** SKUs must be stable across re-runs: derived from the slug, not a counter. */
const skuFor = (slug, condition) =>
    `${slug}-${toSeoSlug(condition)}`.toUpperCase().replace(/-/g, '-').slice(0, 60);

// ------------------------------------------------------------- row mapping ---

/**
 * Build the group payload shared by both files, then let each file supply its
 * own specs/description. Returns the exact shape parseProductCsv() produces.
 */
function buildProduct({
    name, slug, manufacturer, deviceType, grades, totalQuantity,
    summary, description, specs, tags, mpn, ean, sourceLabel, line,
}) {
    const notes = [];
    const usable = grades.length ? grades : [{ condition: 'Ungraded', quantity: null }];
    const splitKnown = usable.every((g) => g.quantity !== null);

    // Unknown split: everything on the best grade, zero elsewhere. Never guess.
    let quantities;
    if (splitKnown) {
        quantities = usable.map((g) => g.quantity);
    } else {
        quantities = usable.map((_, i) => (i === 0 ? (totalQuantity ?? 0) : 0));
        if (usable.length > 1) {
            notes.push(
                `${usable.length} grades (${usable.map((g) => g.condition).join(', ')}) but no per-grade ` +
                `unit split in the file — all ${totalQuantity ?? 0} units placed on "${usable[0].condition}".`
            );
        }
    }

    // A few rows are graded "New" but named "(Renewed)" — contradictory source
    // data we must surface rather than silently pick a side.
    if (usable.every((g) => g.condition === 'Brand New') && /\brenewed\b|\brefurb/i.test(name)) {
        notes.push('Graded "New" in the file but the product name says renewed/refurbished — condition needs confirming.');
    }

    const type = usable.length > 1 ? 'variant' : 'single';

    const variants = usable.map((g, i) => ({
        name: type === 'single' ? 'single' : g.condition,
        attributes: [{ attributeSlug: 'conditions', value: g.condition }],
        Cost: null,
        Price: null,       // no price anywhere in the source files
        salePrice: null,
        Quantity: quantities[i] ?? 0,
        SKU: skuFor(slug, g.condition),
        EIN: ean || null,
        MPN: mpn || null,
        imageUrls: [],
    }));

    const variantNames = type === 'variant'
        ? [{
            name: 'conditions',
            attributeSlug: 'conditions',
            hasModels: false,
            options: usable.map((g) => ({ value: g.condition })),
        }]
        : [];

    return {
        payload: {
            producturl: slug,
            name,
            productType: { type },
            status: false,                       // never publish a product with no price
            category: manufacturer,
            subCategory: JSON.stringify({ [manufacturer]: [deviceType] }),
            brand: manufacturer,
            condition: usable[0].condition,
            tags: tags.join(','),
            mainCategory: manufacturer,
            Product_summary: summary || null,
            Product_description: description || null,
            product_Specifications: specs.filter(Boolean),
            Seo_Meta: {
                metaTitle: name.slice(0, 70),
                metaDescription: (description || summary || name).slice(0, 160),
                metaKeywords: [manufacturer, deviceType, ...tags].join(', '),
                metaSchemas: [],
            },
            thumbnailUrl: null,
            galleryUrls: [],
            is_featured: null,
            is_authenticated: null,
            low_stock_quantity_alert: null,
            comesWithItems: [],
            topSectionItems: [],
            variants,
            variantNames,
        },
        meta: {
            source: sourceLabel,
            line,
            name,
            producturl: slug,
            manufacturer,
            deviceType,
            grades: usable.map((g) => g.condition),
            totalQuantity: quantities.reduce((s, q) => s + (q || 0), 0),
            notes,
        },
    };
}

/** "Used Products Couple .xlsx" — 28 spec columns per row. */
function mapUsedRow(row, taken) {
    const name = tidyTitle(row.Product || row['Product Description']);
    if (!name) return null;

    const manufacturer = manufacturerOf(row.Brand, name);
    const deviceType = deviceTypeOf(name);
    const slug = makeSlug(name, taken);
    const grades = parseGrades(row.Grade);
    const totalQuantity = Math.round(Number(row.Qty) || 0);

    const specs = [
        specPair('Storage', row.Storage),
        specPair('Colour', row.Colour),
        specPair('Display', row.Display),
        specPair('Screen Size', row.Size),
        specPair('Operating System', row.OS),
        specPair('Chipset', row.Chipset),
        specPair('CPU', row.CPU),
        specPair('GPU', row.GPU),
        specPair('Internal Memory', row['Internal Memory']),
        specPair('Main Camera', row['Main Camera']),
        specPair('SIM', row.SIM),
        specPair('Resolution', row.Resolution),
        specPair('Battery', row['Battery Type']),
        specPair('Connector', row.Connector),
        specPair('Network', row.Network),
        specPair('SD Card Slot', row['SD Card Slot']),
        specPair('Launch Year', row['Launch Year']),
        specPair('Weight', row.Weight),
        specPair('Manufacturer Code', row['Manufacturer Code']),
        specPair('EAN', row.EAN),
        specPair('Stock ID', row['Stock ID']),
    ];

    const tags = ['Used', deviceType];

    return buildProduct({
        name,
        slug,
        manufacturer,
        deviceType,
        grades,
        totalQuantity,
        summary: real(row['Product Description']) || null,
        description: real(row['Website Product Description']) || null,
        specs,
        tags,
        mpn: real(row['Manufacturer Code']),
        ean: (real(row.EAN).split(',')[0] || '').trim(),
        sourceLabel: 'Used Products Couple',
        line: row.__line,
    });
}

/** "Stocklist Brand New and Grade.xlsx" — 9 thin columns per row. */
function mapNewRow(row, taken) {
    const name = tidyTitle(row.Product);
    if (!name) return null;

    const manufacturer = manufacturerOf(row.Manufacturer, name);
    const deviceType = deviceTypeOf(name);
    const slug = makeSlug(name, taken);
    const grades = parseGrades(row.Grade);
    const totalQuantity = Math.round(Number(row.Qty) || 0);

    const specs = [
        specPair('Storage', row.Storage),
        specPair('Colour', row.Colour),
        specPair('Product Code', row['Product Code']),
        specPair('EAN', row.EAN),
    ];

    const isBrandNew = grades.every((g) => g.condition === 'Brand New');
    const tags = [isBrandNew ? 'Brand New' : 'Refurbished', deviceType, 'Top 100'];

    // The file has no prose. Assemble a factual sentence from the known cells
    // rather than leaving the product page blank.
    const bits = [];
    if (real(row.Storage)) bits.push(`${real(row.Storage)} storage`);
    if (real(row.Colour)) bits.push(`${real(row.Colour)} finish`);
    const conditionText = isBrandNew
        ? 'Supplied brand new and sealed.'
        : `Professionally graded refurbished stock (${grades.map((g) => g.condition).join(', ')}).`;
    const description = [
        `${name}${bits.length ? ` with ${bits.join(' and ')}` : ''}.`,
        conditionText,
        real(row['Product Code']) ? `Manufacturer code ${real(row['Product Code'])}.` : '',
    ].filter(Boolean).join(' ');

    return buildProduct({
        name,
        slug,
        manufacturer,
        deviceType,
        grades,
        totalQuantity,
        summary: real(row['Why Hot']) || null,
        description,
        specs,
        tags,
        mpn: real(row['Product Code']),
        ean: (real(row.EAN).split(',')[0] || '').trim(),
        sourceLabel: 'Stocklist Brand New and Grade',
        line: row.__line,
    });
}

// ------------------------------------------------------------ reference data ---

/**
 * The importer rejects rows whose category / variant-attribute values do not
 * exist, so the vocabulary the files use has to be created first. Everything
 * here is additive: existing docs are extended, never replaced.
 */
async function seedReference(products, { commit }) {
    const categories = new Map();   // manufacturer -> Set(deviceType)
    const conditions = new Set();
    const tags = new Set();

    products.forEach(({ payload, meta }) => {
        if (!categories.has(meta.manufacturer)) categories.set(meta.manufacturer, new Set());
        categories.get(meta.manufacturer).add(meta.deviceType);
        meta.grades.forEach((g) => conditions.add(g));
        payload.tags.split(',').filter(Boolean).forEach((t) => tags.add(t));
    });

    const summary = { categories: [], subCategories: [], conditions: [], brands: [], tags: [] };

    // --- categories (+ their device-type subcategories) ---
    for (const [name, subs] of categories) {
        const existing = await ProductCategory.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (existing) {
            const have = new Set((existing.subCategory || []).map(low));
            const missing = [...subs].filter((s) => !have.has(low(s)));
            if (missing.length) {
                summary.subCategories.push(`${name}: +${missing.join(', ')}`);
                if (commit) {
                    existing.subCategory = [...(existing.subCategory || []), ...missing];
                    existing.updatedAt = new Date();
                    await existing.save();
                }
            }
            continue;
        }
        summary.categories.push(name);
        if (commit) {
            await new ProductCategory({
                name,
                slug: toSeoSlug(name),
                subCategory: [...subs],
                metaTitle: `${name} devices`,
                metaDescription: `Buy ${name} devices.`,
                isPublish: false,
            }).save();
        }
    }

    // --- conditions attribute (currently soft-deleted with 4 legacy values) ---
    let conditionAttr = await VariantAttribute.findOne({ slug: 'conditions' });
    const wantConditions = CONDITION_ORDER.filter((c) => conditions.has(c));
    if (!conditionAttr) {
        summary.conditions.push(`create attribute with ${wantConditions.join(', ')}`);
        if (commit) {
            await new VariantAttribute({
                name: 'Condition',
                slug: 'conditions',
                isDeleted: false,
                isActive: true,
                values: wantConditions.map((c) => ({ name: c, slug: toSeoSlug(c), isActive: true, isDeleted: false })),
            }).save();
        }
    } else {
        const have = new Set((conditionAttr.values || []).filter((v) => !v.isDeleted).map((v) => low(v.name)));
        const missing = wantConditions.filter((c) => !have.has(low(c)));
        if (conditionAttr.isDeleted) summary.conditions.push('restore soft-deleted "Condition" attribute');
        if (missing.length) summary.conditions.push(`+${missing.join(', ')}`);
        if (commit && (missing.length || conditionAttr.isDeleted)) {
            conditionAttr.isDeleted = false;
            conditionAttr.isActive = true;
            missing.forEach((c) => conditionAttr.values.push({
                name: c, slug: toSeoSlug(c), isActive: true, isDeleted: false,
            }));
            await conditionAttr.save();
        }
    }

    // --- brands attribute (drives the storefront brand filter) ---
    let brandAttr = await VariantAttribute.findOne({ slug: 'brands' });
    const wantBrands = [...categories.keys()].sort();
    if (!brandAttr) {
        summary.brands.push(`create attribute with ${wantBrands.join(', ')}`);
        if (commit) {
            await new VariantAttribute({
                name: 'Brands', slug: 'brands', isDeleted: false, isActive: true,
                values: wantBrands.map((b) => ({ name: b, slug: toSeoSlug(b), isActive: true, isDeleted: false })),
            }).save();
        }
    } else {
        const have = new Set((brandAttr.values || []).filter((v) => !v.isDeleted).map((v) => low(v.name)));
        const missing = wantBrands.filter((b) => !have.has(low(b)));
        if (missing.length) {
            summary.brands.push(`+${missing.join(', ')}`);
            if (commit) {
                missing.forEach((b) => brandAttr.values.push({
                    name: b, slug: toSeoSlug(b), isActive: true, isDeleted: false,
                }));
                brandAttr.isDeleted = false;
                await brandAttr.save();
            }
        }
    }

    // --- product tags ---
    for (const tag of [...tags].sort()) {
        const existing = await ProductTag.findOne({ name: new RegExp(`^${tag}$`, 'i') });
        if (existing) continue;
        summary.tags.push(tag);
        if (commit) await new ProductTag({ name: tag, slug: toSeoSlug(tag) }).save();
    }

    return summary;
}

// -------------------------------------------------------------------- main ---

async function main() {
    const argv = process.argv.slice(2);
    const has = (flag) => argv.includes(flag);
    const valueOf = (prefix, fallback) => {
        const hit = argv.find((a) => a.startsWith(prefix));
        return hit ? hit.slice(prefix.length) : fallback;
    };

    const commit = has('--commit');
    const doSeed = has('--seed');
    const which = valueOf('--file=', 'both');
    const reportPath = valueOf('--report=', null);

    if (!commit && !has('--dry-run') && !doSeed) {
        console.log('Nothing to do. Pass --dry-run, --seed and/or --commit.');
        return;
    }

    const ExcelJS = loadExcelJS();

    await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
    console.log(`Connected to MongoDB Database: ${mongoose.connection.name}`);
    console.log(`Mode: ${commit ? 'COMMIT (writes)' : 'DRY RUN (no writes)'}${doSeed ? ' + seed reference data' : ''}\n`);

    // Seed the slug set with the live catalogue so generated slugs never clash.
    const Product = require('../src/models/product');
    const taken = new Set(
        (await Product.find({}, { producturl: 1 }).lean()).map((p) => p.producturl).filter(Boolean)
    );

    const built = [];

    if (which === 'used' || which === 'both') {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(USED_FILE);
        const rows = readSheet(wb.getWorksheet('Website Catalogue'));
        rows.forEach((row) => {
            const item = mapUsedRow(row, taken);
            if (item) built.push(item);
        });
        console.log(`Used Products Couple      : ${rows.length} rows -> ${built.length} products`);
    }

    const afterUsed = built.length;
    if (which === 'new' || which === 'both') {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(NEW_FILE);
        const rows = readSheet(wb.getWorksheet('Top 100 Combined'));
        rows.forEach((row) => {
            const item = mapNewRow(row, taken);
            if (item) built.push(item);
        });
        console.log(`Stocklist Brand New/Grade : ${rows.length} rows -> ${built.length - afterUsed} products`);
    }

    if (!built.length) {
        console.log('No rows mapped — nothing to import.');
        await mongoose.disconnect();
        return;
    }

    // ---- reference data ----
    if (doSeed) {
        const seeded = await seedReference(built, { commit });
        console.log(`\nReference data ${commit ? 'written' : '(dry run — would write)'}:`);
        Object.entries(seeded).forEach(([key, list]) => {
            if (list.length) console.log(`  ${key.padEnd(14)} ${list.join(' | ')}`);
        });
        if (!Object.values(seeded).some((l) => l.length)) console.log('  (already up to date)');
    }

    // ---- import ----
    const payloads = built.map((b) => b.payload);
    const result = await importProductsService.importProducts(payloads, {
        updateExisting: true,
        dryRun: !commit,
    });

    console.log(`\n${result.message}`);

    const failures = (result.details || []).filter((d) => d.action === 'failed');
    if (failures.length) {
        console.log(`\nFailed rows (${failures.length}):`);
        failures.slice(0, 40).forEach((f) => console.log(`  ${f.producturl}: ${f.message}`));
        if (failures.length > 40) console.log(`  ... and ${failures.length - 40} more`);
    }

    // ---- report ----
    const needsStockSplit = built.filter((b) => b.meta.notes.length).map((b) => b.meta);
    const zeroStock = built.filter((b) => b.meta.totalQuantity === 0).map((b) => b.meta.name);

    console.log('\n--- REPORT NOTES ---');
    console.log(`Products mapped              : ${built.length}`);
    console.log(`Total units represented      : ${built.reduce((s, b) => s + b.meta.totalQuantity, 0)}`);
    console.log(`All created UNPUBLISHED      : yes (no price exists in either source file)`);
    console.log(`Rows needing a stock split   : ${needsStockSplit.length}`);
    needsStockSplit.forEach((m) => console.log(`   - ${m.name}: ${m.notes.join(' ')}`));
    if (zeroStock.length) console.log(`Products with 0 units        : ${zeroStock.length} (${zeroStock.slice(0, 8).join(', ')}${zeroStock.length > 8 ? ', …' : ''})`);

    if (reportPath) {
        require('fs').writeFileSync(
            reportPath,
            JSON.stringify({ result, items: built.map((b) => b.meta) }, null, 2)
        );
        console.log(`\nFull report written to ${reportPath}`);
    }

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    try { await mongoose.disconnect(); } catch { /* already closed */ }
    process.exit(1);
});
