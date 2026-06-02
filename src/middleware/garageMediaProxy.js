const { GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../utils/s3");
const { isGarageStorage } = require("../utils/s3Config");
const spacesStorage = require("../utils/uploadToSpaces");

function isGarageMediaProxyEnabled() {
    if (!isGarageStorage() || !spacesStorage.isSpacesListConfigured()) {
        return false;
    }
    const raw = (process.env.DO_SPACES_SERVE_MEDIA_VIA_API || "")
        .trim()
        .toLowerCase();
    return !["false", "0", "no", "off"].includes(raw);
}

function uploadsPathToS3Key(relativePath) {
    const clean = String(relativePath || "")
        .replace(/^\/+/, "")
        .replace(/\\/g, "/");
    if (!clean || clean.includes("..")) return null;
    const main = (process.env.MAIN_FOLDER || "").replace(/^\/+|\/+$/g, "");
    const key = main ? `${main}/${clean}` : clean;
    return spacesStorage.normalizeS3ObjectKey(key);
}

/**
 * Stream Garage/S3 objects for GET /uploads/... when files are not on local disk.
 * Requires DO_SPACES_SERVE_MEDIA_VIA_API (default on) and public URLs via BACKEND_URL.
 */
async function garageMediaProxy(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (!isGarageMediaProxyEnabled()) return next();

    const key = uploadsPathToS3Key(req.path);
    if (!key) return next();

    const bucket = process.env.DO_SPACES_BUCKET;
    try {
        const resp = await s3Client.send(
            new GetObjectCommand({ Bucket: bucket, Key: key })
        );

        if (resp.ContentType) {
            res.setHeader("Content-Type", resp.ContentType);
        }
        if (resp.ContentLength != null) {
            res.setHeader("Content-Length", String(resp.ContentLength));
        }
        if (resp.ETag) {
            res.setHeader("ETag", resp.ETag);
        }
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

        if (req.method === "HEAD") {
            return res.status(200).end();
        }

        const body = resp.Body;
        if (!body || typeof body.pipe !== "function") {
            return res.status(500).end();
        }
        body.on("error", (err) => {
            if (!res.headersSent) next(err);
            else res.destroy();
        });
        return body.pipe(res);
    } catch (err) {
        const status = err?.$metadata?.httpStatusCode;
        const missing =
            err?.name === "NoSuchKey" ||
            err?.Code === "NoSuchKey" ||
            status === 404;
        if (missing) return next();
        return next(err);
    }
}

module.exports = {
    garageMediaProxy,
    isGarageMediaProxyEnabled,
    uploadsPathToS3Key,
};
