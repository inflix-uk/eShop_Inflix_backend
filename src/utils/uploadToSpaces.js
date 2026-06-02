const crypto = require("crypto");
const {
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    CopyObjectCommand,
} = require("@aws-sdk/client-s3");
const s3Client = require("./s3");
const {
    isGarageStorage,
    resolvePublicEndpointUrl,
    resolveS3ApiEndpointUrl,
    resolveGarageApiMediaBaseUrl,
    resolveGarageFlatPublicBaseUrl,
    resolveGarageWebRootDomain,
    buildGarageWebPublicUrl,
    formatS3ConnectionError,
    preloadGarageServerIp,
} = require("./s3Config");

async function ensureS3Ready() {
    await preloadGarageServerIp();
}

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
    const endpoint =
        resolvePublicEndpointUrl() || process.env.DO_SPACES_ENDPOINT || "";
    return endpoint.replace(/^https?:\/\//, "");
}

function normalizeEndpointUrl(endpoint) {
    const trimmed = String(endpoint || resolvePublicEndpointUrl() || "")
        .trim()
        .replace(/\/+$/, "");
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** S3 object keys use literal `/` separators — never `%2F` in the key string sent to PutObject/List/Delete. */
function normalizeS3ObjectKey(key) {
    return String(key || "")
        .replace(/^\/+/, "")
        .replace(/\\/g, "/")
        .replace(/%2F/gi, "/");
}

/** Encode each path segment for browser URLs; keep `/` as real path separators. */
function encodePublicUrlKeyPath(key) {
    const trimmed = normalizeS3ObjectKey(key);
    if (!trimmed) return "";
    return trimmed
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

function decodeUrlPathSegments(path) {
    return String(path || "")
        .split("/")
        .map((segment) => {
            if (!segment) return segment;
            try {
                return decodeURIComponent(segment);
            } catch {
                return segment;
            }
        })
        .join("/");
}

/**
 * Public URL for an object key. Prefer `DO_SPACES_PUBLIC_BASE_URL` (e.g. short CDN / custom domain)
 * so returned URLs are shorter than `https://{bucket}.{region}.digitaloceanspaces.com/...`.
 * Example: DO_SPACES_PUBLIC_BASE_URL=https://cdn.example.com  →  https://cdn.example.com/aroma/banners/...
 *
 * Garage (s3_web website): `https://{bucket}{webRootDomain}/{key}` — S3 API URLs are not public.
 * DigitalOcean (virtual-host): `https://{bucket}.{host}/{key}`
 */
function buildPublicUrlForKey(key) {
    const urlKey = encodePublicUrlKeyPath(key);
    const custom = (process.env.DO_SPACES_PUBLIC_BASE_URL || "")
        .trim()
        .replace(/\/+$/, "");
    if (custom) {
        return `${custom}/${urlKey}`;
    }
    const bucket = process.env.DO_SPACES_BUCKET;
    if (isGarageStorage()) {
        const apiBase = resolveGarageApiMediaBaseUrl();
        if (apiBase) return `${apiBase}/${urlKey}`;
        const flatBase = resolveGarageFlatPublicBaseUrl();
        if (flatBase) return `${flatBase}/${urlKey}`;
        const webUrl = buildGarageWebPublicUrl(bucket, urlKey);
        if (webUrl) return webUrl;
        const base = normalizeEndpointUrl(resolvePublicEndpointUrl());
        return `${base}/${bucket}/${urlKey}`;
    }
    const host = getPublicBaseUrl();
    return `https://${bucket}.${host}/${urlKey}`;
}

/**
 * Extract object key from a public URL (custom base, path-style, or virtual-host).
 */
function extractKeyFromGaragePublicBase(url, base) {
    if (!base) return null;
    try {
        const baseUrl = new URL(`${base.replace(/\/+$/, "")}/`);
        const parsed = new URL(url);
        if (parsed.origin !== baseUrl.origin) return null;
        return normalizeS3ObjectKey(
            decodeUrlPathSegments(parsed.pathname.replace(/^\/+/, ""))
        );
    } catch {
        return null;
    }
}

function extractKeyFromGarageWebHost(parsed, bucket) {
    const rootDomain = resolveGarageWebRootDomain();
    if (!rootDomain || !bucket) return null;
    const suffix = rootDomain.startsWith(".")
        ? rootDomain.slice(1)
        : rootDomain;
    const host = parsed.hostname || "";
    if (!host.endsWith(suffix) || host.length <= suffix.length + 1) {
        return null;
    }
    const hostBucket = host.slice(0, -(suffix.length + 1));
    if (hostBucket !== bucket) return null;
    return normalizeS3ObjectKey(
        decodeUrlPathSegments(parsed.pathname.replace(/^\/+/, ""))
    );
}

function extractKeyFromPublicUrl(url) {
    try {
        const parsed = new URL(url);
        const bucket = process.env.DO_SPACES_BUCKET;

        if (isGarageStorage() && bucket) {
            const apiKey = extractKeyFromGaragePublicBase(
                url,
                resolveGarageApiMediaBaseUrl()
            );
            if (apiKey) return apiKey;
            const flatKey = extractKeyFromGaragePublicBase(
                url,
                resolveGarageFlatPublicBaseUrl()
            );
            if (flatKey) return flatKey;
            const webKey = extractKeyFromGarageWebHost(parsed, bucket);
            if (webKey) return webKey;
        }

        let path = decodeUrlPathSegments(parsed.pathname.replace(/^\/+/, ""));
        if (isGarageStorage() && bucket && path.startsWith(`${bucket}/`)) {
            path = path.slice(bucket.length + 1);
        }
        return normalizeS3ObjectKey(path);
    } catch {
        return null;
    }
}

function buildSpacesErrorContext(error) {
    const dnsHint = formatS3ConnectionError(error);
    return {
        message: error?.message || "Unknown Spaces error",
        code: error?.Code || error?.code || null,
        statusCode: error?.$metadata?.httpStatusCode || null,
        requestId: error?.RequestId || error?.$metadata?.requestId || null,
        hostId: error?.HostId || null,
        endpoint: resolveS3ApiEndpointUrl() || null,
        storageProvider: process.env.STORAGE_PROVIDER || null,
        ...(dnsHint ? { hint: dnsHint } : {}),
    };
}

function validateFolder(folder) {
    if (!folder || typeof folder !== "string") {
        throw new Error("Folder is required for Spaces upload");
    }

    const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
    if (!normalized) {
        throw new Error("Folder is required for Spaces upload");
    }
    if (normalized.includes("..") || normalized.includes("\\") || normalized.includes("\0")) {
        throw new Error(`Invalid folder "${folder}"`);
    }

    return normalized;
}

function isSpacesUploadPathAllowed(folder) {
    try {
        validateFolder(folder);
        return true;
    } catch {
        return false;
    }
}

async function uploadFile(file, folder) {
    if (!file) return null;
    await ensureS3Ready();

    const normalizedFolder = validateFolder(folder);
    const fileName = buildCompactFilename(file.originalname);
    const key = normalizeS3ObjectKey(
        `${process.env.MAIN_FOLDER}/${normalizedFolder}/${fileName}`
    );
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
            endpoint: resolveS3ApiEndpointUrl() || null,
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
    await ensureS3Ready();

    const bucket = process.env.DO_SPACES_BUCKET;
    const objectKey = normalizeS3ObjectKey(key);

    try {
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: objectKey,
            })
        );
    } catch (error) {
        console.error("[Spaces Delete Error]", {
            ...buildSpacesErrorContext(error),
            bucket,
            endpoint: resolveS3ApiEndpointUrl() || null,
            key,
        });
        throw error;
    }
}

/**
 * Server-side copy (e.g. rename) within the same bucket.
 */
async function copyObject(sourceKey, destinationKey) {
    await ensureS3Ready();
    const bucket = process.env.DO_SPACES_BUCKET;
    const normalizedSource = normalizeS3ObjectKey(sourceKey);
    const normalizedDestination = normalizeS3ObjectKey(destinationKey);
    const encodedSource = normalizedSource
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    /** Per S3 API: `bucket/key` with key segments encoded (slashes preserved as `/`). */
    const copySource = `${bucket}/${encodedSource}`;

    try {
        await s3Client.send(
            new CopyObjectCommand({
                Bucket: bucket,
                Key: normalizedDestination,
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
    await ensureS3Ready();
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
                    out.push({
                        Key: normalizeS3ObjectKey(obj.Key),
                        Size: obj.Size || 0,
                    });
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
    isSpacesUploadPathAllowed,
    stripMainFolderFromKey,
    buildPublicUrlForKey,
    extractKeyFromPublicUrl,
    normalizeS3ObjectKey,
};
