const dns = require("dns");
const https = require("https");
const { S3Client } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
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

function normalizeEndpointString(raw, { defaultScheme = "https" } = {}) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";
    let endpoint = expandBareGarageEndpoint(trimmed);
    if (!/^https?:\/\//i.test(endpoint)) {
        endpoint = `${defaultScheme}://${endpoint}`;
    }
    return endpoint.replace(/\/+$/, "");
}

/** HTTPS/sslip URL for browser-facing object links (Coolify proxy). */
function resolvePublicEndpointUrl() {
    const raw = (process.env.DO_SPACES_ENDPOINT || "").trim();
    if (!raw) return "";
    return normalizeEndpointString(raw, { defaultScheme: "https" });
}

/**
 * Serve public media through the API (/uploads/... proxy) when Garage s3_web is unavailable.
 * Default on; set DO_SPACES_SERVE_MEDIA_VIA_API=false to use webpreview / s3_web URLs only.
 */
function resolveGarageApiMediaBaseUrl() {
    const raw = (process.env.DO_SPACES_SERVE_MEDIA_VIA_API || "")
        .trim()
        .toLowerCase();
    if (["false", "0", "no", "off"].includes(raw)) return "";
    if (!isGarageStorage()) return "";

    for (const candidate of [
        process.env.BACKEND_URL,
        process.env.API_URL,
        process.env.PUBLIC_API_URL,
    ]) {
        const u = (candidate || "").trim();
        if (u) {
            return normalizeEndpointString(u, { defaultScheme: "https" });
        }
    }
    return "";
}

/**
 * When API and public hosts differ (e.g. s3api.* vs webpreview.*), DO_SPACES_ENDPOINT is the
 * full browser origin for objects — https://webpreview.example.com/uploads/...
 * Not used when {@link resolveGarageApiMediaBaseUrl} is active (default).
 */
function resolveGarageFlatPublicBaseUrl() {
    const explicit = (process.env.DO_SPACES_PUBLIC_BASE_URL || "").trim();
    if (explicit) {
        return normalizeEndpointString(explicit, { defaultScheme: "https" });
    }
    const s3Raw = (process.env.DO_SPACES_S3_ENDPOINT || "").trim();
    const webRaw = (process.env.DO_SPACES_ENDPOINT || "").trim();
    if (!s3Raw || !webRaw) return "";
    const s3Host = parseHostnameFromEndpointInput(s3Raw);
    const webHost = parseHostnameFromEndpointInput(webRaw);
    if (s3Host && webHost && s3Host !== webHost) {
        return normalizeEndpointString(webRaw, { defaultScheme: "https" });
    }
    return "";
}

/**
 * Garage s3_web root_domain (see garage.toml [s3_web] root_domain).
 * Public objects are served at https://{bucket}{rootDomain}/{key}, not via the S3 API path-style URL.
 * Skipped when {@link resolveGarageFlatPublicBaseUrl} applies (split API vs web host).
 */
function resolveGarageWebRootDomain() {
    if (resolveGarageApiMediaBaseUrl() || resolveGarageFlatPublicBaseUrl()) {
        return "";
    }

    const explicit = (
        process.env.GARAGE_WEB_ROOT_DOMAIN ||
        process.env.DO_SPACES_WEB_ROOT_DOMAIN ||
        ""
    ).trim();
    if (explicit) {
        return explicit.startsWith(".") ? explicit : `.${explicit}`;
    }

    const webEndpoint = (
        process.env.GARAGE_WEB_ENDPOINT ||
        process.env.DO_SPACES_WEB_ENDPOINT ||
        ""
    ).trim();
    if (webEndpoint) {
        const host = parseHostnameFromEndpointInput(webEndpoint);
        return host ? `.${host}` : "";
    }

    if (!isGarageStorage()) return "";
    const apiHost = parseHostnameFromEndpointInput(resolvePublicEndpointUrl());
    return apiHost ? `.${apiHost}` : "";
}

