const {
    getS3Client,
    isGarageStorage,
    isS3StorageProvider,
    normalizeStorageProvider,
    resolveEndpointUrl,
    formatS3DnsError,
} = require("./s3Config");

/** Proxy so existing `require("./s3")` callers keep using `.send()` with lazy, env-aware client. */
const s3ClientProxy = new Proxy(
    {},
    {
        get(_target, prop) {
            if (prop === "isGarageStorage") return isGarageStorage;
            if (prop === "isS3StorageProvider") return isS3StorageProvider;
            if (prop === "normalizeStorageProvider")
                return normalizeStorageProvider;
            if (prop === "resolveEndpointUrl") return resolveEndpointUrl;
            if (prop === "formatS3DnsError") return formatS3DnsError;
            if (prop === "getS3Client") return getS3Client;

            const client = getS3Client();
            const value = client[prop];
            return typeof value === "function" ? value.bind(client) : value;
        },
    }
);

module.exports = s3ClientProxy;
