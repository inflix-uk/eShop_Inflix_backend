const { randomUUID } = require('crypto');
const AnnouncementBannerSettings = require('../models/announcementBannerSettings');

const DEFAULT_COLORS = {
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
};

function sanitizeMessage(raw) {
  if (raw == null) return '';
  return String(raw).slice(0, 2000).replace(/[<>]/g, '');
}

function sanitizeLinkUrl(raw) {
  const u = String(raw || '').trim().slice(0, 2000);
  if (!u) return '';
  if (u.startsWith('/')) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:/i.test(u)) return u;
  return '';
}

function sanitizeLinkLabel(raw) {
  if (raw == null) return '';
  return String(raw).slice(0, 200).replace(/[<>]/g, '');
}

function sanitizeColor(raw, fallback) {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  return fallback;
}

function sanitizeItemId(raw) {
  const s = String(raw || '').trim().slice(0, 64);
  if (s) return s;
  return randomUUID();
}

const SOCIAL_KINDS = new Set([
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'twitter',
  'github',
  'tiktok',
  'mail',
  'globe',
  'custom',
]);

function sanitizeSocialKind(raw) {
  const k = String(raw || '').trim().toLowerCase();
  return SOCIAL_KINDS.has(k) ? k : 'globe';
}

function sanitizeCustomIcon(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .slice(0, 64)
    .replace(/[^a-z0-9-]/g, '');
  return s || 'globe';
}

function rawSocialFromDoc(doc) {
  if (!doc || !Array.isArray(doc.socialLinks)) return [];
  return [...doc.socialLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function serializeSocialLink(it) {
  const kind = sanitizeSocialKind(it.kind);
  return {
    id: String(it.id || '').trim() || randomUUID(),
    order: typeof it.order === 'number' && Number.isFinite(it.order) ? it.order : 0,
    kind,
    url: sanitizeLinkUrl(it.url),
    customIcon: kind === 'custom' ? sanitizeCustomIcon(it.customIcon) : '',
  };
}

function publicSocialFromDoc(doc) {
  return rawSocialFromDoc(doc)
    .map(serializeSocialLink)
    .filter((s) => String(s.url || '').trim().length > 0)
    .sort((a, b) => a.order - b.order);
}

/**
 * Normalize DB doc to ordered item list (migrates legacy single-banner shape).
 */
function rawItemsFromDoc(doc) {
  if (!doc) return [];
  const items = Array.isArray(doc.items) ? doc.items : [];
  if (items.length > 0) {
    return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const msg = doc.message != null ? String(doc.message).trim() : '';
  if (!msg) return [];
  return [
    {
      id: 'legacy',
      enabled: doc.enabled !== false,
      order: 0,
      message: sanitizeMessage(doc.message),
      linkUrl: sanitizeLinkUrl(doc.linkUrl),
      linkLabel: sanitizeLinkLabel(doc.linkLabel),
      backgroundColor: sanitizeColor(doc.backgroundColor, DEFAULT_COLORS.backgroundColor),
      textColor: sanitizeColor(doc.textColor, DEFAULT_COLORS.textColor),
      dismissible: doc.dismissible !== false,
      ctaFirst: false,
    },
  ];
}

function serializeItem(it) {
  return {
    id: String(it.id || '').trim() || randomUUID(),
    enabled: it.enabled !== false,
    order: typeof it.order === 'number' && Number.isFinite(it.order) ? it.order : 0,
    message: sanitizeMessage(it.message),
    linkUrl: sanitizeLinkUrl(it.linkUrl),
    linkLabel: sanitizeLinkLabel(it.linkLabel),
    backgroundColor: sanitizeColor(it.backgroundColor, DEFAULT_COLORS.backgroundColor),
    textColor: sanitizeColor(it.textColor, DEFAULT_COLORS.textColor),
    dismissible: it.dismissible !== false,
    ctaFirst: it.ctaFirst === true,
  };
}

function publicItemsFromDoc(doc) {
  const masterEnabled = doc ? doc.masterEnabled !== false : true;
  if (!masterEnabled) return [];
  const raw = rawItemsFromDoc(doc);
  return raw
    .map(serializeItem)
    .filter((it) => it.enabled && String(it.message || '').trim().length > 0)
    .sort((a, b) => a.order - b.order);
}

function buildPublicPayload(doc) {
  const updatedAt = doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null;
  const items = publicItemsFromDoc(doc);
  const socialLinks = publicSocialFromDoc(doc);
  const enabled = items.length > 0;
  return {
    enabled,
    updatedAt,
    items,
    socialLinks,
  };
}

const getAnnouncementBannerPublic = async (req, res) => {
  try {
    const doc = await AnnouncementBannerSettings.findOne().lean();
    const payload = buildPublicPayload(doc);
    if (!payload.enabled) {
      return res.status(200).json({
        success: true,
        data: {
          enabled: false,
          updatedAt: payload.updatedAt,
          items: [],
          socialLinks: [],
        },
      });
    }
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error('getAnnouncementBannerPublic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load announcement banner',
    });
  }
};

const getAnnouncementBannerAdmin = async (req, res) => {
  try {
    const doc = await AnnouncementBannerSettings.findOne().lean();
    const raw = rawItemsFromDoc(doc);
    const items = raw.map(serializeItem).sort((a, b) => a.order - b.order);
    const socialLinks = rawSocialFromDoc(doc).map(serializeSocialLink).sort((a, b) => a.order - b.order);
    return res.status(200).json({
      success: true,
      data: {
        masterEnabled: doc ? doc.masterEnabled !== false : true,
        items,
        socialLinks,
        updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('getAnnouncementBannerAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load announcement banner',
    });
  }
};

const putAnnouncementBanner = async (req, res) => {
  try {
    const body = req.body || {};

    if (Array.isArray(body.items)) {
      const masterEnabled = body.masterEnabled !== false;
      const sanitized = body.items.map((it, idx) => {
        const base = serializeItem({
          ...it,
          id: sanitizeItemId(it.id),
          order: typeof it.order === 'number' ? it.order : idx,
        });
        return { ...base, order: idx };
      });

      const rawSocial = Array.isArray(body.socialLinks) ? body.socialLinks : [];
      const socialSanitized = rawSocial.map((s, idx) => {
        const base = serializeSocialLink({
          ...s,
          id: sanitizeItemId(s.id),
          order: typeof s.order === 'number' ? s.order : idx,
        });
        return { ...base, order: idx };
      });

      const doc = await AnnouncementBannerSettings.findOneAndUpdate(
        {},
        {
          $set: { masterEnabled, items: sanitized, socialLinks: socialSanitized },
          $unset: {
            enabled: '',
            message: '',
            linkUrl: '',
            linkLabel: '',
            backgroundColor: '',
            textColor: '',
            dismissible: '',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Announcement banners saved',
        data: {
          masterEnabled: doc.masterEnabled !== false,
          items: doc.items.map(serializeItem),
          socialLinks: (doc.socialLinks || []).map(serializeSocialLink),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message:
        'Send { masterEnabled: boolean, items: [...], socialLinks?: [...] } to replace all bars',
    });
  } catch (error) {
    console.error('putAnnouncementBanner:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save announcement banner',
    });
  }
};

module.exports = {
  getAnnouncementBannerPublic,
  getAnnouncementBannerAdmin,
  putAnnouncementBanner,
};
