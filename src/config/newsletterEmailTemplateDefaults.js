/**
 * Default copy for newsletter transactional emails (layout lives in email/NewsLetter).
 */

const WELCOME_DEFAULTS = {
  subject: "Welcome! Enjoy 5% Off Your First Order",
  pageTitle: "Coupon Code Email",
  heading: "Welcome to our store!",
  bodyParagraph1:
    "As a special welcome, we're offering you 5% off your first order up to £20. Use the coupon code below at checkout!",
  couponCode: "FIRSTFIVE",
  bodyParagraph2Intro: "Hurry, this offer is valid for a limited time only. Shop now at",
  shopLinkText: "our store",
  bodyParagraph2Outro: "!",
  footerTeamLine1: "Thank you for shopping with us.",
  footerTeamLine2: "The team",
  footerVisit: "Visit our website",
};

const HOT_UK_DEFAULTS = {
  subject: "Hot deals on top products",
  pageTitle: "Hot Deals",
  headerTitle: "Hot deals",
  headerSubtitle: "Exclusive discounts on our latest products",
  sectionHeading: "Our hot deals are live for a limited time only!",
  bodyLine1:
    "Save on selected products across our store.",
  bodyLine2: "plus a bonus extra 5% OFF your order (up to £20).",
  couponLabel: "Use Discount Code:",
  couponCode: "HOTDEALS",
  bodyLine4:
    "Upgrade your wish list and pocket serious savings with:",
  bodyLine5:
    "unbeatable deals and limited-time offers.",
  urgencyLine: "Don't wait — once these deals are gone, they're gone.",
  ctaLabel: "Browse deals",
  footerTeamLine1: "Thank you for shopping with us.",
  footerTeamLine2: "The team",
  footerVisit: "Visit our website",
};

/** Admin UI labels (key → label) */
const WELCOME_FIELD_LABELS = {
  subject: "Email subject",
  pageTitle: "HTML page title",
  heading: "Main heading",
  bodyParagraph1: "Intro paragraph (offer)",
  couponCode: "Coupon code (in box)",
  bodyParagraph2Intro: "Second paragraph — text before shop link",
  shopLinkText: "Shop link text",
  bodyParagraph2Outro: "Text after shop link (e.g. !)",
  footerTeamLine1: "Footer line 1",
  footerTeamLine2: "Footer line 2 (team)",
  footerVisit: "Footer link text",
};

const HOT_UK_FIELD_LABELS = {
  subject: "Email subject",
  pageTitle: "HTML page title",
  headerTitle: "Header title (dark box)",
  headerSubtitle: "Header subtitle",
  sectionHeading: "Section heading (H2)",
  bodyLine1: "Body paragraph 1",
  bodyLine2: "Body paragraph 2",
  couponLabel: "Coupon label (above code)",
  couponCode: "Coupon code",
  bodyLine4: "Body paragraph (after coupon)",
  bodyLine5: "Body paragraph (follow-up)",
  urgencyLine: "Urgency line (shown bold)",
  ctaLabel: "Button text",
  footerTeamLine1: "Footer line 1",
  footerTeamLine2: "Footer line 2 (team)",
  footerVisit: "Footer link text",
};

module.exports = {
  WELCOME_DEFAULTS,
  HOT_UK_DEFAULTS,
  WELCOME_FIELD_LABELS,
  HOT_UK_FIELD_LABELS,
};
