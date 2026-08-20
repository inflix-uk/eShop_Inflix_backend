/**
 * Copy a product catalogue from one MongoDB database into another.
 *
 * Built for refurb_market -> regenerateGlobalLimited, but the source is a
 * parameter so it works for any pair.
 *
 * Copies the products AND the reference documents they point at, preserving
 * _id values — product.variantNames[].attributeId is an ObjectId reference, so
 * a copy that re-keys the attributes would leave every option picker broken.
 *
 * Usage (from the backend directory):
 *   SOURCE_URI="mongodb://..." node scripts/copyCatalogue.js --dry-run
 *   SOURCE_URI="mongodb://..." node scripts/copyCatalogue.js --commit
 *
 *   --wipe-target-products   delete the target's products first (default: upsert by _id)
 *
 * The target URI comes from MONGO_URI in .env, like every other script here.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');

/**
 * Source connection string. Prefer `--source-file=<path>` (a file containing
 * just the URI) over SOURCE_URI so credentials never sit in shell history.
 */
const sourceFileArg = process.argv.slice(2).find((a) => a.startsWith('--source-file='));
const SOURCE_URI = sourceFileArg
    ? require('fs').readFileSync(sourceFileArg.slice('--source-file='.length), 'utf8').trim()
    : process.env.SOURCE_URI;
const TARGET_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const wipeProducts = argv.includes('--wipe-target-products');

const low = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Only the attributes the products actually reference are worth carrying over;
 * the source also holds empty legacy attributes whose names collide with the
 * target's own. Returns the set of _id strings referenced by variantNames.
 */
function referencedAttributeIds(products) {
    const ids = new Set();
    products.forEach((p) => {
        (p.variantNames || []).forEach((v) => {
            if (v.attributeId) ids.add(String(v.attributeId));
        });
    });
    return ids;
}

