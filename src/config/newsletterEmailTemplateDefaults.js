/**
 * Default copy for newsletter transactional emails (layout lives in email/NewsLetter).
 */

const WELCOME_DEFAULTS = {
  subject: "Welcome to Zextons Tech Store! Enjoy 5% Off Your First Order 🎉!",
  pageTitle: "Coupon Code Email",
  heading: "Welcome to Zextons Tech Store!",
  bodyParagraph1:
    "As a special welcome, we're offering you 5% off your first order up to £20. Use the coupon code below at checkout!",
  couponCode: "FIRSTFIVE",
  bodyParagraph2Intro: "Hurry, this offer is valid for a limited time only. Shop now at",
  shopLinkText: "Zexton Tech Store",
  bodyParagraph2Outro: "!",
  footerTeamLine1: "Thank you for shopping with us.",
  footerTeamLine2: "Zexton Tech Store Team",
  footerVisit: "Visit our website",
};

const HOT_UK_DEFAULTS = {
  subject: "Hot UK Deals on Top Tech!",
  pageTitle: "Hot UK Deals",
  headerTitle: "Hot UK Deals on Top Tech!",
  headerSubtitle: "Zextons Tech Store Brings You Amazing Discounts on Top Tech!",
  sectionHeading: "Hurry—our Hot UK Deals are live for a limited time only!",
  bodyLine1:
    "Save up to 70% on brand new and refurbished phones, tablets, laptops and more…",
  bodyLine2: "plus a bonus extra 5% OFF your order (up to £20).",
  couponLabel: "Use Discount Code:",
  couponCode: "HOTDEALS",
  bodyLine4:
    "Upgrade your tech, tick off your wish list, and pocket serious savings with:",
  bodyLine5:
    "unbeatable deals, limited-time offers, and proper UK value — only at Zextons Tech Store.",
  urgencyLine: "Don't wait — once these hot deals are gone, they're gone.",
  ctaLabel: "Browse Hot UK Tech Deals",
  footerTeamLine1: "Thank you for shopping with us.",
  footerTeamLine2: "Zextons Tech Store Team",
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
