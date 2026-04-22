/**
 * Newsletter emails use the shared DB/env SMTP stack via {@link ../../src/utils/mailer}.
 * This file is kept for backwards compatibility if anything still imports it.
 */
const { createTransporter, getDefaultFrom } = require("../../src/utils/mailer");

async function getNewsletterTransporter() {
  return createTransporter();
}

async function getNewsletterFromAddress() {
  return getDefaultFrom();
}

module.exports = {
  getNewsletterTransporter,
  getNewsletterFromAddress,
};
