// src/utils/blobStorage.js
const { put, del, list } = require('@vercel/blob');
const spacesStorage = require('./uploadToSpaces');
const { optimizeImageForUpload } = require('./imageOptimizer');

/**
 * Vercel Blob Storage Utility
 * Handles file uploads to Vercel Blob storage
 */
class BlobStorage {
    constructor() {
        this.token = process.env.BLOB_READ_WRITE_TOKEN;
        this.storageProvider = process.env.STORAGE_PROVIDER || 'blob';
    }

    useSpaces() {
        return this.storageProvider === 'spaces';
    }

    getActiveProvider() {
        const provider = (process.env.STORAGE_PROVIDER || this.storageProvider || 'blob').trim().toLowerCase();
        return provider === 'spaces' ? 'spaces' : 'blob';
    }

    logStorageError(operation, error, extra = {}) {
        const provider = this.getActiveProvider();
        console.error(`[Storage:${provider}] ${operation} failed`, {
            message: error?.message || 'Unknown storage error',
            code: error?.Code || error?.code || null,
            statusCode: error?.$metadata?.httpStatusCode || null,
            requestId: error?.RequestId || error?.$metadata?.requestId || null,
            hostId: error?.HostId || null,
            ...extra
        });
    }

    /**
     * Upload a single file to Vercel Blob
     * @param {Object} file - Multer file object (with buffer from memoryStorage)
     * @param {string} folder - Folder path in blob storage (e.g., 'products')
     * @param {string|null} preferredBasename - Optional exact filename under folder (e.g. favicon-171234567.png)
     * @returns {Promise<Object>} - Upload result with url and pathname
     */
    async uploadFile(file, folder = 'products', preferredBasename = null) {
        try {
            if (!file) return null;
            const uploadFile = await optimizeImageForUpload(file, folder);

            if (this.getActiveProvider() === 'spaces') {
                const result = await spacesStorage.uploadFile(uploadFile, folder);
                return {
                    filename: uploadFile.originalname,
                    path: result.key,
                    key: result.key,
                    url: result.url,
                    size: uploadFile.size
                };
            }

            // Get file buffer from multer memoryStorage
            const fileBuffer = uploadFile.buffer;

            if (!fileBuffer) {
                console.error('No buffer found in file object');
                return null;
            }

            // Generate unique filename (or use versioned basename when provided)
            const timestamp = Date.now();
            const safeFilename = uploadFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueFilename = preferredBasename
                ? `${folder}/${preferredBasename}`
                : `${folder}/${timestamp}_${safeFilename}`;

            console.log(`Uploading to Blob: ${uniqueFilename}`);

            // Upload to Vercel Blob
            const blob = await put(uniqueFilename, fileBuffer, {
                access: 'public',
                token: this.token,
                contentType: uploadFile.mimetype
            });

            console.log(`File uploaded to Blob: ${blob.url}`);

            return {
                filename: uploadFile.originalname,
                path: blob.pathname,
                url: blob.url,
                size: uploadFile.size
            };
        } catch (error) {
            this.logStorageError('uploadFile', error, { folder, fileName: file?.originalname || null });
            throw error;
        }
    }

    /**
     * Upload multiple files to Vercel Blob
     * @param {Array} files - Array of multer file objects
     * @param {string} folder - Folder path in blob storage
     * @returns {Promise<Array>} - Array of upload results
     */
    async uploadFiles(files, folder = 'products') {
        try {
            if (!files || files.length === 0) return [];

            const uploadPromises = files.map((file) => this.uploadFile(file, folder));
            const results = await Promise.all(uploadPromises);

            return results.filter(result => result !== null);
        } catch (error) {
            this.logStorageError('uploadFiles', error, {
                folder,
                fileCount: Array.isArray(files) ? files.length : 0
            });
            throw error;
        }
    }

    /**
     * Upload product images (thumbnail and gallery)
     * @param {Object} thumbnailFile - Thumbnail multer file object
     * @param {Array} galleryFiles - Array of gallery multer file objects
     * @returns {Promise<Object>} - Object containing thumbnail and gallery results
     */
    async uploadProductImages(thumbnailFile, galleryFiles) {
        try {
            const results = {
                thumbnail: null,
                gallery: []
            };

            // Upload thumbnail
            if (thumbnailFile) {
                results.thumbnail = await this.uploadFile(thumbnailFile, 'products/thumbnails');
            }

            // Upload gallery images
            if (galleryFiles && galleryFiles.length > 0) {
                results.gallery = await this.uploadFiles(galleryFiles, 'products/gallery');
            }

            return results;
        } catch (error) {
            console.error('Error uploading product images:', error);
            throw error;
        }
    }

    /**
     * Upload variant images
     * @param {Object} variantImages - Object with variant keys and file arrays
     * @param {string} folder - Folder path in blob storage
     * @returns {Promise<Object>} - Object with variant keys and uploaded file info
     */
    async uploadVariantImages(variantImages, folder = 'products/variants') {
        try {
            const results = {};

            for (const [variantKey, files] of Object.entries(variantImages)) {
                if (files && files.length > 0) {
                    results[variantKey] = await this.uploadFiles(files, `${folder}/${variantKey}`);
                }
            }

            return results;
        } catch (error) {
            console.error('Error uploading variant images:', error);
            throw error;
        }
    }

    /**
     * Delete a file from Vercel Blob
     * @param {string} url - The URL of the file to delete
     * @returns {Promise<void>}
     */
    async deleteFile(url) {
        try {
            if (!url) return;

            if (this.getActiveProvider() === 'spaces') {
                const key = url.startsWith('http')
                    ? this.extractSpacesKeyFromUrl(url)
                    : url;

                if (!key) return;

                await spacesStorage.deleteFile(key);
                console.log(`File deleted from Spaces: ${key}`);
                return;
            }

            await del(url, { token: this.token });
            console.log(`File deleted from Blob: ${url}`);
        } catch (error) {
            this.logStorageError('deleteFile', error, { target: url || null });
            // Don't throw - deletion failures shouldn't break the flow
        }
    }

    extractSpacesKeyFromUrl(url) {
        try {
            const parsed = new URL(url);
            return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
        } catch (error) {
            return null;
        }
    }

    /**
     * Delete multiple files from Vercel Blob
     * @param {Array} urls - Array of URLs to delete
     * @returns {Promise<void>}
     */
    async deleteFiles(urls) {
        try {
            if (!urls || urls.length === 0) return;

            const deletePromises = urls.map(url => this.deleteFile(url));
            await Promise.all(deletePromises);
        } catch (error) {
            this.logStorageError('deleteFiles', error, {
                fileCount: Array.isArray(urls) ? urls.length : 0
            });
        }
    }

    /**
     * Paginated list of all blobs (for admin Media library).
     * @returns {Promise<Array<{ url: string, pathname: string, size: number, uploadedAt: Date }>>}
     */
    async listAllBlobs() {
        if (!this.token) return [];
        const limit = 1000;
        let cursor;
        const out = [];
        try {
            do {
                const page = await list({
                    token: this.token,
                    limit,
                    cursor,
                });
                if (page.blobs && page.blobs.length > 0) {
                    out.push(...page.blobs);
                }
                cursor = page.hasMore ? page.cursor : undefined;
            } while (cursor);
        } catch (error) {
            console.error('Error listing Vercel Blobs:', error);
            throw error;
        }
        return out;
    }

    /**
     * Check if Blob storage is configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.token;
    }
}

module.exports = new BlobStorage();
