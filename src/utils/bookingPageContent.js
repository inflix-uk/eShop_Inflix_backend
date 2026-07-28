const DEFAULT_BOOKING_PAGE_CONTENT = Object.freeze({
  hero: {
    badgeText: 'Online Booking Available',
    title: 'Book Your Perfect Appointment',
    subtitle:
      'Choose from our range of premium services and book your preferred time slot. Quick, easy, and secure online booking.',
    statsEnabled: true,
    stat1Label: 'Services',
    stat2Value: '24/7',
    stat2Label: 'Online Booking',
    stat3Value: '100%',
    stat3Label: 'Secure Payment',
    statsValueColor: '#111827',
    statsLabelColor: '#6b7280',
    statsBgColor: '',
  },
  services: {
    heading: 'Our Services',
    subheading: 'Select a service to begin booking',
  },
  trust: [
    {
      title: 'Secure Booking',
      description: 'Your data is protected with industry-leading encryption',
    },
    {
      title: 'Instant Confirmation',
      description: 'Receive immediate booking confirmation via email',
    },
    {
      title: 'Flexible Payment',
      description: 'Pay securely with card, Apple Pay, or Google Pay',
    },
  ],
  customWidget: {
    enabled: false,
    html: '',
    css: '',
  },
  inlineWidgets: [],
});

const HERO_KEYS = Object.keys(DEFAULT_BOOKING_PAGE_CONTENT.hero).filter(
  (k) => k !== 'statsEnabled'
);
const HERO_COLOR_KEYS = ['statsValueColor', 'statsLabelColor', 'statsBgColor'];
const SERVICES_KEYS = Object.keys(DEFAULT_BOOKING_PAGE_CONTENT.services);

function toStr(value, fallback) {
  if (value == null) return fallback;
  return String(value);
}

function toBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function clampAfterPackageCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.min(Math.floor(n), 300);
}

function sanitizeInlineWidgets(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === 'object')
    .slice(0, 20)
    .map((entry) => ({
      enabled: toBool(entry.enabled, true),
      afterPackageCount: clampAfterPackageCount(entry.afterPackageCount),
      html: toStr(entry.html, ''),
      css: toStr(entry.css, ''),
    }));
}

function cloneDefaults() {
  return {
    hero: { ...DEFAULT_BOOKING_PAGE_CONTENT.hero },
    services: { ...DEFAULT_BOOKING_PAGE_CONTENT.services },
    trust: DEFAULT_BOOKING_PAGE_CONTENT.trust.map((b) => ({ ...b })),
    customWidget: { ...DEFAULT_BOOKING_PAGE_CONTENT.customWidget },
    inlineWidgets: [],
  };
}

function sanitizePageContent(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const heroSrc = source.hero && typeof source.hero === 'object' ? source.hero : {};
  const servicesSrc =
    source.services && typeof source.services === 'object' ? source.services : {};
  const trustSrc = Array.isArray(source.trust) ? source.trust : [];

  const hero = {};
  for (const key of HERO_KEYS) {
    hero[key] = toStr(heroSrc[key], DEFAULT_BOOKING_PAGE_CONTENT.hero[key]).trim();
  }
  hero.statsEnabled = toBool(
    heroSrc.statsEnabled,
    DEFAULT_BOOKING_PAGE_CONTENT.hero.statsEnabled
  );
  if (!hero.title) {
    const legacy = [heroSrc.titleBefore, heroSrc.titleHighlight, heroSrc.titleAfter]
      .map((p) => toStr(p, '').trim())
      .filter(Boolean)
      .join(' ');
    hero.title = legacy || DEFAULT_BOOKING_PAGE_CONTENT.hero.title;
  }

  const services = {};
  for (const key of SERVICES_KEYS) {
    services[key] = toStr(
      servicesSrc[key],
      DEFAULT_BOOKING_PAGE_CONTENT.services[key]
    ).trim();
  }

  const trust = DEFAULT_BOOKING_PAGE_CONTENT.trust.map((defaults, index) => {
    const entry = trustSrc[index] && typeof trustSrc[index] === 'object' ? trustSrc[index] : {};
    return {
      title: toStr(entry.title, defaults.title).trim(),
      description: toStr(entry.description, defaults.description).trim(),
    };
  });

  const customWidgetSrc =
    source.customWidget && typeof source.customWidget === 'object' ? source.customWidget : {};
  const customWidget = {
    enabled: toBool(customWidgetSrc.enabled, DEFAULT_BOOKING_PAGE_CONTENT.customWidget.enabled),
    html: toStr(customWidgetSrc.html, DEFAULT_BOOKING_PAGE_CONTENT.customWidget.html),
    css: toStr(customWidgetSrc.css, DEFAULT_BOOKING_PAGE_CONTENT.customWidget.css),
  };

  const inlineWidgets = sanitizeInlineWidgets(source.inlineWidgets);

  return { hero, services, trust, customWidget, inlineWidgets };
}

function pageContentPayload(doc) {
  const raw =
    doc && doc.pageContent && typeof doc.pageContent.toObject === 'function'
      ? doc.pageContent.toObject()
      : doc && doc.pageContent
      ? doc.pageContent
      : null;
  if (!raw) return cloneDefaults();
  return sanitizePageContent(raw);
}

module.exports = {
  DEFAULT_BOOKING_PAGE_CONTENT,
  sanitizePageContent,
  pageContentPayload,
  cloneDefaults,
};