async function main() {
    if (!SOURCE_URI) throw new Error('SOURCE_URI env var is required');
    if (!TARGET_URI) throw new Error('MONGO_URI is not set in .env');

    const src = await new MongoClient(SOURCE_URI, { serverSelectionTimeoutMS: 20000 }).connect();
    const tgt = await new MongoClient(TARGET_URI, { serverSelectionTimeoutMS: 20000 }).connect();
    const S = src.db();
    const T = tgt.db();

    console.log(`Source: ${S.databaseName}`);
    console.log(`Target: ${T.databaseName}`);
    console.log(`Mode  : ${commit ? 'COMMIT (writes)' : 'DRY RUN (no writes)'}\n`);

    const products = await S.collection('products').find({}).toArray();
    const needed = referencedAttributeIds(products);

    // ---- variant attributes -------------------------------------------------
    // Copied by _id. A target doc that shares the unique name/slug but has a
    // different _id must be removed first or the unique index rejects the copy.
    const srcAttrs = await S.collection('variantattributes').find({}).toArray();
    const copyAttrs = srcAttrs.filter((a) => needed.has(String(a._id)));
    const skipAttrs = srcAttrs.filter((a) => !needed.has(String(a._id)));

    const attrConflicts = [];
    for (const a of copyAttrs) {
        const clash = await T.collection('variantattributes').findOne({
            _id: { $ne: a._id },
            $or: [{ slug: a.slug }, { name: a.name }],
        });
        if (clash) attrConflicts.push({ incoming: `${a.name}/${a.slug}`, replacing: `${clash.name}/${clash.slug}`, _id: clash._id });
    }

    // ---- categories ---------------------------------------------------------
    const usedCategories = new Set(
        products.flatMap((p) => String(p.category || '').split(',').map((c) => c.trim())).filter(Boolean)
    );
    const srcCats = await S.collection('productcategories').find({}).toArray();
    const copyCats = srcCats.filter((c) => usedCategories.has(c.name));

    const catConflicts = [];
    for (const c of copyCats) {
        const clash = await T.collection('productcategories').findOne({
            _id: { $ne: c._id },
            $or: [{ slug: c.slug }, { name: c.name }],
        });
        if (clash) catConflicts.push({ incoming: c.name, _id: clash._id });
    }

    // ---- tags ---------------------------------------------------------------
    // Tags are stored on products as a comma-joined name string, not by _id, so
    // duplicates by name are pointless noise — skip anything already present.
    const srcTags = await S.collection('producttags').find({}).toArray();
    const tgtTagNames = new Set(
        (await T.collection('producttags').find({}, { projection: { name: 1 } }).toArray()).map((t) => low(t.name))
    );
    const seen = new Set();
    const copyTags = srcTags.filter((t) => {
        const key = low(t.name);
        if (!key || tgtTagNames.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // ---- Product Central ----------------------------------------------------
    // The admin's "Product Central" section is backed by these collections.
    // Most are empty at the source; copying is reported per collection so an
    // empty one is visibly a no-op rather than a silent omission.
    const PRODUCT_CENTRAL = [
        'categorycardssections',
        'navbars',
        'navbarheadersettings',
        'homepagenavlinks',
        'googleCategories',
    ];
    const pcDocs = {};
    for (const name of PRODUCT_CENTRAL) {
        pcDocs[name] = await S.collection(name).find({}).toArray().catch(() => []);
    }

    // ---- report -------------------------------------------------------------
    console.log(`products            : ${products.length} to copy`);
    console.log(`variant attributes  : ${copyAttrs.length} to copy (${copyAttrs.map((a) => a.slug).join(', ')})`);
    if (skipAttrs.length) console.log(`  skipped (unused)  : ${skipAttrs.map((a) => `${a.name}/${a.slug}`).join(', ')}`);
    attrConflicts.forEach((c) => console.log(`  !! replaces target "${c.replacing}" (different _id) to satisfy the unique index`));
    console.log(`categories          : ${copyCats.length} to copy (${copyCats.map((c) => c.name).join(', ')})`);
    catConflicts.forEach((c) => console.log(`  !! replaces target category with the same name/slug`));
    console.log(`tags                : ${copyTags.length} to copy (${srcTags.length - copyTags.length} already present or duplicated)`);
    console.log('product central     :');
    PRODUCT_CENTRAL.forEach((n) => console.log(`  ${n.padEnd(22)} ${pcDocs[n].length ? `${pcDocs[n].length} to copy` : 'empty at source — nothing to copy'}`));

    const existingProducts = await T.collection('products').countDocuments();
    console.log(`\ntarget currently holds ${existingProducts} products${wipeProducts ? ' — will be deleted first' : ''}`);

    if (!commit) {
        console.log('\nDry run — nothing written.');
        await src.close(); await tgt.close();
        return;
    }

    // ---- write --------------------------------------------------------------
    if (wipeProducts) {
        const del = await T.collection('products').deleteMany({});
        console.log(`\nDeleted ${del.deletedCount} existing target products`);
    }

    for (const c of attrConflicts) await T.collection('variantattributes').deleteOne({ _id: c._id });
    for (const c of catConflicts) await T.collection('productcategories').deleteOne({ _id: c._id });

    const write = async (name, docs) => {
        let n = 0;
        for (const doc of docs) {
            await T.collection(name).replaceOne({ _id: doc._id }, doc, { upsert: true });
            n += 1;
        }
        console.log(`  ${name.padEnd(20)} ${n} written`);
        return n;
    };

    console.log('\nWriting:');
    await write('variantattributes', copyAttrs);
    await write('productcategories', copyCats);
    await write('producttags', copyTags);
    await write('products', products);
    for (const name of PRODUCT_CENTRAL) {
        if (pcDocs[name].length) await write(name, pcDocs[name]);
    }

    console.log(`\nDone. Target now holds ${await T.collection('products').countDocuments()} products.`);

    await src.close();
    await tgt.close();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
