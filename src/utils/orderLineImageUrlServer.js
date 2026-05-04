/**
 * Resolve a displayable image URL for order cart line items on the server
 * (admin dashboard, emails) — handles absolute URLs, /uploads paths,
 * DigitalOcean Spaces keys (MAIN_FOLDER/products/...), and Vercel Blob pathnames
 * when BLOB_PUBLIC_BASE_URL is set (same origin as blob `url` from uploads).
 */

const spacesStorage = require("./uploadToSpaces");

function getBlobPublicBase() {
    return String(process.env.BLOB_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

function looksLikeBlobPathname(t) {
    const s = String(t || "")
        .replace(/^\/+/, "")
        .toLowerCase();
    if (!s || s.startsWith("uploads/")) return false;
    return /^(?:[a-z0-9_-]+\/)?(products|blogs|banners)\//.test(s);
}

function normalizeBase() {
    return (process.env.BACKEND_URL || "").replace(/\/+$/, "");
}

function isHttp(s) {
    return typeof s === "string" && /^https?:\/\//i.test(s.trim());
}

function buildDiskUrl(pathOrRel) {
    if (!pathOrRel) return "";
    const t = String(pathOrRel).trim();
    if (!t) return "";
    if (isHttp(t)) return t;
    let seg = t.startsWith("/") ? t : `/${t}`;
    if (
        !seg.toLowerCase().startsWith("/uploads/") &&
        seg.startsWith("/products/")
    ) {
        seg = `/uploads${seg}`;
    }
    const base = normalizeBase();
    if (!base) return seg;
    return `${base}${seg}`;
}

function toSpacesKey(relativePath) {
    const main = (process.env.MAIN_FOLDER || "").replace(/^\/+|\/+$/g, "");
    const clean = String(relativePath || "").replace(/^\/+/, "");
    if (!clean) return "";
    if (!main) return clean;
    if (clean.startsWith(`${main}/`)) return clean;
    return `${main}/${clean}`.replace(/\/+/g, "/");
}

function fromString(s, spacesOn) {
    const t = String(s || "").trim();
    if (!t) return "";
    if (t.startsWith("//")) return `https:${t}`;
    if (isHttp(t)) return t;
    const notDiskUpload =
        !/^\/uploads\//i.test(t) && !t.toLowerCase().startsWith("uploads/");
    if (spacesOn && notDiskUpload) {
        const key = toSpacesKey(t);
        if (key) {
            try {
                return spacesStorage.buildPublicUrlForKey(key);
            } catch {
                /* fall through */
            }
        }
    }
    const blobBase = getBlobPublicBase();
    if (blobBase && looksLikeBlobPathname(t) && notDiskUpload) {
        return `${blobBase}/${t.replace(/^\/+/, "")}`;
    }
    return buildDiskUrl(t);
}

function fromSlot(raw, spacesOn) {
    if (raw == null) return "";
    if (typeof raw === "string") return fromString(raw, spacesOn);
    if (typeof raw === "object") {
        if (raw.url != null && String(raw.url).trim() !== "") {
            const u = fromString(raw.url, spacesOn);
            if (u) return u;
        }
        if (raw.path != null && String(raw.path).trim() !== "") {
            return fromString(raw.path, spacesOn);
        }
    }
    return "";
}

/**
 * @param {Record<string, unknown>} cartLike - one cart line shape
 * @returns {string}
 */
function resolveOrderLineImageUrlServer(cartLike) {
    if (!cartLike) return "";
    const spacesOn = spacesStorage.isSpacesListConfigured();

    if (cartLike.variantImages?.length) {
        const u = fromSlot(cartLike.variantImages[0], spacesOn);
        if (u) return u;
    }
    if (cartLike.galleryImages?.length) {
        const u = fromSlot(cartLike.galleryImages[0], spacesOn);
        if (u) return u;
    }
    if (cartLike.productthumbnail) {
        const u = fromSlot(cartLike.productthumbnail, spacesOn);
        if (u) return u;
    }
    if (cartLike.metaImage) {
        const u = fromSlot(cartLike.metaImage, spacesOn);
        if (u) return u;
    }
    if (cartLike.image) return fromString(cartLike.image, spacesOn);
    if (cartLike.productImage) return fromString(cartLike.productImage, spacesOn);
    return "";
}

/**
 * Attach `lineImageUrl` to each cart line (plain / lean order object).
 * @param {Record<string, unknown>} order
 * @returns {Record<string, unknown>}
 */
function attachLineImageUrlsToOrder(order) {
    if (!order || !Array.isArray(order.cart)) return order;
    return {
        ...order,
        cart: order.cart.map((line) => ({
            ...line,
            lineImageUrl: resolveOrderLineImageUrlServer(line),
        })),
    };
}

module.exports = { resolveOrderLineImageUrlServer, attachLineImageUrlsToOrder };
