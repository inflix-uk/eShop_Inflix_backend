// services/productService/importProducts.js
const Product = require('../../models/product');
const ProductCategory = require('../../models/productCategories');
const ProductTag = require('../../models/productTags');
const VariantAttribute = require('../../models/VariantAttribute');
const { toSeoSlug, generateVariantId, variantNameToSeoSlug } = require('../../utils/slugUtils');

/**
 * Bulk product import (CSV-driven).
 *
 * Deliberately does NOT reuse createProduct.js — this writes to the model
 * directly so imported data survives intact.
 *
 * Idempotent on `producturl` — the only unique key on the collection — so a
 * corrected file can safely be re-run.
 *
 * Three properties the CSV flow depends on:
 * - Rows are validated against the live reference collections (categories,
 *   tags, variant attributes) before anything is written; a typo fails that
 *   row instead of silently creating a product no category page can show.
 * - Updates MERGE: a blank cell means "leave the stored value alone", and
 *   fields the CSV cannot carry (varImgGroup, per-variant SEO, variant
 *   status/variantId, meta schemas…) are preserved, not wiped.
 * - dryRun performs no writes on either the create or the update path.
 */

const norm = (v) => String(v ?? '').trim();
const low = (v) => norm(v).toLowerCase();
const isBool = (v) => typeof v === 'boolean';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const hasText = (v) => norm(v) !== '';
const hasItems = (v) => Array.isArray(v) && v.length > 0;

class ImportProductsService {
    /** producturl must be unique and non-null: the index is unique WITHOUT sparse. */
    buildSlug(product, taken) {
        const base = toSeoSlug(product.producturl || product.name || '') || 'product';
        let slug = base;
        let n = 2;
        while (taken.has(slug)) {
            slug = `${base}-${n}`;
            n += 1;
        }
        taken.add(slug);
        return slug;
    }

    /**
     * CSV can only carry a source URL. The storefront prefers `url` over `path`
     * when rendering, so storing the URL directly renders correctly without
     * re-hosting. (A later pass can pull these through blobStorage.)
     */
    toImage(url) {
        if (!url) return null;
        const filename = String(url).split('/').pop().split('?')[0] || null;
        return { filename, path: null, url: String(url), altText: '', description: '' };
    }

    /**
     * Index the reference collections for O(1) validation/enrichment lookups.
     * Takes plain doc arrays so tests can feed it fixtures.
     */
    buildReference({ categories = [], tags = [], attributes = [] } = {}) {
        const categoriesByName = new Map();
        categories.forEach((c) => {
            if (!hasText(c?.name)) return;
            const subs = new Map();
            (Array.isArray(c.subCategory) ? c.subCategory : []).forEach((s) => {
                if (hasText(s)) subs.set(low(s), norm(s));
            });
            categoriesByName.set(low(c.name), { name: norm(c.name), subs });
        });

        const tagsByName = new Map();
        tags.forEach((t) => {
            if (hasText(t?.name)) tagsByName.set(low(t.name), norm(t.name));
        });

        const attributesBySlug = new Map();
        attributes.forEach((a) => {
            if (!hasText(a?.slug)) return;
            // Keyed by BOTH lowercased name and slug, so cells may carry either.
            const valuesByKey = new Map();
            (a.values || [])
                .filter((v) => v && v.isDeleted !== true)
                .forEach((v) => {
                    const value = {
                        name: norm(v.name),
                        slug: norm(v.slug) || toSeoSlug(v.name),
                        colorCode: hasText(v.colorCode) ? norm(v.colorCode) : null,
                    };
                    if (value.name) valuesByKey.set(low(value.name), value);
                    if (value.slug) valuesByKey.set(value.slug, value);
                });
            attributesBySlug.set(low(a.slug), {
                id: a._id,
                name: norm(a.name) || norm(a.slug),
                slug: low(a.slug),
                hasModels: !!a.hasModels,
                valuesByKey,
            });
        });

        return { categoriesByName, tagsByName, attributesBySlug };
    }

