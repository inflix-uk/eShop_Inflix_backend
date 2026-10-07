/**
 * Clean products that carry the literal text "null" / "undefined" in text
 * fields, and "Comes With" / "Top Section" values saved by name instead of by
 * slug. Both came from products imported from a spreadsheet and then saved
 * once from the admin edit page before that page was fixed.
 *
 * DRY RUN by default — prints what would change and writes nothing.
 *
 *   node scripts/cleanProductNullText.js                  # report only
 *   node scripts/cleanProductNullText.js --brand=Samsung  # one brand only
 *   node scripts/cleanProductNullText.js --apply          # write the changes
 *   node scripts/cleanProductNullText.js --db=<name>      # another database on the same server
 *
 * Uses the same MONGO_URI as the server, so run it in that store's environment.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const TEXT_FIELDS = [
    'category',
    'subCategory',
    'mainCategory',
    'brand',
    'condition',
    'tags',
    'sim_options',
    'selectOption',
    'Product_summary',
    'Product_description',
];

const OPTION_FIELDS = [
    ['comesWithItems', ['comes_with', 'comes-with']],
    ['topSectionItems', ['top_section', 'top-section']],
];

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const argValue = (name) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3).trim() : '';
};
const BRAND = argValue('brand');
const DB_NAME = argValue('db');

const isNullText = (value) =>
    typeof value === 'string' && ['null', 'undefined'].includes(value.trim().toLowerCase());

const normalize = (value) => String(value || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');

async function run() {
    const uri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!uri) {
        console.error('MONGO_URI is not set — run this in the store\'s backend environment.');
        process.exit(1);
    }

    await mongoose.connect(uri, DB_NAME ? { dbName: DB_NAME } : {});
    const db = mongoose.connection.db;
    console.log(`Database: ${db.databaseName}  |  mode: ${APPLY ? 'APPLY (writing)' : 'dry run (no writes)'}`);

    const products = db.collection('products');
    const attributes = await db.collection('variantattributes')
        .find({ isDeleted: { $ne: true } })
        .toArray();

    // value name/slug -> canonical slug, per option list
    const optionSlugs = {};
    OPTION_FIELDS.forEach(([field, slugs]) => {
        const attr = attributes.find((a) => slugs.includes(a.slug));
        if (!attr) return;
        const lookup = new Map();
        (attr.values || []).filter((v) => v && v.isDeleted !== true).forEach((v) => {
            if (v.slug) lookup.set(normalize(v.slug), v.slug);
            if (v.name && v.slug) lookup.set(normalize(v.name), v.slug);
        });
        optionSlugs[field] = lookup;
    });

    const filter = BRAND ? { brand: new RegExp(`^${BRAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } : {};
    const cursor = products.find(filter);

    let scanned = 0;
    let changed = 0;

    for await (const product of cursor) {
        scanned += 1;
        const set = {};
        const notes = [];

        TEXT_FIELDS.forEach((field) => {
            if (isNullText(product[field])) {
                set[field] = null;
                notes.push(`${field}: "${product[field]}" -> empty`);
            }
        });

        OPTION_FIELDS.forEach(([field]) => {
            const lookup = optionSlugs[field];
            const stored = product[field];
            if (!lookup || !Array.isArray(stored) || stored.length === 0) return;
            const next = [];
            stored.forEach((item) => {
                const slug = lookup.get(normalize(item)) || item;
                if (!next.includes(slug)) next.push(slug);
            });
            if (next.length !== stored.length || next.some((slug, i) => slug !== stored[i])) {
                set[field] = next;
                notes.push(`${field}: ${JSON.stringify(stored)} -> ${JSON.stringify(next)}`);
            }
        });

        if (notes.length === 0) continue;
        changed += 1;
        console.log(`\n${product.name || '(no name)'}  [${product._id}]`);
        notes.forEach((note) => console.log(`   ${note}`));

        if (APPLY) {
            await products.updateOne({ _id: product._id }, { $set: set });
        }
    }

    console.log(`\nScanned ${scanned} product(s); ${changed} ${APPLY ? 'updated' : 'would be updated'}.`);
    if (!APPLY && changed > 0) console.log('Nothing was written. Re-run with --apply to save these changes.');
}

run()
    .catch((error) => {
        console.error('Failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
