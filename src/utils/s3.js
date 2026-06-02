const { S3Client } = require("@aws-sdk/client-s3");

const S3_STORAGE_PROVIDERS = new Set(["spaces", "digitalocean", "garage"]);

function normalizeStorageProvider() {
    const raw = (process.env.STORAGE_PROVIDER || "digitalocean")
        .trim()
        .toLowerCase();
    if (raw === "spaces") return "digitalocean";
    return raw;
}

function isGarageStorage() {
    return normalizeStorageProvider() === "garage";
}

function isS3StorageProvider() {
    return S3_STORAGE_PROVIDERS.has(
        (process.env.STORAGE_PROVIDER || "digitalocean").trim().toLowerCase()
    );
}

const isGarage = isGarageStorage();

const s3Client = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region:
        process.env.DO_SPACES_REGION || (isGarage ? "garage" : "nyc3"),
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: isGarage,
});

module.exports = s3Client;
module.exports.isGarageStorage = isGarageStorage;
module.exports.isS3StorageProvider = isS3StorageProvider;
module.exports.normalizeStorageProvider = normalizeStorageProvider;