    /**
     * Validation is deliberately broader than the form dropdowns (no publish
     * filters): an unpublished category is still a legitimate stored value, so
     * re-importing an export must not reject it. Fail-open on query errors —
     * a broken reference read should degrade to the old unvalidated import,
     * not block the whole file.
     */
    async loadReference() {
        try {
            const [categories, tags, attributes] = await Promise.all([
                ProductCategory.find({}, { name: 1, subCategory: 1 }).lean(),
                ProductTag.find({}, { name: 1 }).lean(),
                VariantAttribute.find({ isDeleted: { $ne: true } }).lean(),
            ]);
            return this.buildReference({ categories, tags, attributes });
        } catch (error) {
            console.warn('Import: reference data unavailable, importing without validation:', error.message);
            return null;
        }
    }

    lookupValue(ref, attributeSlug, rawValue) {
        const attr = ref?.attributesBySlug.get(low(attributeSlug));
        if (!attr) return { attr: null, value: null };
        return { attr, value: attr.valuesByKey.get(low(rawValue)) || null };
    }

    /**
     * Validate against the reference data and canonicalize spellings/casing.
     * Returns { product, errors } — product is a normalized shallow copy; a
     * non-empty errors array means the row must not be written.
     * Every check is skipped when its reference list is missing or empty, so
     * an unconfigured store degrades gracefully instead of rejecting rows.
     */
    prepareProduct(p, ref) {
        const errors = [];
        const product = { ...p };
        if (!ref) return { product, errors };

        // category — the edit form allows several, comma-joined.
        if (hasText(product.category) && ref.categoriesByName.size) {
            const parts = norm(product.category).split(',').map(norm).filter(Boolean);
            const canonical = [];
            parts.forEach((part) => {
                const cat = ref.categoriesByName.get(low(part));
                if (cat) canonical.push(cat.name);
                else errors.push(`Unknown category "${part}"`);
            });
            if (canonical.length === parts.length) product.category = canonical.join(',');
        }

        // subCategory — JSON string of { Category: [Sub, ...] } (site-wide convention).
        if (hasText(product.subCategory) && ref.categoriesByName.size) {
            let parsed = null;
            try {
                parsed = JSON.parse(product.subCategory);
            } catch {
                errors.push('subcategory is not in the expected Category:Sub format');
            }
            if (parsed && typeof parsed === 'object') {
                const canonical = {};
                Object.entries(parsed).forEach(([catName, subs]) => {
                    const cat = ref.categoriesByName.get(low(catName));
                    if (!cat) {
                        errors.push(`Unknown category "${catName}" in subcategory`);
                        return;
                    }
                    (Array.isArray(subs) ? subs : [subs]).filter(Boolean).forEach((sub) => {
                        const canonicalSub = cat.subs.get(low(sub));
                        if (!canonicalSub) {
                            errors.push(`Unknown subcategory "${sub}" under "${cat.name}"`);
                            return;
                        }
                        if (!canonical[cat.name]) canonical[cat.name] = [];
                        canonical[cat.name].push(canonicalSub);
                    });
                });
                if (errors.length === 0 && Object.keys(canonical).length) {
                    product.subCategory = JSON.stringify(canonical);
                }
            }
        }

        // brand — stored by display name, offered by the `brands` attribute.
        const brands = ref.attributesBySlug.get('brands');
        if (hasText(product.brand) && brands && brands.valuesByKey.size) {
            const value = brands.valuesByKey.get(low(product.brand));
            if (value) product.brand = value.name;
            else errors.push(`Unknown brand "${norm(product.brand)}"`);
        }

        // tags — comma-joined display names.
        if (hasText(product.tags) && ref.tagsByName.size) {
            const parts = norm(product.tags).split(',').map(norm).filter(Boolean);
            const canonical = [];
            parts.forEach((part) => {
                const tag = ref.tagsByName.get(low(part));
                if (tag) canonical.push(tag);
                else errors.push(`Unknown tag "${part}"`);
            });
            if (canonical.length === parts.length) product.tags = canonical.join(',');
        }

        // condition is NOT validated — the edit form allows custom conditions.

        // comes_with / top_section — stored as value slugs; accept names too.
        [
            ['comesWithItems', 'comes_with'],
            ['topSectionItems', 'top_section'],
        ].forEach(([key, slug]) => {
            const attr = ref.attributesBySlug.get(slug);
            if (!hasItems(product[key]) || !attr || !attr.valuesByKey.size) return;
            const canonical = [];
            product[key].forEach((item) => {
                const value = attr.valuesByKey.get(low(item));
                if (value) canonical.push(value.slug);
                else errors.push(`Unknown ${slug} item "${norm(item)}"`);
            });
            if (canonical.length === product[key].length) product[key] = canonical;
        });

        // variant attributes — slug must exist, value must be one of its values.
        if (ref.attributesBySlug.size) {
            (product.variants || []).forEach((variant) => {
                (variant?.attributes || []).forEach((a) => {
                    const { attr, value } = this.lookupValue(ref, a.attributeSlug, a.value);
                    if (!attr) errors.push(`Unknown variant attribute "${norm(a.attributeSlug)}"`);
                    else if (!value) errors.push(`Unknown value "${norm(a.value)}" for attribute "${attr.name}"`);
                });
            });
        }

        return { product, errors: [...new Set(errors)] };
    }