function resolveGarageWebUrlScheme() {
    const webEndpoint = (
        process.env.GARAGE_WEB_ENDPOINT ||
        process.env.DO_SPACES_WEB_ENDPOINT ||
        ""
    ).trim();
    if (webEndpoint && /^http:\/\//i.test(webEndpoint)) return "http";
    return "https";
}

/**
 * Browser URL for a Garage website bucket (anonymous read on s3_web, port 3902).
 * Example: bucket spectro, root .s3-foo.sslip.io → https://spectro.s3-foo.sslip.io/uploads/logo/x.png
 */
function buildGarageWebPublicUrl(bucket, urlKey) {
    const rootDomain = resolveGarageWebRootDomain();
    if (!rootDomain || !bucket || !urlKey) return null;
    const scheme = resolveGarageWebUrlScheme();
    return `${scheme}://${bucket}${rootDomain}/${urlKey}`;
}

function useInternalGarageS3Endpoint() {
    const raw = process.env.DO_SPACES_S3_USE_INTERNAL;
    if (raw !== undefined && String(raw).trim() !== "") {
        return !["0", "false", "no", "off"].includes(
            String(raw).trim().toLowerCase()
        );
    }
    return (
        normalizeStorageProvider() === "garage" ||
        needsBareGarageEndpointExpansion() ||
        endpointHostnameLooksLikeGarage(
            parseHostnameFromEndpointInput(process.env.DO_SPACES_ENDPOINT)
        )
    );
}

/**
 * S3 API URL for the AWS SDK. Prefer internal HTTP :3900 (real Garage API);
 * Coolify HTTPS sslip routes often return non-XML (e.g. JSON "null").
 */
function resolveS3ApiEndpointUrl() {
    const s3Explicit = (process.env.DO_SPACES_S3_ENDPOINT || "").trim();
    if (s3Explicit) {
        return normalizeEndpointString(s3Explicit, {
            defaultScheme: s3Explicit.includes(":") ? "http" : "https",
        });
    }

    if (useInternalGarageS3Endpoint()) {
        const internalHost = (
            process.env.DO_SPACES_S3_INTERNAL_HOST ||
            process.env.GARAGE_S3_HOST ||
            ""
        ).trim();
        const port = (process.env.DO_SPACES_S3_PORT || "3900").trim();
        if (internalHost) {
            if (/^https?:\/\//i.test(internalHost)) {
                return internalHost.replace(/\/+$/, "");
            }
            return `http://${internalHost.replace(/\/+$/, "")}:${port}`;
        }
        const ip = inferGarageServerIp();
        if (ip) {
            const internal = `http://${ip}:${port}`;
            if (process.env.NODE_ENV !== "test") {
                console.info(
                    `[S3] Using internal Garage S3 API at ${internal} (set DO_SPACES_S3_ENDPOINT to override)`
                );
            }
            return internal;
        }
    }

    return resolvePublicEndpointUrl();
}

/** @deprecated Alias for public URL; SDK uses {@link resolveS3ApiEndpointUrl}. */
function resolveEndpointUrl() {
    return resolvePublicEndpointUrl();
}

function endpointHostnameLooksLikeGarage(hostname) {
    return /^garage-[a-z0-9]+/i.test(hostname || "");
}

function isGarageStorage() {
    if (normalizeStorageProvider() === "garage") return true;
    const hosts = [
        parseHostnameFromEndpointInput(process.env.DO_SPACES_ENDPOINT),
        parseHostnameFromEndpointInput(process.env.DO_SPACES_S3_ENDPOINT),
        parseHostnameFromEndpointInput(resolveS3ApiEndpointUrl()),
    ];
    return hosts.some(endpointHostnameLooksLikeGarage);
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

/**
 * Coolify/sslip.io Garage endpoints often use self-signed certs.
 * Opt out with DO_SPACES_TLS_INSECURE=false (or DO_SPACES_TLS_REJECT_UNAUTHORIZED=true).
 */
function shouldAllowInsecureTls() {
    const raw =
        process.env.DO_SPACES_TLS_INSECURE ??
        process.env.DO_SPACES_INSECURE_SSL ??
        process.env.GARAGE_TLS_INSECURE;
    if (raw !== undefined && String(raw).trim() !== "") {
        const v = String(raw).trim().toLowerCase();
        if (["0", "false", "no", "off"].includes(v)) return false;
        if (["1", "true", "yes", "on"].includes(v)) return true;
    }
    const strict =
        process.env.DO_SPACES_TLS_REJECT_UNAUTHORIZED ??
        process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (strict !== undefined && String(strict).trim() !== "") {
        return !["1", "true", "yes", "on"].includes(
            String(strict).trim().toLowerCase()
        );
    }
    const apiEndpoint = resolveS3ApiEndpointUrl();
    return isGarageStorage() && /^https:/i.test(apiEndpoint);
}

function buildS3RequestHandler() {
    if (!shouldAllowInsecureTls()) return undefined;
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    return new NodeHttpHandler({ httpsAgent });
}

function getClientCacheKey() {
    return [
        resolveS3ApiEndpointUrl(),
        getS3Region(),
        isGarageStorage(),
        shouldAllowInsecureTls(),
        process.env.DO_SPACES_KEY || "",
        process.env.DO_SPACES_SECRET || "",
    ].join("|");
}

function assertGarageEndpointResolvable(endpoint) {
    const host = parseHostnameFromEndpointInput(endpoint);
    if (!endpointHostnameLooksLikeGarage(host) || host.includes(".")) return;
    if (useInternalGarageS3Endpoint() && inferGarageServerIp()) return;
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

    const endpoint = resolveS3ApiEndpointUrl();
    assertGarageEndpointResolvable(endpoint);
    const requestHandler = buildS3RequestHandler();
    const clientConfig = {
        endpoint: endpoint || undefined,
        region: getS3Region(),
        credentials: {
            accessKeyId: process.env.DO_SPACES_KEY,
            secretAccessKey: process.env.DO_SPACES_SECRET,
        },
        forcePathStyle: isGarageStorage(),
    };
    if (requestHandler) {
        clientConfig.requestHandler = requestHandler;
        if (process.env.NODE_ENV !== "test") {
            console.info(
                "[S3] TLS certificate verification disabled for Garage/Coolify endpoint"
            );
        }
    }
    cachedClient = new S3Client(clientConfig);
    cachedClientKey = key;
    return cachedClient;
}

function formatS3TlsError(error) {
    const msg = error?.message || "";
    if (!/self[- ]signed certificate|unable to verify the first certificate|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(msg)) {
        return null;
    }
    return (
        "Garage/Coolify S3 uses a self-signed TLS certificate. Deploy the latest API build (auto-disables TLS verify for STORAGE_PROVIDER=garage) " +
        "or set DO_SPACES_TLS_INSECURE=true. Prefer a valid cert on your Garage reverse proxy in production."
    );
}

function extractS3RawResponseSnippet(error) {
    try {
        const body = error?.$response?.body;
        if (!body) return null;
        const text =
            typeof body === "string"
                ? body
                : Buffer.isBuffer(body)
                  ? body.toString("utf8")
                  : body instanceof Uint8Array
                    ? Buffer.from(body).toString("utf8")
                    : null;
        if (!text) return null;
        return text.trim().slice(0, 400);
    } catch {
        return null;
    }
}

function formatS3DeserializationError(error) {
    const msg = error?.message || "";
    if (!/deserialization error|char .* is not expected/i.test(msg)) {
        return null;
    }
    const raw = extractS3RawResponseSnippet(error);
    const status = error?.$response?.statusCode;
    let hint =
        "The S3 API returned a non-XML response (wrong URL or proxy). For Coolify/Garage, set DO_SPACES_S3_ENDPOINT to the internal S3 API, e.g. http://127.0.0.1:3900 or http://<docker-service-name>:3900. Keep DO_SPACES_ENDPOINT for public browser URLs.";
    if (status) hint += ` HTTP ${status}.`;
    if (raw) hint += ` Response preview: ${raw}`;
    return hint;
}

function formatS3DnsError(error) {
    const code = error?.code || error?.errno || "";
    const msg = error?.message || "";
    if (
        !/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(`${code} ${msg}`)
    ) {
        return null;
    }
    const endpoint =
        resolveS3ApiEndpointUrl() ||
        process.env.DO_SPACES_ENDPOINT ||
        "";
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

function formatS3ConnectionError(error) {
    return (
        formatS3DeserializationError(error) ||
        formatS3TlsError(error) ||
        formatS3DnsError(error)
    );
}

module.exports = {
    S3_STORAGE_PROVIDERS,
    normalizeStorageProvider,
    resolveEndpointUrl,
    resolvePublicEndpointUrl,
    resolveS3ApiEndpointUrl,
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
    formatS3TlsError,
    formatS3DeserializationError,
    formatS3ConnectionError,
    extractS3RawResponseSnippet,
    shouldAllowInsecureTls,
    parseHostnameFromEndpointInput,
    resolveGarageApiMediaBaseUrl,
    resolveGarageFlatPublicBaseUrl,
    resolveGarageWebRootDomain,
    buildGarageWebPublicUrl,
};
