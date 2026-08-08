const { sendMail } = require('../../utils/mailer');
const { getEmailBranding, applyEmailBrandingToHtml } = require('../../utils/emailBranding');

const EVENT_CONFIG = {
  cancelled: {
    subject: 'Your booking has been cancelled',
    headline: 'Booking Cancelled',
    intro: 'We are writing to confirm that your booking has been cancelled.',
    accent: '#f44336',
  },
  restored: {
    subject: 'Your booking has been restored',
    headline: 'Booking Restored',
    intro: 'Your cancelled booking has been restored. Please find the updated details below.',
    accent: '#4caf50',
  },
  rescheduled: {
    subject: 'Your booking has been rescheduled',
    headline: 'Booking Rescheduled',
    intro: 'Your booking has been moved to a new date and time. Details are below.',
    accent: '#2196f3',
  },
  no_show: {
    subject: 'Booking marked as no-show',
    headline: 'No Show',
    intro: 'Our records show that you did not attend your scheduled appointment.',
    accent: '#757575',
  },
};

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = String(timeStr).split(':');
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function getPackageName(booking, pkg) {
  return pkg?.name || booking?.packageId?.name || 'Service';
}

function buildExtrasHtml(booking) {
  const extras = Array.isArray(booking?.extras) ? booking.extras.filter((e) => e?.title) : [];
  if (!extras.length) return '';

  const rows = extras
    .map(
      (extra) => `
      <tr>
        <td style="padding:8px 0;color:#555;">${escapeHtml(extra.title)}</td>
        <td style="padding:8px 0;text-align:right;font-weight:600;color:#333;">£${(Number(extra.price) || 0).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
    <tr><td colspan="2" style="padding-top:16px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Extras</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>`;
}

function buildSlotRow(label, date, startTime, endTime, muted = false) {
  const color = muted ? '#888' : '#333';
  const decoration = muted ? 'text-decoration:line-through;' : '';
  return `
    <tr>
      <td style="padding:6px 0;color:#666;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:${color};${decoration}">
        <strong>${escapeHtml(formatDate(date))}</strong><br/>
        ${escapeHtml(formatTime(startTime))} – ${escapeHtml(formatTime(endTime))}
      </td>
    </tr>`;
}

async function buildEmailHtml({ eventType, booking, pkg, newBooking, cancelReason, refund }) {
  const config = EVENT_CONFIG[eventType] || EVENT_CONFIG.cancelled;
  const customerName = booking?.customer?.name || 'Customer';
  const bookingNumber = booking?.bookingNumber || '';
  const packageName = getPackageName(booking, pkg);
  const durationMinutes = pkg?.durationMinutes || booking?.packageId?.durationMinutes;
  const durationUnit =
    pkg?.durationDisplayUnit || booking?.packageId?.durationDisplayUnit || 'minutes';
  const durationLabel = (() => {
    const minutes = Number(durationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return '';
    if (durationUnit === 'hours') {
      const hours = minutes / 60;
      const value = Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 100) / 100);
      return `${value} hr`;
    }
    return `${minutes} min`;
  })();
  const storeName = process.env.STORE_NAME || process.env.EMAIL_FROM_NAME || 'Our team';

  let bodyExtra = '';

  if (eventType === 'rescheduled' && newBooking) {
    bodyExtra = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;padding:16px;">
        ${buildSlotRow('Previous', booking.date, booking.startTime, booking.endTime, true)}
        ${buildSlotRow('New', newBooking.date, newBooking.startTime, newBooking.endTime)}
        <tr>
          <td style="padding:6px 0;color:#666;">New reference</td>
          <td style="padding:6px 0;font-weight:600;color:#333;">#${escapeHtml(newBooking.bookingNumber || '')}</td>
        </tr>
      </table>`;
  } else {
    bodyExtra = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;padding:16px;">
        ${buildSlotRow('Date & time', booking.date, booking.startTime, booking.endTime)}
        ${buildExtrasHtml(booking)}
      </table>`;
  }

  let reasonBlock = '';
  if (cancelReason && String(cancelReason).trim()) {
    reasonBlock = `
      <p style="margin:16px 0 0;font-size:14px;color:#555;">
        <strong>Reason:</strong> ${escapeHtml(cancelReason)}
      </p>`;
  }

  let refundBlock = '';
  if (refund && refund.refundId && !refund.error) {
    refundBlock = `
      <p style="margin:12px 0 0;font-size:14px;color:#2e7d32;">
        A refund of <strong>£${Number(refund.amount || 0).toFixed(2)}</strong> has been initiated to your original payment method.
      </p>`;
  }

  const bookingUrl = process.env.FRONTEND_URL
    ? `${String(process.env.FRONTEND_URL).replace(/\/+$/, '')}/booking`
    : '';

  const ctaBlock = bookingUrl
    ? `<p style="margin:24px 0 0;text-align:center;">
        <a href="${escapeHtml(bookingUrl)}" style="display:inline-block;padding:12px 24px;background:{{EB_accent}};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Book again</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  {{EB_google_fonts_link}}
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${config.accent};padding:24px;text-align:center;">
              <img src="{{EB_logoUrl}}" alt="{{EB_logoAlt}}" style="max-height:48px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />
              <h1 style="margin:0;color:#fff;font-size:22px;{{EB_typo_h1}}">${escapeHtml(config.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;color:#333;{{EB_typo_p}}">
              <p style="margin:0 0 8px;font-size:16px;">Hi ${escapeHtml(customerName)},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">${escapeHtml(config.intro)}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding:6px 0;color:#666;">Booking reference</td>
                  <td style="padding:6px 0;font-weight:700;color:#333;">#${escapeHtml(bookingNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Service</td>
                  <td style="padding:6px 0;color:#333;">${escapeHtml(packageName)}${durationLabel ? ` • ${escapeHtml(durationLabel)}` : ''}</td>
                </tr>
              </table>

              ${bodyExtra}
              ${reasonBlock}
              ${refundBlock}

              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#666;">
                If you have any questions, please reply to this email or contact ${escapeHtml(storeName)}.
              </p>

              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="background:{{EB_footer_bg}};padding:16px 24px;text-align:center;font-size:12px;color:#888;">
              © ${new Date().getFullYear()} ${escapeHtml(storeName)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function isEmailEnabled() {
  return String(process.env.BOOKING_STATUS_EMAILS_ENABLED || 'true').toLowerCase() !== 'false';
}

/**
 * Send booking status email to the customer (cancelled, restored, rescheduled, no_show).
 * @returns {Promise<{ sent: boolean, reason?: string, error?: string }>}
 */
async function sendBookingStatusEmail({
  eventType,
  booking,
  pkg,
  newBooking,
  cancelReason,
  refund,
}) {
  if (!isEmailEnabled()) {
    return { sent: false, reason: 'disabled' };
  }

  const email = booking?.customer?.email;
  if (!email) {
    return { sent: false, reason: 'no_email' };
  }

  const config = EVENT_CONFIG[eventType];
  if (!config) {
    return { sent: false, reason: 'invalid_event' };
  }

  try {
    let html = await buildEmailHtml({
      eventType,
      booking,
      pkg,
      newBooking,
      cancelReason,
      refund,
    });

    const branding = await getEmailBranding();
    html = await applyEmailBrandingToHtml(html, branding);

    const subject = `${config.subject} — #${booking.bookingNumber || 'Booking'}`;

    const info = await sendMail({
      to: email,
      subject,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error(`[booking-email] Failed to send ${eventType} email:`, err.message);
    return { sent: false, error: err.message };
  }
}

/** Fire-and-forget — never blocks or throws to the caller. */
function notifyBookingStatusEmail(payload) {
  sendBookingStatusEmail(payload)
    .then((result) => {
      if (result.sent) {
        console.log(
          `[booking-email] ${payload.eventType} email sent to ${payload.booking?.customer?.email}` +
            (result.messageId ? ` (messageId: ${result.messageId})` : '')
        );
      } else if (result.reason !== 'disabled' && result.reason !== 'no_email') {
        console.warn(`[booking-email] ${payload.eventType} not sent:`, result.reason || result.error);
      }
    })
    .catch((err) => {
      console.error('[booking-email] unexpected error:', err.message);
    });
}

module.exports = {
  sendBookingStatusEmail,
  notifyBookingStatusEmail,
  formatBookingDate: formatDate,
  formatBookingTime: formatTime,
};