    buildVariant(raw, productType, ref) {
        // Enrich from the attribute catalogue: display name, canonical value
        // spelling/slug and colour swatch — the same data the form path stores.
        const attributes = (raw.attributes || []).map((a) => {
            const { attr, value } = this.lookupValue(ref, a.attributeSlug, a.value);
            return {
                attributeName: attr?.name || a.attributeSlug,
                attributeSlug: attr?.slug || a.attributeSlug,
                value: value?.name ?? a.value,
                valueSlug: value?.slug || toSeoSlug(a.value),
                colorCode: value?.colorCode ?? null,
                model: null, // the CSV cannot express value→model pairs
            };
        });

        // A null variant name crashes the storefront product page
        // (variant.name.toLowerCase() is called unguarded), so always fill it.
        let name = norm(raw.name);
        if (!name) {
            name = productType === 'single'
                ? 'single'
                : attributes.map(a => a.valueSlug).filter(Boolean).join('-') || 'default';
        }

        return {
            name,
            variantId: generateVariantId(),
            slug: variantNameToSeoSlug(name),
            attributes,
            variantImages: (raw.imageUrls || []).map(u => this.toImage(u)).filter(Boolean),
            Cost: raw.Cost ?? null,
            Price: raw.Price ?? null,
            Quantity: raw.Quantity ?? 0,
            SKU: raw.SKU ?? null,
            EIN: raw.EIN ?? null,
            MPN: raw.MPN ?? null,
            salePrice: raw.salePrice ?? null,
            metaTitle: null,
            metaDescription: null,
            metaKeywords: null,
            metaSchemas: [],
            metaImage: null,
            status: true,
        };
    }

    /** variantNames drives the storefront option pickers — mirror the form path. */
    enrichVariantNames(variantNames, ref) {
        return (variantNames || []).map((vn) => {
            const attr = ref?.attributesBySlug.get(low(vn.attributeSlug));
            const entry = {
                name: attr?.name || vn.name || vn.attributeSlug,
                attributeSlug: attr?.slug || vn.attributeSlug,
                hasModels: attr ? attr.hasModels : !!vn.hasModels,
                options: (vn.options || []).map((o) => {
                    const value = attr?.valuesByKey.get(low(o.value)) || null;
                    return {
                        value: value?.name ?? o.value,
                        slug: value?.slug || toSeoSlug(o.value),
                        colorCode: value?.colorCode ?? null,
                        model: null,
                    };
                }),
            };
            if (attr?.id) entry.attributeId = attr.id;
            return entry;
        });
    }

    /** Full document for a NEW product. */
    buildCreateDoc(p, slug, ref) {
        const type = p.productType?.type === 'variant' ? 'variant' : 'single';
        const variants = (p.variants || []).map(v => this.buildVariant(v, type, ref));

        return {
            name: p.name,
            producturl: slug,
            category: p.category,
            subCategory: p.subCategory,
            mainCategory: p.mainCategory,
            brand: p.brand,
            condition: p.condition,
            tags: p.tags,
            productType: { type },
            status: p.status === true,
            isdeleted: false,
            is_featured: p.is_featured,
            is_authenticated: p.is_authenticated,
            low_stock_quantity_alert: p.low_stock_quantity_alert,
            comesWithItems: p.comesWithItems || [],
            topSectionItems: p.topSectionItems || [],
            product_Specifications: p.product_Specifications || [],
            Product_summary: p.Product_summary,
            Product_description: p.Product_description,
            Seo_Meta: p.Seo_Meta,
            thumbnail_image: this.toImage(p.thumbnailUrl) || {
                filename: null, path: null, url: null,
            },
            Gallery_Images: (p.galleryUrls || []).map(u => this.toImage(u)).filter(Boolean),
            variantValues: variants,
            variantNames: type === 'variant' ? this.enrichVariantNames(p.variantNames, ref) : [],
            varImgGroup: [],
            // battery is JSON.parse'd unguarded by the storefront — an invalid
            // value crashes the whole product page, so never populate it here.
            updatedAt: Date.now(),
        };
    }

