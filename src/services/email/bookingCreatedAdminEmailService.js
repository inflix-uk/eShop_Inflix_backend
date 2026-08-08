const { sendMail, getOrderNotifyRecipientEmail } = require('../../utils/mailer');
const { getEmailBranding, applyEmailBrandingToHtml } = require('../../utils/emailBranding');

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
  return pkg?.name || booking?.package?.name || booking?.packageId?.name || 'Service';
}

function buildSlotsHtml(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return '';

  const rows = slots
    .map(
      (slot, index) => `
      <tr>
        <td style="padding:8px 0;color:#666;width:120px;vertical-align:top;">
          Slot ${slots.length > 1 ? index + 1 : ''}
        </td>
        <td style="padding:8px 0;color:#333;">
          <strong>${escapeHtml(formatDate(slot.date))}</strong><br/>
          ${escapeHtml(formatTime(slot.startTime))} – ${escapeHtml(formatTime(slot.endTime))}
          ${slot.bookingNumber ? `<br/><span style="color:#888;font-size:12px;">#${escapeHtml(slot.bookingNumber)}</span>` : ''}
        </td>
      </tr>`
    )
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function buildExtrasHtml(extras) {
  const list = Array.isArray(extras) ? extras.filter((e) => e?.title) : [];
  if (!list.length) return '';

  const rows = list
    .map(
      (extra) => `
      <tr>
        <td style="padding:6px 0;color:#555;">${escapeHtml(extra.title)}</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;">£${(Number(extra.price) || 0).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
    <p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Extras</p>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

async function buildAdminBookingCreatedHtml({ booking, pkg, slots, groupBookingNumber }) {
  const branding = await getEmailBranding();
  const accent = branding?.primaryHex || '#046d38';
  const customer = booking?.customer || {};
  const packageName = getPackageName(booking, pkg);
  const reference = groupBookingNumber || booking?.bookingNumber || booking?.groupBookingNumber || '';
  const totalAmount = Number(booking?.totalAmount ?? pkg?.price ?? 0) || 0;
  const slotList =
    Array.isArray(slots) && slots.length > 0
      ? slots
      : [
          {
            date: booking?.date,
            startTime: booking?.startTime,
            endTime: booking?.endTime,
            bookingNumber: booking?.bookingNumber,
          },
        ];

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Booking</title>
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${accent};color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:22px;">New Booking Received</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
                A new booking has been created${customer.name ? ` by <strong>${escapeHtml(customer.name)}</strong>` : ''}.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="padding:6px 0;color:#666;width:140px;">Reference</td>
                  <td style="padding:6px 0;font-weight:700;color:#111;">#${escapeHtml(reference)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Service</td>
                  <td style="padding:6px 0;color:#333;">${escapeHtml(packageName)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Type</td>
                  <td style="padding:6px 0;color:#333;text-transform:capitalize;">${escapeHtml(booking?.type || pkg?.type || '')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Status</td>
                  <td style="padding:6px 0;color:#333;text-transform:capitalize;">${escapeHtml(booking?.status || 'pending')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Payment</td>
                  <td style="padding:6px 0;color:#333;text-transform:capitalize;">${escapeHtml(booking?.paymentStatus || 'unpaid')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Source</td>
                  <td style="padding:6px 0;color:#333;text-transform:capitalize;">${escapeHtml(booking?.source || 'online')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Total</td>
                  <td style="padding:6px 0;font-weight:700;color:#111;">£${totalAmount.toFixed(2)}</td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Schedule</p>
              ${buildSlotsHtml(slotList)}

              <p style="margin:20px 0 8px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Customer</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#666;width:140px;">Name</td>
                  <td style="padding:6px 0;color:#333;">${escapeHtml(customer.name || '')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Email</td>
                  <td style="padding:6px 0;color:#333;">${escapeHtml(customer.email || '')}</td>
                </tr>
                ${
                  customer.phone
                    ? `<tr>
                  <td style="padding:6px 0;color:#666;">Phone</td>
                  <td style="padding:6px 0;color:#333;">${escapeHtml(customer.phone)}</td>
                </tr>`
                    : ''
                }
              </table>

              ${buildExtrasHtml(booking?.extras)}

              ${
                booking?.notes
                  ? `<p style="margin:20px 0 8px;font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Notes</p>
                     <p style="margin:0;padding:12px;background:#f5f5f5;border-radius:6px;color:#444;">${escapeHtml(booking.notes)}</p>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  html = await applyEmailBrandingToHtml(html, branding);
  return html;
}

function isEmailEnabled() {
  return String(process.env.BOOKING_ADMIN_EMAILS_ENABLED || 'true').toLowerCase() !== 'false';
}

/**
 * Send "new booking created" email to the admin notify address from SMTP settings.
 * @returns {Promise<{ sent: boolean, reason?: string, error?: string, to?: string }>}
 */
async function sendBookingCreatedAdminEmail({ booking, pkg, slots, groupBookingNumber }) {
  if (!isEmailEnabled()) {
    return { sent: false, reason: 'disabled' };
  }

  if (!booking) {
    return { sent: false, reason: 'no_booking' };
  }

  const to = await getOrderNotifyRecipientEmail();
  if (!to) {
    return { sent: false, reason: 'no_admin_email' };
  }

  try {
    const reference = groupBookingNumber || booking.bookingNumber || booking.groupBookingNumber || 'Booking';
    const html = await buildAdminBookingCreatedHtml({
      booking,
      pkg,
      slots,
      groupBookingNumber: reference,
    });

    const info = await sendMail({
      to,
      subject: `New Booking Received - ${reference}`,
      html,
    });

    return { sent: true, to, messageId: info?.messageId, response: info?.response };
  } catch (err) {
    console.error('[booking-admin-email] Failed to send booking created email:', err.message);
    return { sent: false, to, error: err.message };
  }
}

/** Fire-and-forget — logs success/failure to backend console. */
function notifyBookingCreatedAdminEmail(payload) {
  const reference =
    payload?.groupBookingNumber ||
    payload?.booking?.bookingNumber ||
    payload?.booking?.groupBookingNumber ||
    'unknown';

  console.log(`[booking-admin-email] Sending new booking notification for #${reference}...`);

  sendBookingCreatedAdminEmail(payload)
    .then((result) => {
      if (result.sent) {
        console.log(
          `[booking-admin-email] ✅ Booking created email SENT for #${reference} → ${result.to}` +
            (result.messageId ? ` (messageId: ${result.messageId})` : '')
        );
      } else {
        console.warn(
          `[booking-admin-email] ❌ Booking created email NOT sent for #${reference}:`,
          result.reason || result.error || 'unknown'
        );
        if (result.reason === 'no_admin_email') {
          console.warn(
            '[booking-admin-email] Tip: set “New order notifications (admin)” email in Admin → Settings → SMTP'
          );
        }
      }
    })
    .catch((err) => {
      console.error(
        `[booking-admin-email] ❌ unexpected error sending booking email for #${reference}:`,
        err.message
      );
    });
}

module.exports = {
  sendBookingCreatedAdminEmail,
  notifyBookingCreatedAdminEmail,
};
