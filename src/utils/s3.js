const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.DO_SPACES_ENDPOINT,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
});

module.exports = s3Client;
