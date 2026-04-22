const ContactUsWidget = require('../models/contactUsWidget');
const ContactUsSubmission = require('../models/contactUsSubmission');
const { sendMail } = require('../utils/mailer');
const { resolveContactInboxTo } = require('../services/contactInboxResolve');
const {
  defaultWidgetPayload,
  validateWidgetSchema,
  validateSubmission,
  buildSubmissionEmailHtml,
  replyToFromAnswers,
} = require('../services/contactUsWidgetService');

function serializeWidget(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id,
    isActive: o.isActive !== false,
    title: o.title || '',
    description: o.description || '',
    submitButtonLabel: o.submitButtonLabel || 'Send',
    successMessage: o.successMessage || '',
    fields: Array.isArray(o.fields) ? o.fields : [],
    updatedAt: o.updatedAt || null,
  };
}

exports.getPublic = async (req, res) => {
  try {
    const doc = await ContactUsWidget.findOne().lean();
    if (!doc || doc.isActive === false) {
      return res.status(200).json({ success: true, data: null });
    }
    return res.status(200).json({ success: true, data: serializeWidget(doc) });
  } catch (error) {
    console.error('contactUsWidget getPublic:', error);
    return res.status(500).json({ success: false, message: 'Failed to load contact widget' });
  }
};

exports.getAdmin = async (req, res) => {
  try {
    let doc = await ContactUsWidget.findOne();
    if (!doc) {
      return res.status(200).json({
        success: true,
        data: defaultWidgetPayload(),
        persisted: false,
      });
    }
    return res.status(200).json({
      success: true,
      data: serializeWidget(doc),
      persisted: true,
    });
  } catch (error) {
    console.error('contactUsWidget getAdmin:', error);
    return res.status(500).json({ success: false, message: 'Failed to load contact widget' });
  }
};

exports.saveAdmin = async (req, res) => {
  try {
    const body = req.body || {};
    const v = validateWidgetSchema(body);
    if (!v.ok) {
      return res.status(400).json({ success: false, message: v.message });
    }

    const setDoc = {
      isActive: body.isActive !== false,
      title: String(body.title ?? '').trim().slice(0, 200),
      description: String(body.description || '').trim().slice(0, 5000),
      submitButtonLabel: String(body.submitButtonLabel || 'Send').trim().slice(0, 80),
      successMessage: String(body.successMessage || '').trim().slice(0, 500),
      fields: v.fields,
    };

    const doc = await ContactUsWidget.findOneAndUpdate({}, { $set: setDoc }, { upsert: true, new: true });

    return res.status(200).json({
      success: true,
      message: 'Contact widget saved',
      data: serializeWidget(doc),
    });
  } catch (error) {
    console.error('contactUsWidget saveAdmin:', error);
    return res.status(500).json({ success: false, message: 'Failed to save contact widget' });
  }
};

exports.submit = async (req, res) => {
  try {
    const widgetId = req.body?.widgetId;
    const answers = req.body?.answers;
    const embeddedWidget = req.body?.embeddedWidget;

    let widgetDoc;

    if (embeddedWidget && typeof embeddedWidget === 'object' && Array.isArray(embeddedWidget.fields)) {
      const v = validateWidgetSchema(embeddedWidget);
      if (!v.ok) {
        return res.status(400).json({ success: false, message: v.message });
      }
      if (embeddedWidget.isActive === false) {
        return res.status(400).json({ success: false, message: 'Contact form is not available.' });
      }
      widgetDoc = {
        _id: null,
        title: String(embeddedWidget.title ?? '').trim().slice(0, 200),
        description: String(embeddedWidget.description || '').trim().slice(0, 5000),
        submitButtonLabel: String(embeddedWidget.submitButtonLabel || 'Send').trim().slice(0, 80),
        successMessage: String(embeddedWidget.successMessage || '').trim().slice(0, 500),
        fields: v.fields,
      };
    } else {
      widgetDoc = widgetId
        ? await ContactUsWidget.findById(widgetId).lean()
        : await ContactUsWidget.findOne().lean();

      if (!widgetDoc || widgetDoc.isActive === false) {
        return res.status(400).json({ success: false, message: 'Contact form is not available.' });
      }
    }

    const fields = [...(widgetDoc.fields || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const val = validateSubmission(fields, answers);
    if (!val.ok) {
      return res.status(400).json({
        success: false,
        message: 'Please fix the highlighted fields.',
        errors: val.errors,
      });
    }

    const submission = await ContactUsSubmission.create({
      widgetId: widgetDoc._id || null,
      answers: val.sanitized,
      ip: (req.ip || req.headers['x-forwarded-for'] || '').toString().slice(0, 200),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    });

    const to = await resolveContactInboxTo();
    const html = buildSubmissionEmailHtml(widgetDoc, val.sanitized);
    const replyTo = replyToFromAnswers(fields, val.sanitized);

    await sendMail({
      to,
      replyTo,
      subject: `[Contact widget] ${widgetDoc.title || 'New message'}`.slice(0, 900),
      html,
    });

    console.log(`[contact-us-widget/submit] submission ${submission._id} → inbox ${to}`);

    return res.status(201).json({
      success: true,
      message: widgetDoc.successMessage || 'Your message has been sent.',
      submissionId: submission._id,
    });
  } catch (err) {
    console.error('contactUsWidget submit:', err);
    const code = err && err.code;
    const isConfig =
      code === 'SMTP_NOT_CONFIGURED' ||
      code === 'SMTP_FROM_MISSING' ||
      (err.message && /SMTP is not/i.test(err.message));
    const message = isConfig
      ? 'Email is not configured on the server. Please try again later.'
      : 'Failed to send your message. Please try again later.';
    return res.status(500).json({ success: false, message });
  }
};
