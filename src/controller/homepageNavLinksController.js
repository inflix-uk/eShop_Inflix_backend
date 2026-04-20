const HomepageNavLinks = require('../models/homepageNavLinks');

const MAX_LINKS = 40;

function sanitizeLabel(raw) {
    if (raw == null) return '';
    return String(raw).trim().replace(/[<>]/g, '').slice(0, 80);
}

/**
 * Internal paths must start with / and avoid protocol tricks.
 * External: http(s) only.
 */
function normalizePath(raw) {
    const s = String(raw == null ? '' : raw).trim().slice(0, 500);
    if (!s) return { ok: false, message: 'Path is required' };
    if (/javascript:/i.test(s) || /\s/.test(s)) {
        return { ok: false, message: 'Invalid path' };
    }
    if (/^https?:\/\//i.test(s)) {
        try {
            const u = new URL(s);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                return { ok: false, message: 'Only http(s) URLs are allowed' };
            }
            return { ok: true, value: s };
        } catch {
            return { ok: false, message: 'Invalid URL' };
        }
    }
    if (!s.startsWith('/')) {
        return { ok: false, message: 'Internal paths must start with / (e.g. /shopall)' };
    }
    if (s.startsWith('//')) {
        return { ok: false, message: 'Invalid path' };
    }
    return { ok: true, value: s };
}

function validateLinksPayload(links) {
    if (!Array.isArray(links)) {
        return { ok: false, message: 'links must be an array' };
    }
    if (links.length > MAX_LINKS) {
        return { ok: false, message: `At most ${MAX_LINKS} links allowed` };
    }
    const cleaned = [];
    for (let i = 0; i < links.length; i++) {
        const item = links[i];
        const label = sanitizeLabel(item?.label);
        const pathRes = normalizePath(item?.path);
        if (!label) {
            return { ok: false, message: `Link ${i + 1}: label is required` };
        }
        if (!pathRes.ok) {
            return { ok: false, message: `Link "${label}": ${pathRes.message}` };
        }
        cleaned.push({ label, path: pathRes.value });
    }
    return { ok: true, links: cleaned };
}

const getHomepageNavLinksPublic = async (req, res) => {
    try {
        const doc = await HomepageNavLinks.findOne().lean();
        return res.status(200).json({
            success: true,
            data: { links: doc?.links || [] }
        });
    } catch (error) {
        console.error('Error fetching homepage nav links:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch links'
        });
    }
};

const putHomepageNavLinks = async (req, res) => {
    try {
        const validation = validateLinksPayload(req.body?.links);
        if (!validation.ok) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        const doc = await HomepageNavLinks.findOneAndUpdate(
            {},
            { links: validation.links },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        return res.status(200).json({
            success: true,
            message: 'Homepage links saved',
            data: { links: doc.links || [] }
        });
    } catch (error) {
        console.error('Error saving homepage nav links:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to save links'
        });
    }
};

module.exports = {
    getHomepageNavLinksPublic,
    putHomepageNavLinks
};
