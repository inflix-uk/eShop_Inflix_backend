const sharp = require("sharp");

const QUALITY = 95;
/** Only run WebP conversion (resize + encode) when original is larger than this. */
const WEBP_CONVERSION_MIN_BYTES = 2 * 1024 * 1024; // 2 MiB

function resolveMaxWidth(folder = "") {
    const normalized = String(folder).toLowerCase();
    if (normalized.includes("product")) return 800;
    if (normalized.includes("banner")) return 1920;
    return 1200;
}

/** Hero/banner uploads: store original bytes (no resize, no WebP). */
function shouldPreserveOriginalUpload(folder = "") {
    const normalized = String(folder).toLowerCase();
    return normalized.includes("banner");
}

async function optimizeImageForUpload(file, folder = "") {
    if (!file || !file.buffer || !String(file.mimetype || "").startsWith("image/")) {
        return file;
    }

    if (shouldPreserveOriginalUpload(folder)) {
        return file;
    }

    const byteLength = Number(file.buffer?.length ?? file.size ?? 0);
    if (byteLength <= WEBP_CONVERSION_MIN_BYTES) {
        return file;
    }

    const maxWidth = resolveMaxWidth(folder);
    const optimizedBuffer = await sharp(file.buffer)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: QUALITY })
        .toBuffer();

    const baseName = String(file.originalname || "image").replace(/\.[^/.]+$/, "");
    return {
        ...file,
        buffer: optimizedBuffer,
        size: optimizedBuffer.length,
        mimetype: "image/webp",
        originalname: `${baseName}.webp`,
    };
}

module.exports = { optimizeImageForUpload };
