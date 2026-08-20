/**
 * Rebuild the homepage "Popular Categories" widget from the live catalogue.
 *
 * The widget (homepagedatas.blocks -> widgetType 'categoryCards') stores its
 * cards as literal content: a typed category name, a typed item count and a
 * link. Nothing recalculates them, so the homepage drifts away from the
 * catalogue silently — it was advertising "Mobile Phones - 179 items" against
 * a database holding 30 products in a single category, with empty Shop Now
 * links on every card.
 *
 * This regenerates the card list from productcategories + the real product
 * counts, keeping each card's styling and background image. Re-run it whenever
 * the catalogue changes.
 *
 * Usage (from the backend directory):
 *   node scripts/syncHomepageCategoryCards.js --dry-run
 *   node scripts/syncHomepageCategoryCards.js --commit
 *
 *   --include-empty   also emit cards for categories with 0 products
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const includeEmpty = argv.includes('--include-empty');

const low = (v) => String(v ?? '').trim().toLowerCase();

/** Walk the nested row/column/widget tree and hand back every matching widget. */
function findWidgets(blocks, widgetType, out = []) {
    (blocks || []).forEach((block) => {
        if (block?.type === 'widget' && block.content?.widgetType === widgetType) out.push(block);
        (block?.columns || []).forEach((col) => findWidgets(col.blocks, widgetType, out));
        if (Array.isArray(block?.blocks)) findWidgets(block.blocks, widgetType, out);
    });
    return out;
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
    const db = mongoose.connection.db;
    console.log(`Connected to MongoDB Database: ${mongoose.connection.name}`);
    console.log(`Mode: ${commit ? 'COMMIT (writes)' : 'DRY RUN (no writes)'}\n`);

    // --- live counts ---------------------------------------------------------
    // A product's `category` is a comma-joined list of category NAMES.
    const products = await db.collection('products')
        .find({ isdeleted: { $ne: true } }, { projection: { category: 1 } }).toArray();

    const counts = new Map();
    products.forEach((p) => {
        String(p.category || '').split(',').map((c) => c.trim()).filter(Boolean)
            .forEach((name) => counts.set(low(name), (counts.get(low(name)) || 0) + 1));
    });

    const categories = await db.collection('productcategories')
        .find({}, { projection: { name: 1, slug: 1 } }).toArray();

    const wanted = categories
        .map((c) => ({ name: c.name, slug: c.slug, count: counts.get(low(c.name)) || 0 }))
        .filter((c) => includeEmpty || c.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    console.log('Live catalogue:');
    categories.forEach((c) => console.log(`  ${String(c.name).padEnd(14)} ${counts.get(low(c.name)) || 0} products`));
    console.log(`\nCards to emit: ${wanted.length} (${wanted.map((c) => `${c.name} ${c.count}`).join(', ') || 'none'})`);

    // --- the widget ----------------------------------------------------------
    const home = await db.collection('homepagedatas').findOne({});
    if (!home) throw new Error('No homepagedatas document found');

    const widgets = findWidgets(home.blocks, 'categoryCards');
    if (!widgets.length) throw new Error('No categoryCards widget found on the homepage');
    console.log(`Found ${widgets.length} categoryCards widget(s) on the homepage`);

    widgets.forEach((widget) => {
        const old = widget.content.items || [];
        const byName = new Map(old.map((i) => [low(i.categoryName), i]));

        console.log('\nBefore:');
        old.forEach((i) => console.log(`  ${String(i.categoryName).padEnd(20)} ${i.itemCount} items  link="${i.shopNowLink}"`));

        widget.content.items = wanted.map((cat, index) => {
            // Reuse the card that already described this category; otherwise
            // recycle the styling/artwork of the card in the same slot so the
            // row keeps its look instead of rendering as bare text.
            const template = byName.get(low(cat.name)) || old[index] || old[0] || {};
            return {
                ...template,
                id: template.id || `card-${cat.slug}`,
                categoryName: cat.name,
                itemCount: cat.count,
                shopNowLink: `/categories/${cat.slug}`,
                order: index,
                isActive: true,
            };
        });

        console.log('After:');
        widget.content.items.forEach((i) => console.log(`  ${String(i.categoryName).padEnd(20)} ${i.itemCount} items  link="${i.shopNowLink}"`));
    });

    if (!commit) {
        console.log('\nDry run — nothing written.');
        await mongoose.disconnect();
        return;
    }

    await db.collection('homepagedatas').updateOne(
        { _id: home._id },
        { $set: { blocks: home.blocks, updatedAt: new Date() } }
    );
    console.log('\nHomepage updated.');
    console.log('Note: the storefront serves this through Next.js ISR (s-maxage=120,');
    console.log('stale-while-revalidate=300), so the change appears within ~5 minutes.');

    await mongoose.disconnect();
}

main().catch(async (e) => {
    console.error('FAILED:', e.message);
    try { await mongoose.disconnect(); } catch { /* already closed */ }
    process.exit(1);
});
