const sharp = require("sharp");

const QUALITY = 70;

function resolveMaxWidth(folder = "") {
    const normalized = String(folder).toLowerCase();
    if (normalized.includes("product")) return 500;
    if (normalized.includes("banner")) return 1200;
    return 800;
}

async function optimizeImageForUpload(file, folder = "") {
    if (!file || !file.buffer || !String(file.mimetype || "").startsWith("image/")) {
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
