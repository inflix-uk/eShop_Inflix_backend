const dns = require("dns");
const { S3Client } = require("@aws-sdk/client-s3");
const dnsLookup = dns.promises.lookup;

const S3_STORAGE_PROVIDERS = new Set(["spaces", "digitalocean", "garage"]);
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

let cachedClient = null;
let cachedClientKey = "";
let garageServerIpCache = null;
let garageServerIpPreloadPromise = null;

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

function needsBareGarageEndpointExpansion() {
    const raw =
        process.env.DO_SPACES_S3_ENDPOINT ||
        process.env.DO_SPACES_ENDPOINT ||
        "";
    const host = parseHostnameFromEndpointInput(raw);
    return /^garage-[a-z0-9]+$/i.test(host) && !host.includes(".");
}

/**
 * Infer Coolify server IP when Garage and API run on the same host.
 * Uses BACKEND_URL / API_URL DNS (e.g. api.spectrotech.co.uk → 31.97.59.14).
 */
function inferGarageServerIp() {
    const explicit = (
        process.env.DO_SPACES_SERVER_IP ||
        process.env.GARAGE_SERVER_IP ||
        process.env.SERVER_IP ||
        ""
    ).trim();
    if (explicit) return explicit;
    return garageServerIpCache || "";
}

async function resolveGarageServerIpFromDns() {
    const explicit = (
        process.env.DO_SPACES_SERVER_IP ||
        process.env.GARAGE_SERVER_IP ||
        process.env.SERVER_IP ||
        ""
    ).trim();
    if (explicit) {
        garageServerIpCache = explicit;
        return explicit;
    }

    const candidates = [
        process.env.BACKEND_URL,
        process.env.API_URL,
        process.env.PUBLIC_API_URL,
    ].filter(Boolean);

    for (const urlStr of candidates) {
        try {
            const hostname = new URL(urlStr).hostname;
            if (IPV4_RE.test(hostname)) {
                garageServerIpCache = hostname;
                return hostname;
            }
            const result = await dnsLookup(hostname, { family: 4 });
            if (result?.address) {
                garageServerIpCache = result.address;
                return result.address;
            }
        } catch {
            /* try next */
        }
    }
    return "";
}

/**
 * Resolve BACKEND_URL → server IP before first S3 list (Coolify bare garage-x endpoints).
 */
function preloadGarageServerIp() {
    if (!needsBareGarageEndpointExpansion()) {
        return Promise.resolve("");
    }
    if (garageServerIpPreloadPromise) return garageServerIpPreloadPromise;
    garageServerIpPreloadPromise = resolveGarageServerIpFromDns()
        .then((ip) => {
            if (ip && process.env.NODE_ENV !== "test") {
                console.info(
                    `[S3] Garage server IP for endpoint expansion: ${ip}`
                );
            }
            return ip;
        })
        .catch((err) => {
            console.warn(
                "[S3] Could not infer Garage server IP from BACKEND_URL:",
                err.message
            );
            return "";
        });
    return garageServerIpPreloadPromise;
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
    const serverIp = inferGarageServerIp();

    let hostSuffix = suffix;
    if (!hostSuffix && serverIp) {
        hostSuffix = `.${serverIp}.sslip.io`;
    }
    if (!hostSuffix) return trimmed;

    const sfx = hostSuffix.startsWith(".") ? hostSuffix : `.${hostSuffix}`;
    const expanded = `https://${host}${sfx}`;
    if (process.env.NODE_ENV !== "test") {
        console.info(
            `[S3] Expanded bare Garage endpoint "${host}" → ${expanded}` +
                (process.env.DO_SPACES_SERVER_IP || process.env.GARAGE_SERVER_IP
                    ? ""
                    : ` (inferred server IP ${serverIp} from BACKEND_URL/API_URL)`)
        );
    }
    return expanded;
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

function assertGarageEndpointResolvable(endpoint) {
    const host = parseHostnameFromEndpointInput(endpoint);
    if (!endpointHostnameLooksLikeGarage(host) || host.includes(".")) return;
    const err = new Error(
        `Garage S3 endpoint "${host}" is not a public hostname. Set DO_SPACES_ENDPOINT to the full Coolify S3 URL ` +
            `(e.g. https://${host}.31.97.59.14.sslip.io), or set DO_SPACES_SERVER_IP / DO_SPACES_ENDPOINT_SUFFIX, ` +
            `or ensure BACKEND_URL resolves to your server IP.`
    );
    err.code = "GARAGE_ENDPOINT_UNRESOLVED";
    throw err;
}

async function getS3ClientAsync() {
    await preloadGarageServerIp();
    return getS3Client();
}

function getS3Client() {
    const key = getClientCacheKey();
    if (cachedClient && cachedClientKey === key) {
        return cachedClient;
    }

    const endpoint = resolveEndpointUrl();
    assertGarageEndpointResolvable(endpoint);
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
    const inferredIp = inferGarageServerIp();
    let hint =
        "Set DO_SPACES_ENDPOINT to the full S3 API URL from your Garage/Coolify dashboard (including domain), e.g. https://garage-x....31.97.59.14.sslip.io";
    if (host && !host.includes(".")) {
        hint +=
            " Or set DO_SPACES_SERVER_IP (e.g. 31.97.59.14) or DO_SPACES_ENDPOINT_SUFFIX (e.g. .31.97.59.14.sslip.io) to expand a bare garage-x... id.";
        if (!inferredIp) {
            hint +=
                " BACKEND_URL could not be resolved to infer the server IP — set BACKEND_URL=https://api.spectrotech.co.uk on the API service.";
        }
    }
    if (endpoint && endpoint !== process.env.DO_SPACES_ENDPOINT) {
        hint += ` Resolved endpoint used: ${endpoint}.`;
    }
    return hint;
}

module.exports = {
    S3_STORAGE_PROVIDERS,
    normalizeStorageProvider,
    resolveEndpointUrl,
    expandBareGarageEndpoint,
    inferGarageServerIp,
    preloadGarageServerIp,
    needsBareGarageEndpointExpansion,
    isGarageStorage,
    isS3StorageProvider,
    getS3Client,
    getS3ClientAsync,
    getS3Region,
    formatS3DnsError,
    parseHostnameFromEndpointInput,
};
