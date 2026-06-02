const { S3Client } = require("@aws-sdk/client-s3");

const S3_STORAGE_PROVIDERS = new Set(["spaces", "digitalocean", "garage"]);

let cachedClient = null;
let cachedClientKey = "";

function normalizeStorageProvider() {
    const raw = (process.env.STORAGE_PROVIDER || "digitalocean")
        .trim()
        .toLowerCase();
    if (raw === "spaces") return "digitalocean";
    return raw;
}

function parseHostnameFromEndpointInput(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";
    try {
        if (/^https?:\/\//i.test(trimmed)) {
            return new URL(trimmed).hostname;
        }
    } catch {
        /* fall through */
    }
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
}

/**
 * Coolify Garage often exposes only the service id (garage-x...).
 * Expand to https://garage-x....{serverIp}.sslip.io when suffix or server IP is set.
 */
function expandBareGarageEndpoint(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return trimmed;

    const host = parseHostnameFromEndpointInput(trimmed);
    if (!host || host.includes(".")) return trimmed;

    if (!/^garage-[a-z0-9]+$/i.test(host)) return trimmed;

    const suffix = (
        process.env.DO_SPACES_ENDPOINT_SUFFIX ||
        process.env.GARAGE_ENDPOINT_SUFFIX ||
        ""
    ).trim();
    const serverIp = (
        process.env.DO_SPACES_SERVER_IP ||
        process.env.GARAGE_SERVER_IP ||
        ""
    ).trim();

    let hostSuffix = suffix;
    if (!hostSuffix && serverIp) {
        hostSuffix = `.${serverIp}.sslip.io`;
    }
    if (!hostSuffix) return trimmed;

    const sfx = hostSuffix.startsWith(".") ? hostSuffix : `.${hostSuffix}`;
    return `https://${host}${sfx}`;
}

function resolveEndpointUrl() {
    const raw = (
        process.env.DO_SPACES_S3_ENDPOINT ||
        process.env.DO_SPACES_ENDPOINT ||
        ""
    ).trim();
    if (!raw) return "";

    let endpoint = expandBareGarageEndpoint(raw);
    if (!/^https?:\/\//i.test(endpoint)) {
        endpoint = `https://${endpoint}`;
    }
    return endpoint.replace(/\/+$/, "");
}

function endpointHostnameLooksLikeGarage(hostname) {
    return /^garage-[a-z0-9]+/i.test(hostname || "");
}

function isGarageStorage() {
    if (normalizeStorageProvider() === "garage") return true;
    const host = parseHostnameFromEndpointInput(resolveEndpointUrl());
    return endpointHostnameLooksLikeGarage(host);
}

function isS3StorageProvider() {
    return S3_STORAGE_PROVIDERS.has(
        (process.env.STORAGE_PROVIDER || "digitalocean").trim().toLowerCase()
    );
}

function getS3Region() {
    if (process.env.DO_SPACES_REGION) return process.env.DO_SPACES_REGION;
    return isGarageStorage() ? "garage" : "nyc3";
}

function getClientCacheKey() {
    return [
        resolveEndpointUrl(),
        getS3Region(),
        isGarageStorage(),
        process.env.DO_SPACES_KEY || "",
        process.env.DO_SPACES_SECRET || "",
    ].join("|");
}

function getS3Client() {
    const key = getClientCacheKey();
    if (cachedClient && cachedClientKey === key) {
        return cachedClient;
    }

    const endpoint = resolveEndpointUrl();
    cachedClient = new S3Client({
        endpoint: endpoint || undefined,
        region: getS3Region(),
        credentials: {
            accessKeyId: process.env.DO_SPACES_KEY,
            secretAccessKey: process.env.DO_SPACES_SECRET,
        },
        forcePathStyle: isGarageStorage(),
    });
    cachedClientKey = key;
    return cachedClient;
}

function formatS3DnsError(error) {
    const code = error?.code || error?.errno || "";
    const msg = error?.message || "";
    if (
        !/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(`${code} ${msg}`)
    ) {
        return null;
    }
    const endpoint = resolveEndpointUrl() || process.env.DO_SPACES_ENDPOINT || "";
    const host = parseHostnameFromEndpointInput(endpoint);
    let hint =
        "Set DO_SPACES_ENDPOINT to the full S3 API URL from your Garage/Coolify dashboard (including domain), e.g. https://garage-x....31.97.59.14.sslip.io";
    if (host && !host.includes(".")) {
        hint +=
            " Or set DO_SPACES_SERVER_IP (e.g. 31.97.59.14) or DO_SPACES_ENDPOINT_SUFFIX (e.g. .31.97.59.14.sslip.io) to expand a bare garage-x... id.";
    }
    return hint;
}

module.exports = {
    S3_STORAGE_PROVIDERS,
    normalizeStorageProvider,
    resolveEndpointUrl,
    expandBareGarageEndpoint,
    isGarageStorage,
    isS3StorageProvider,
    getS3Client,
    getS3Region,
    formatS3DnsError,
    parseHostnameFromEndpointInput,
};
