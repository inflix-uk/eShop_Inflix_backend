// src/utils/blobStorage.js
const { put, del, list } = require('@vercel/blob');

/**
 * Vercel Blob Storage Utility
 * Handles file uploads to Vercel Blob storage
 */
class BlobStorage {
    constructor() {
        this.token = process.env.BLOB_READ_WRITE_TOKEN;
    }

    /**
     * Upload a single file to Vercel Blob
     * @param {Object} file - Multer file object (with buffer from memoryStorage)
     * @param {string} folder - Folder path in blob storage (e.g., 'products')
     * @returns {Promise<Object>} - Upload result with url and pathname
     */
    async uploadFile(file, folder = 'products') {
        try {
            if (!file) return null;

            // Get file buffer from multer memoryStorage
            const fileBuffer = file.buffer;

            if (!fileBuffer) {
                console.error('No buffer found in file object');
                return null;
            }

            // Generate unique filename
            const timestamp = Date.now();
            const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueFilename = `${folder}/${timestamp}_${safeFilename}`;

            console.log(`Uploading to Blob: ${uniqueFilename}`);

            // Upload to Vercel Blob
            const blob = await put(uniqueFilename, fileBuffer, {
                access: 'public',
                token: this.token,
                contentType: file.mimetype
            });

            console.log(`File uploaded to Blob: ${blob.url}`);

            return {
                filename: file.originalname,
                path: blob.pathname,
                url: blob.url,
                size: file.size
            };
        } catch (error) {
            console.error('Error uploading to Vercel Blob:', error);
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

            const uploadPromises = files.map(file => this.uploadFile(file, folder));
            const results = await Promise.all(uploadPromises);

            return results.filter(result => result !== null);
        } catch (error) {
            console.error('Error uploading multiple files to Vercel Blob:', error);
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

            await del(url, { token: this.token });
            console.log(`File deleted from Blob: ${url}`);
        } catch (error) {
            console.error('Error deleting from Vercel Blob:', error);
            // Don't throw - deletion failures shouldn't break the flow
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
            console.error('Error deleting multiple files from Vercel Blob:', error);
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
