/**
 * Newsletter-only SMTP (Brevo). Same relay/credentials as other Zextons transactional mail;
 * kept under email/NewsLetter so this feature is isolated from order/support email modules.
 */
const nodemailer = require("nodemailer");

const DEFAULT_HOST = "smtp-relay.brevo.com";
const DEFAULT_PORT = 465;

function getNewsletterTransporter() {
  const port = Number(process.env.NEWSLETTER_EMAIL_PORT || process.env.EMAIL_PORT) || DEFAULT_PORT;
  return nodemailer.createTransport({
    host: process.env.NEWSLETTER_EMAIL_HOST || process.env.EMAIL_HOST || DEFAULT_HOST,
    port,
    secure: port === 465,
    auth: {
      user:
        process.env.NEWSLETTER_EMAIL_USER ||
        process.env.EMAIL_USER ||
        "7da4db001@smtp-brevo.com",
      pass:
        process.env.NEWSLETTER_EMAIL_PASS ||
        process.env.EMAIL_PASS ||
        "UbpWm568BQ4M1tfI",
    },
  });
}

function getNewsletterFromAddress() {
  return (
    process.env.NEWSLETTER_FROM ||
    process.env.EMAIL_FROM ||
    '"Zextons" <order@zextons.co.uk>'
  );
}

module.exports = {
  getNewsletterTransporter,
  getNewsletterFromAddress,
};
