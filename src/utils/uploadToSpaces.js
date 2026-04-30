const crypto = require("crypto");
const {
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    CopyObjectCommand,
} = require("@aws-sdk/client-s3");
const s3Client = require("./s3");

const ALLOWED_FOLDERS = ["products", "blogs", "banners"];

function sanitizeFilename(fileName = "") {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
}

function buildCompactFilename(originalName = "") {
    const safeName = sanitizeFilename(originalName);
    const parts = safeName.split(".");
    const extension = parts.length > 1 ? `.${parts.pop()}` : "";
    const rawBase = parts.join(".") || "file";

    // Remove chained timestamp-like prefixes (e.g. 1775033_1773417_name.png)
    const baseWithoutNumericPrefix = rawBase.replace(/^(\d{10,}_)+/g, "");
    const normalizedBase = (baseWithoutNumericPrefix || rawBase || "file")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    /** Shorter than Date.now() (13 digits): 10 hex chars, still collision-resistant at scale. */
    const shortId = crypto.randomBytes(5).toString("hex");
    const maxBaseLength = 28;
    const compactBase = normalizedBase.slice(0, maxBaseLength) || "file";
    return `${shortId}_${compactBase}${extension}`;
}

function getPublicBaseUrl() {
    const endpoint = process.env.DO_SPACES_ENDPOINT || "";
    return endpoint.replace(/^https?:\/\//, "");
}

/**
 * Public URL for an object key. Prefer `DO_SPACES_PUBLIC_BASE_URL` (e.g. short CDN / custom domain)
 * so returned URLs are shorter than `https://{bucket}.{region}.digitaloceanspaces.com/...`.
 * Example: DO_SPACES_PUBLIC_BASE_URL=https://cdn.example.com  →  https://cdn.example.com/aroma/banners/...
 */
function buildPublicUrlForKey(key) {
    const trimmedKey = String(key || "").replace(/^\/+/, "");
    const custom = (process.env.DO_SPACES_PUBLIC_BASE_URL || "")
        .trim()
        .replace(/\/+$/, "");
    if (custom) {
        return `${custom}/${trimmedKey}`;
    }
    const bucket = process.env.DO_SPACES_BUCKET;
    const host = getPublicBaseUrl();
    return `https://${bucket}.${host}/${trimmedKey}`;
}

function buildSpacesErrorContext(error) {
    return {
        message: error?.message || "Unknown Spaces error",
        code: error?.Code || error?.code || null,
        statusCode: error?.$metadata?.httpStatusCode || null,
        requestId: error?.RequestId || error?.$metadata?.requestId || null,
        hostId: error?.HostId || null,
    };
}

function validateFolder(folder) {
    if (!folder || typeof folder !== "string") {
        throw new Error("Folder is required for Spaces upload");
    }

    const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
    const rootFolder = normalized.split("/")[0];

    if (!ALLOWED_FOLDERS.includes(rootFolder)) {
        throw new Error(`Invalid folder "${folder}". Allowed folders: ${ALLOWED_FOLDERS.join(", ")}`);
    }

    return normalized;
}

async function uploadFile(file, folder) {
    if (!file) return null;

    const normalizedFolder = validateFolder(folder);
    const fileName = buildCompactFilename(file.originalname);
    const key = `${process.env.MAIN_FOLDER}/${normalizedFolder}/${fileName}`;
    const bucket = process.env.DO_SPACES_BUCKET;

    try {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: "public-read",
            })
        );

        const url = buildPublicUrlForKey(key);
        return { url, key };
    } catch (error) {
        console.error("[Spaces Upload Error]", {
            ...buildSpacesErrorContext(error),
            bucket,
            endpoint: process.env.DO_SPACES_ENDPOINT || null,
            folder: normalizedFolder,
            key,
            originalName: file.originalname,
            contentType: file.mimetype,
        });
        throw error;
    }
}

async function deleteFile(key) {
    if (!key) return;

    const bucket = process.env.DO_SPACES_BUCKET;

    try {
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            })
        );
    } catch (error) {
        console.error("[Spaces Delete Error]", {
            ...buildSpacesErrorContext(error),
            bucket,
            endpoint: process.env.DO_SPACES_ENDPOINT || null,
            key,
        });
        throw error;
    }
}

/**
 * Server-side copy (e.g. rename) within the same bucket.
 */
async function copyObject(sourceKey, destinationKey) {
    const bucket = process.env.DO_SPACES_BUCKET;
    const encodedSource = sourceKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    /** Per S3 API: `bucket/key` with key segments encoded (slashes preserved as `/`). */
    const copySource = `${bucket}/${encodedSource}`;

    try {
        await s3Client.send(
            new CopyObjectCommand({
                Bucket: bucket,
                Key: destinationKey,
                CopySource: copySource,
                ACL: "public-read",
                MetadataDirective: "COPY",
            })
        );
    } catch (error) {
        console.error("[Spaces CopyObject Error]", {
            ...buildSpacesErrorContext(error),
            bucket,
            sourceKey,
            destinationKey,
        });
        throw error;
    }
}

function isSpacesListConfigured() {
    return !!(
        process.env.DO_SPACES_BUCKET &&
        process.env.DO_SPACES_KEY &&
        process.env.DO_SPACES_SECRET &&
        process.env.DO_SPACES_ENDPOINT
    );
}

function getListPrefix() {
    const main = (process.env.MAIN_FOLDER || "").replace(/^\/+|\/+$/g, "");
    return main ? `${main.replace(/\/$/, "")}/` : "";
}

/**
 * Paginated list of all objects under MAIN_FOLDER (for admin Media — S3/Spaces tab).
 * @returns {Promise<Array<{ Key: string, Size: number }>>}
 */
async function listAllObjects() {
    if (!isSpacesListConfigured()) return [];
    const bucket = process.env.DO_SPACES_BUCKET;
    const prefix = getListPrefix();
    const out = [];
    let ContinuationToken;
    try {
        do {
            const resp = await s3Client.send(
                new ListObjectsV2Command({
                    Bucket: bucket,
                    Prefix: prefix || undefined,
                    MaxKeys: 1000,
                    ContinuationToken,
                })
            );
            if (resp.Contents && resp.Contents.length > 0) {
                for (const obj of resp.Contents) {
                    if (!obj.Key || obj.Key.endsWith("/")) continue;
                    out.push({ Key: obj.Key, Size: obj.Size || 0 });
                }
            }
            ContinuationToken = resp.IsTruncated
                ? resp.NextContinuationToken
                : undefined;
        } while (ContinuationToken);
    } catch (error) {
        console.error("[Spaces List Error]", buildSpacesErrorContext(error));
        throw error;
    }
    return out;
}

function stripMainFolderFromKey(key) {
    const main = (process.env.MAIN_FOLDER || "").replace(/^\/+|\/+$/g, "");
    if (!main) return key;
    const p = `${main}/`;
    return key.startsWith(p) ? key.slice(p.length) : key;
}

module.exports = {
    uploadFile,
    deleteFile,
    copyObject,
    listAllObjects,
    isSpacesListConfigured,
    stripMainFolderFromKey,
    buildPublicUrlForKey,
    ALLOWED_FOLDERS,
};
