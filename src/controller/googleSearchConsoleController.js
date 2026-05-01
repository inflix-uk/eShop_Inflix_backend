// controller/googleSearchConsoleController.js
const db = require('../../connections/mongo');
const SiteMetaTags = require('../models/siteMetaTags');
const auditLogService = require('../services/auditLogService');

// Helper function to sanitize input
function sanitizeInput(input) {
    if (!input) return '';
    // Remove HTML tags and dangerous characters
    return input.trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"]/g, ''); // Remove potentially dangerous characters
}

// Helper function to validate verification code
function validateVerificationCode(code) {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: 'Verification code must be a non-empty string' };
    }

    const trimmed = code.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Verification code cannot be empty' };
    }

    // Google Search Console verification codes are typically alphanumeric with hyphens
    // Allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
        return { valid: false, error: 'Verification code contains invalid characters' };
    }

    return { valid: true };
}

const googleSearchConsoleController = {

    /**
     * GET /api/get/google-search-console-verification
     * Get the current Google Search Console verification code
     */
    getVerificationCode: async (req, res) => {
        const start = Date.now();
        try {
            const metaTag = await SiteMetaTags.findOne({
                type: 'google_search_console',
                isActive: true
            }).lean();

            auditLogService.logExternalApi({
                provider: 'google',
                action: 'search_console.get_verification',
                success: true,
                req,
                durationMs: Date.now() - start,
                metadata: { found: !!metaTag },
            }).catch(() => {});

            if (!metaTag) {
                return res.status(200).json({
                    success: true,
                    data: null
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    verificationCode: metaTag.metaTagContent,
                    isActive: metaTag.isActive
                }
            });
        } catch (error) {
            console.error('Error getting Google Search Console verification:', error);
            auditLogService.logExternalApi({
                provider: 'google',
                action: 'search_console.get_verification',
                success: false,
                req,
                error,
                durationMs: Date.now() - start,
            }).catch(() => {});
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve verification code',
                error: error.message
            });
        }
    },

    /**
     * POST /api/update/google-search-console-verification
     * Create or update Google Search Console verification code
     */
    updateVerificationCode: async (req, res) => {
        const start = Date.now();
        try {
            const { verificationCode } = req.body;

            // Validate input
            const validation = validateVerificationCode(verificationCode);
            if (!validation.valid) {
                auditLogService.logWarn({
                    action: 'search_console.update_verification.validation_failed',
                    category: 'google_api',
                    message: validation.error,
                    req,
                }).catch(() => {});
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    error: validation.error
                });
            }

            // Sanitize input
            const sanitizedCode = sanitizeInput(verificationCode);

            // Find existing meta tag or create new one
            const existingMetaTag = await SiteMetaTags.findOne({
                type: 'google_search_console'
            });

            let metaTag;
            if (existingMetaTag) {
                // Update existing
                existingMetaTag.metaTagContent = sanitizedCode;
                existingMetaTag.isActive = true;
                existingMetaTag.metaTagName = 'google-site-verification';
                existingMetaTag.description = 'Google Search Console verification code';
                await existingMetaTag.save();
                metaTag = existingMetaTag;
            } else {
                // Create new
                metaTag = new SiteMetaTags({
                    type: 'google_search_console',
                    metaTagName: 'google-site-verification',
                    metaTagContent: sanitizedCode,
                    isActive: true,
                    description: 'Google Search Console verification code'
                });
                await metaTag.save();
            }

            auditLogService.logExternalApi({
                provider: 'google',
                action: 'search_console.update_verification',
                success: true,
                req,
                durationMs: Date.now() - start,
                metadata: { mode: existingMetaTag ? 'update' : 'create' },
            }).catch(() => {});

            res.status(200).json({
                success: true,
                message: 'Verification code updated successfully',
                data: {
                    verificationCode: metaTag.metaTagContent,
                    isActive: metaTag.isActive
                }
            });
        } catch (error) {
            console.error('Error updating Google Search Console verification:', error);
            auditLogService.logExternalApi({
                provider: 'google',
                action: 'search_console.update_verification',
                success: false,
                req,
                error,
                durationMs: Date.now() - start,
            }).catch(() => {});
            res.status(500).json({
                success: false,
                message: 'Failed to update verification code',
                error: error.message
            });
        }
    },

    /**
     * DELETE /api/delete/google-search-console-verification
     * Remove Google Search Console verification code
     */
    deleteVerificationCode: async (req, res) => {
        const start = Date.now();
        try {
            const result = await SiteMetaTags.deleteMany({
                type: 'google_search_console'
            });

            if (result.deletedCount === 0) {
                auditLogService.logWarn({
                    action: 'search_console.delete_verification.not_found',
                    category: 'google_api',
                    message: 'No verification code to delete',
                    req,
                }).catch(() => {});
                return res.status(404).json({
                    success: false,
                    message: 'Verification code not found'
                });
            }

            auditLogService.logExternalApi({
                provider: 'google',
                action: 'search_console.delete_verification',
                success: true,
                req,
                durationMs: Date.now() - start,
                metadata: { deletedCount: result.deletedCount },
            }).catch(() => {});

            res.status(200).json({
                success: true,
                message: 'Verification code removed successfully'
            });
        } catch (error) {
            console.error('Error deleting Google Search Console verification:', error);
            auditLogService.logExternalApi({
                provider: 'google',
                action: 'search_console.delete_verification',
                success: false,
                req,
                error,
                durationMs: Date.now() - start,
            }).catch(() => {});
            res.status(500).json({
                success: false,
                message: 'Failed to remove verification code',
                error: error.message
            });
        }
    }
};

module.exports = googleSearchConsoleController;
