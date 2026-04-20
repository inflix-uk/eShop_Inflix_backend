const { getNewsletterTransporter, getNewsletterFromAddress } = require("./transporter");
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
  return `<div class="content"><p>Hi ${escapeHtml(t)},</p></div>`;
}

function buildWelcomeHtml(fullName, f) {
  const e = escapeHtml;
  return `
                   <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${e(f.pageTitle || "")}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .email-container {
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            text-align: center;
                            padding: 20px 0;
                        }
                        .header h1 {
                            color: #333333;
                        }
                        .coupon-box {
                            background-color: #eeeeee;
                            padding: 30px;
                            border-radius: 10px;
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            color: #333333;
                            margin: 20px 0;
                        }
                        .coupon-code {
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #ffffff;
                            border: 2px solid #333333;
                            border-radius: 5px;
                            font-size: 28px;
                            color: #333333;
                        }
                        .content {
                            color: #666666;
                            font-size: 16px;
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px 0;
                            color: #999999;
                        }
                        .footer a {
                            color: #999999;
                            text-decoration: none;
                        }
                    </style>
                </head>
                <body>

                    <div class="email-container">
                        <div class="header">
                            <h1>${e(f.heading || "")}</h1>
                        </div>
                        ${optionalGreeting(fullName)}
                        <div class="content">
                            <p>${e(f.bodyParagraph1 || "")}</p>
                        </div>
                        <div class="coupon-box">
                            <span class="coupon-code">${e(f.couponCode || "")}</span>
                        </div>
                        <div class="content">
                            <p>${e(f.bodyParagraph2Intro || "")} <a href="https://www.zextons.co.uk">${e(f.shopLinkText || "")}</a>${e(f.bodyParagraph2Outro || "")}</p>
                        </div>
                        <div class="footer">
                            <p>${e(f.footerTeamLine1 || "")}<br>${e(f.footerTeamLine2 || "")}</p>
                            <p><a href="https://www.zextons.co.uk">${e(f.footerVisit || "")}</a></p>
                        </div>
                    </div>

                </body>
                </html>
                `;
}

function buildHotUkDealsHtml(f) {
  const e = escapeHtml;
  return `
                   <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${e(f.pageTitle || "")}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .email-container {
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            text-align: center;
                            padding: 30px 20px;
                            background-color: #000000;
                            color: #ffffff;
                            border-radius: 10px;
                            margin-bottom: 30px;
                        }
                        .header h1 {
                            color: #ffffff;
                            margin: 0 0 10px 0;
                            font-size: 28px;
                        }
                        .header p {
                            color: #ffffff;
                            margin: 10px 0 0 0;
                            font-size: 18px;
                            font-weight: bold;
                        }
                        .content {
                            color: #333333;
                            font-size: 16px;
                            line-height: 1.6;
                            text-align: center;
                            margin-bottom: 25px;
                        }
                        .content h2 {
                            color: #000000;
                            font-size: 22px;
                            margin: 20px 0 15px 0;
                        }
                        .content p {
                            margin: 15px 0;
                        }
                        .coupon-box {
                            background-color: #f8f8f8;
                            padding: 25px;
                            border-radius: 10px;
                            text-align: center;
                            margin: 30px 0;
                            border: 2px dashed #16a34a;
                        }
                        .coupon-label {
                            font-size: 14px;
                            color: #666666;
                            margin-bottom: 10px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .coupon-code {
                            display: inline-block;
                            padding: 15px 30px;
                            background-color: #ffffff;
                            border: 3px solid #16a34a;
                            border-radius: 8px;
                            font-size: 32px;
                            font-weight: bold;
                            color: #16a34a;
                            letter-spacing: 3px;
                        }
                        .cta-button {
                            display: inline-block;
                            background-color: #16a34a;
                            color: #ffffff !important;
                            padding: 15px 40px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-size: 18px;
                            font-weight: bold;
                            margin: 25px 0;
                            text-align: center;
                            transition: background-color 0.3s;
                        }
                        .cta-button:hover {
                            background-color: #15803d;
                        }
                        .footer {
                            text-align: center;
                            padding: 30px 0 20px 0;
                            color: #999999;
                            border-top: 1px solid #eeeeee;
                            margin-top: 30px;
                        }
                        .footer a {
                            color: #999999;
                            text-decoration: none;
                        }
                        .footer p {
                            margin: 10px 0;
                            font-size: 14px;
                        }
                    </style>
                </head>
                <body>

                    <div class="email-container">
                        <div class="header">
                            <h1>${e(f.headerTitle || "")}</h1>
                            <p>${e(f.headerSubtitle || "")}</p>
                        </div>
                        <div class="content">
                            <h2>${e(f.sectionHeading || "")}</h2>
                            <p>${e(f.bodyLine1 || "")}</p>
                            <p>${e(f.bodyLine2 || "")}</p>
                            
                            <div class="coupon-box">
                                <div class="coupon-label">${e(f.couponLabel || "")}</div>
                                <div class="coupon-code">${e(f.couponCode || "")}</div>
                            </div>
                            
                            <p>${e(f.bodyLine4 || "")}</p>
                            <p>${e(f.bodyLine5 || "")}</p>
                            
                            <p><strong>${e(f.urgencyLine || "")}</strong></p>
                            
                            <a href="https://www.zextons.co.uk" class="cta-button">${e(f.ctaLabel || "")}</a>
                        </div>
                        <div class="footer">
                            <p>${e(f.footerTeamLine1 || "")}<br>${e(f.footerTeamLine2 || "")}</p>
                            <p><a href="https://www.zextons.co.uk">${e(f.footerVisit || "")}</a></p>
                        </div>
                    </div>

                </body>
                </html>
                `;
}

/**
 * @param {{ to: string, fullName?: string | null }} opts
 */
async function sendNewsletterSubscriberWelcome(opts) {
  const { to, fullName } = opts;
  const resolved = await getWelcomeResolved();
  const transporter = getNewsletterTransporter();
  const info = await transporter.sendMail({
    from: getNewsletterFromAddress(),
    to,
    subject: resolved.subject,
    html: buildWelcomeHtml(fullName, resolved.fields),
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
  const transporter = getNewsletterTransporter();
  const info = await transporter.sendMail({
    from: getNewsletterFromAddress(),
    to,
    subject: resolved.subject,
    html: buildHotUkDealsHtml(resolved.fields),
  });
  console.log("NewsLetter Hot UK Deals email sent:", info.response);
  return info;
}

module.exports = {
  sendNewsletterSubscriberWelcome,
  sendHotUkDealsWelcome,
};
