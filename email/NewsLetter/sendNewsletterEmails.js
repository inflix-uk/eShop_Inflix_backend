const { sendMail } = require("../../src/utils/mailer");
const { applyEmailBrandingToHtml } = require("../../src/utils/emailBranding");
const {
  getWelcomeResolved,
  getHotUkDealsResolved,
} = require("../../src/services/email/newsletterEmailCopyService");

function escapeHtml(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function optionalGreeting(fullName) {
  const t = (fullName || "").trim();
  if (!t) return "";
  return `
                        <tr>
                            <td style="padding: 0 28px 18px 28px; text-align: left;">
                                <p style="margin: 0; {{EB_typo_p}} color: {{EB_text_dark}};">Hi ${escapeHtml(t)},</p>
                            </td>
                        </tr>`;
}

/**
 * Welcome newsletter — layout tokens filled by applyEmailBrandingToHtml (fonts, colors, logo, store URL).
 */
function buildWelcomeHtml(fullName, f) {
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${e(f.pageTitle || f.heading || "Newsletter")}</title>
    {{EB_google_fonts_link}}
    <style type="text/css">
        .nl-preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all; }
    </style>
</head>
<body style="margin: 0; padding: 0; {{EB_typo_p}} background-color: {{EB_mint_bg}}; color: {{EB_text_dark}};">
    <span class="nl-preheader">${e((f.heading || "").slice(0, 140))}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: {{EB_mint_bg}};">
        <tr>
            <td align="center" style="padding: 32px 16px 48px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 0 0 20px 0;">
                            <img src="{{EB_logoUrl}}" width="160" alt="{{EB_logoAlt}}" style="display: block; border: 0; outline: none; text-decoration: none; height: auto; max-width: 160px; width: 160px;" />
                        </td>
                    </tr>
                    <tr>
                        <td style="background: {{EB_hero_header_bg}}; border-radius: 14px 14px 0 0; padding: 28px 24px; text-align: center;">
                            <h1 style="margin: 0; {{EB_typo_h1}} color: #ffffff; font-size: 26px; line-height: 1.25;">${e(f.heading || "")}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; border-left: 1px solid rgba(0,0,0,0.06); border-right: 1px solid rgba(0,0,0,0.06); padding: 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                ${optionalGreeting(fullName)}
                                <tr>
                                    <td style="padding: 8px 28px 8px 28px; text-align: left;">
                                        <p style="margin: 0 0 16px 0; {{EB_typo_p}} color: {{EB_text_dark}}; line-height: 1.65;">${e(f.bodyParagraph1 || "")}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 28px 28px 28px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: {{EB_help_bg}}; border-radius: 12px; border: 2px dashed {{EB_accent}};">
                                            <tr>
                                                <td align="center" style="padding: 28px 20px;">
                                                    <p style="margin: 0 0 12px 0; {{EB_typo_h3}} color: {{EB_text_dark}}; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">Your code</p>
                                                    <span style="display: inline-block; {{EB_typo_h2}} color: {{EB_accent}}; font-size: 28px; letter-spacing: 0.12em;">${e(f.couponCode || "")}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 28px 28px 28px; text-align: left;">
                                        <p style="margin: 0; {{EB_typo_p}} color: {{EB_text_dark}}; line-height: 1.65;">
                                            ${e(f.bodyParagraph2Intro || "")}
                                            <a href="{{EB_store_url}}" style="color: {{EB_accent}}; font-weight: 600; text-decoration: none;">${e(f.shopLinkText || "")}</a>${e(f.bodyParagraph2Outro || "")}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: {{EB_footer_bg}}; border-radius: 0 0 14px 14px; padding: 24px 28px; text-align: center;">
                            <p style="margin: 0 0 8px 0; {{EB_typo_p}} color: rgba(255,255,255,0.92); font-size: 14px; line-height: 1.5;">${e(f.footerTeamLine1 || "")}<br />${e(f.footerTeamLine2 || "")}</p>
                            <p style="margin: 0;">
                                <a href="{{EB_store_url}}" style="color: {{EB_hero_highlight}}; {{EB_typo_p}} font-size: 14px; text-decoration: underline;">${e(f.footerVisit || "")}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Promotional / Hot UK style newsletter — same branding system.
 */
function buildHotUkDealsHtml(f) {
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${e(f.pageTitle || f.headerTitle || "Newsletter")}</title>
    {{EB_google_fonts_link}}
    <style type="text/css">
        .nl-preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all; }
    </style>
</head>
<body style="margin: 0; padding: 0; {{EB_typo_p}} background-color: {{EB_mint_bg}}; color: {{EB_text_dark}};">
    <span class="nl-preheader">${e((f.headerTitle || "").slice(0, 140))}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: {{EB_mint_bg}};">
        <tr>
            <td align="center" style="padding: 32px 16px 48px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 0 0 20px 0;">
                            <img src="{{EB_logoUrl}}" width="160" alt="{{EB_logoAlt}}" style="display: block; border: 0; outline: none; text-decoration: none; height: auto; max-width: 160px; width: 160px;" />
                        </td>
                    </tr>
                    <tr>
                        <td style="background: {{EB_hero_header_bg}}; border-radius: 14px 14px 0 0; padding: 32px 24px 28px 24px; text-align: center;">
                            <h1 style="margin: 0 0 10px 0; {{EB_typo_h1}} color: #ffffff; font-size: 26px; line-height: 1.25;">${e(f.headerTitle || "")}</h1>
                            <p style="margin: 0; {{EB_typo_p}} color: rgba(255,255,255,0.95); font-size: 16px; line-height: 1.5;">${e(f.headerSubtitle || "")}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; border-left: 1px solid rgba(0,0,0,0.06); border-right: 1px solid rgba(0,0,0,0.06); padding: 32px 28px 8px 28px; text-align: center;">
                            <h2 style="margin: 0 0 16px 0; {{EB_typo_h2}} color: {{EB_text_dark}}; font-size: 22px; line-height: 1.3;">${e(f.sectionHeading || "")}</h2>
                            <p style="margin: 0 0 14px 0; {{EB_typo_p}} color: {{EB_text_dark}}; line-height: 1.65; text-align: left;">${e(f.bodyLine1 || "")}</p>
                            <p style="margin: 0 0 22px 0; {{EB_typo_p}} color: {{EB_text_dark}}; line-height: 1.65; text-align: left;">${e(f.bodyLine2 || "")}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; border-left: 1px solid rgba(0,0,0,0.06); border-right: 1px solid rgba(0,0,0,0.06); padding: 0 28px 28px 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: {{EB_mint_bg}}; border-radius: 12px; border: 2px solid {{EB_accent}};">
                                <tr>
                                    <td align="center" style="padding: 24px 20px;">
                                        <p style="margin: 0 0 10px 0; {{EB_typo_p}} color: {{EB_text_dark}}; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">${e(f.couponLabel || "")}</p>
                                        <p style="margin: 0; {{EB_typo_h2}} color: {{EB_accent}}; font-size: 30px; letter-spacing: 0.14em;">${e(f.couponCode || "")}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; border-left: 1px solid rgba(0,0,0,0.06); border-right: 1px solid rgba(0,0,0,0.06); padding: 0 28px 12px 28px; text-align: left;">
                            <p style="margin: 0 0 12px 0; {{EB_typo_p}} color: {{EB_text_dark}}; line-height: 1.65;">${e(f.bodyLine4 || "")}</p>
                            <p style="margin: 0 0 18px 0; {{EB_typo_p}} color: {{EB_text_dark}}; line-height: 1.65;">${e(f.bodyLine5 || "")}</p>
                            <p style="margin: 0 0 24px 0; {{EB_typo_h3}} color: {{EB_text_dark}};">${e(f.urgencyLine || "")}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; border-left: 1px solid rgba(0,0,0,0.06); border-right: 1px solid rgba(0,0,0,0.06); padding: 0 28px 36px 28px; text-align: center;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td style="border-radius: 10px; background: {{EB_accent}};">
                                        <a href="{{EB_store_url}}" style="display: inline-block; padding: 16px 36px; {{EB_typo_h3}} font-size: 16px; color: #ffffff !important; text-decoration: none; border-radius: 10px;">${e(f.ctaLabel || "")}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: {{EB_footer_bg}}; border-radius: 0 0 14px 14px; padding: 24px 28px; text-align: center;">
                            <p style="margin: 0 0 8px 0; {{EB_typo_p}} color: rgba(255,255,255,0.92); font-size: 14px; line-height: 1.5;">${e(f.footerTeamLine1 || "")}<br />${e(f.footerTeamLine2 || "")}</p>
                            <p style="margin: 0;">
                                <a href="{{EB_store_url}}" style="color: {{EB_hero_highlight}}; {{EB_typo_p}} font-size: 14px; text-decoration: underline;">${e(f.footerVisit || "")}</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * @param {{ to: string, fullName?: string | null }} opts
 */
async function sendNewsletterSubscriberWelcome(opts) {
  const { to, fullName } = opts;
  const resolved = await getWelcomeResolved();
  const raw = buildWelcomeHtml(fullName, resolved.fields);
  const html = await applyEmailBrandingToHtml(raw);
  const info = await sendMail({
    to,
    subject: resolved.subject,
    html,
  });
  console.log("NewsLetter welcome email sent:", info.response);
  return info;
}

/**
 * @param {{ to: string }} opts
 */
async function sendHotUkDealsWelcome(opts) {
  const { to } = opts;
  const resolved = await getHotUkDealsResolved();
  const raw = buildHotUkDealsHtml(resolved.fields);
  const html = await applyEmailBrandingToHtml(raw);
  const info = await sendMail({
    to,
    subject: resolved.subject,
    html,
  });
  console.log("NewsLetter Hot UK Deals email sent:", info.response);
  return info;
}

module.exports = {
  sendNewsletterSubscriberWelcome,
  sendHotUkDealsWelcome,
};