    /**
     * Rebuild the variant list from the file, but carry over everything the
     * CSV cannot express from the matching stored variant (matched by SKU,
     * then name, then slug): variantId (carts/stock checks key on it),
     * status, per-variant SEO and images. Blank cells keep stored values.
     */
    mergeVariants(rawVariants, existingVariants, type, ref) {
        const olds = Array.isArray(existingVariants) ? existingVariants : [];
        const bySku = new Map(olds.filter(v => hasText(v?.SKU)).map(v => [low(v.SKU), v]));
        const byName = new Map(olds.filter(v => hasText(v?.name)).map(v => [low(v.name), v]));
        const bySlug = new Map(olds.filter(v => hasText(v?.slug)).map(v => [low(v.slug), v]));

        return (rawVariants || []).map((raw) => {
            const fresh = this.buildVariant(raw, type, ref);
            const old =
                (hasText(raw.SKU) && bySku.get(low(raw.SKU))) ||
                byName.get(low(fresh.name)) ||
                bySlug.get(low(fresh.slug)) ||
                null;
            if (!old) return fresh;

            return {
                ...fresh,
                variantId: old.variantId || fresh.variantId,
                status: isBool(old.status) ? old.status : fresh.status,
                metaTitle: old.metaTitle ?? null,
                metaDescription: old.metaDescription ?? null,
                metaKeywords: old.metaKeywords ?? null,
                metaSchemas: Array.isArray(old.metaSchemas) ? old.metaSchemas : [],
                metaImage: old.metaImage ?? null,
                variantImages: fresh.variantImages.length
                    ? fresh.variantImages
                    : (Array.isArray(old.variantImages) ? old.variantImages : []),
                Cost: fresh.Cost ?? old.Cost ?? null,
                Price: fresh.Price ?? old.Price ?? null,
                salePrice: fresh.salePrice ?? old.salePrice ?? null,
                Quantity: raw.Quantity ?? old.Quantity ?? 0,
                SKU: fresh.SKU ?? old.SKU ?? null,
                EIN: fresh.EIN ?? old.EIN ?? null,
                MPN: fresh.MPN ?? old.MPN ?? null,
            };
        });
    }

    /**
     * $set for an EXISTING product. Only fields the file actually provides are
     * written; producturl, varImgGroup, battery, perks, warranty, related
     * products, description blocks etc. are never touched from here.
     */
    buildUpdateDoc(p, existing, ref) {
        const set = { isdeleted: false, updatedAt: Date.now() };

        const explicitType = p.productType?.type === 'variant' || p.productType?.type === 'single'
            ? p.productType.type
            : null;
        const type = explicitType
            || (existing.productType?.type === 'variant' ? 'variant' : 'single');
        if (explicitType) set.productType = { type: explicitType };

        if (hasText(p.name)) set.name = norm(p.name);
        if (hasText(p.category)) set.category = p.category;
        if (hasText(p.subCategory)) set.subCategory = p.subCategory;
        if (hasText(p.mainCategory)) set.mainCategory = p.mainCategory;
        if (hasText(p.brand)) set.brand = p.brand;
        if (hasText(p.condition)) set.condition = p.condition;
        if (hasText(p.tags)) set.tags = p.tags;
        if (hasText(p.Product_summary)) set.Product_summary = p.Product_summary;
        if (hasText(p.Product_description)) set.Product_description = p.Product_description;

        if (isBool(p.status)) set.status = p.status;
        if (isBool(p.is_featured)) set.is_featured = p.is_featured;
        if (isBool(p.is_authenticated)) set.is_authenticated = p.is_authenticated;
        if (isNum(p.low_stock_quantity_alert)) set.low_stock_quantity_alert = p.low_stock_quantity_alert;

        if (hasItems(p.comesWithItems)) set.comesWithItems = p.comesWithItems;
        if (hasItems(p.topSectionItems)) set.topSectionItems = p.topSectionItems;
        if (hasItems(p.product_Specifications)) set.product_Specifications = p.product_Specifications;

        if (hasText(p.thumbnailUrl)) set.thumbnail_image = this.toImage(p.thumbnailUrl);
        if (hasItems(p.galleryUrls)) {
            set.Gallery_Images = p.galleryUrls.map(u => this.toImage(u)).filter(Boolean);
        }

        // Merge SEO field-by-field; metaSchemas can't ride in the CSV, so the
        // stored ones always survive.
        const existingSeo = existing.Seo_Meta || {};
        const incomingSeo = p.Seo_Meta || {};
        set.Seo_Meta = {
            metaTitle: hasText(incomingSeo.metaTitle) ? norm(incomingSeo.metaTitle) : existingSeo.metaTitle ?? null,
            metaDescription: hasText(incomingSeo.metaDescription) ? norm(incomingSeo.metaDescription) : existingSeo.metaDescription ?? null,
            metaKeywords: hasText(incomingSeo.metaKeywords) ? norm(incomingSeo.metaKeywords) : existingSeo.metaKeywords ?? null,
            metaSchemas: Array.isArray(existingSeo.metaSchemas) ? existingSeo.metaSchemas : [],
        };

        if (hasItems(p.variants)) {
            set.variantValues = this.mergeVariants(p.variants, existing.variantValues, type, ref);
        }

        if (type === 'variant') {
            if (hasItems(p.variantNames)) set.variantNames = this.enrichVariantNames(p.variantNames, ref);
        } else if (explicitType) {
            set.variantNames = [];
        }

        return set;
    }

    /**
     * @param {Array} products - payloads from the admin panel's CSV parser
     * @param {Object} opts
     * @param {boolean} opts.updateExisting - update on producturl match instead of skipping
     * @param {boolean} opts.dryRun - validate and report without writing anything
     */
    async importProducts(products, opts = {}) {
        const { updateExisting = true, dryRun = false } = opts;
        const list = Array.isArray(products) ? products : [];

        if (list.length === 0) {
            return { success: false, message: 'No products supplied', status: 400 };
        }

        const ref = await this.loadReference();

        // Seed the slug set with what already exists so generated suffixes never
        // collide with the live catalogue.
        const existing = await Product.find({}, { producturl: 1 }).lean();
        const taken = new Set(existing.map(e => e.producturl).filter(Boolean));

        const results = { created: 0, updated: 0, skipped: 0, failed: 0 };
        const details = [];

        for (const raw of list) {
            const requested = norm(raw.producturl);
            try {
                const { product: p, errors } = this.prepareProduct(raw, ref);
                if (errors.length) {
                    results.failed += 1;
                    details.push({
                        producturl: requested || norm(raw.name) || '(no producturl)',
                        action: 'failed',
                        message: errors.join('; '),
                    });
                    continue;
                }

                const match = requested
                    ? await Product.findOne({ producturl: requested }).lean()
                    : null;

                if (match && !updateExisting) {
                    results.skipped += 1;
                    details.push({ producturl: requested, action: 'skipped', message: 'Already exists' });
                    continue;
                }

                if (match) {
                    const set = this.buildUpdateDoc(p, match, ref);
                    if (!dryRun) {
                        await Product.updateOne({ _id: match._id }, { $set: set });
                    }
                    results.updated += 1;
                    details.push({ producturl: requested, action: dryRun ? 'would update' : 'updated', name: p.name });
                    continue;
                }

                // taken already holds every live slug, so this cannot collide.
                const slug = this.buildSlug(p, taken);
                if (!dryRun) {
                    await new Product(this.buildCreateDoc(p, slug, ref)).save();
                }
                results.created += 1;
                details.push({ producturl: slug, action: dryRun ? 'would create' : 'created', name: p.name });
            } catch (error) {
                results.failed += 1;
                const message = error.code === 11000
                    ? `Duplicate producturl "${requested}"`
                    : error.message;
                details.push({ producturl: requested, action: 'failed', message });
                console.error('Import row failed:', requested, message);
            }
        }

        return {
            success: true,
            message: dryRun
                ? `Dry run: ${results.created} to create, ${results.updated} to update, ${results.failed} would fail`
                : `Imported ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
            results,
            details,
            status: 201,
        };
    }
}

module.exports = new ImportProductsService();
