const REGISTRATION_REJECTED_MESSAGE =
  'Unable to complete registration. Please check your details or try logging in.';

function sendRegistrationRejected(res) {
  return res.status(400).json({
    success: false,
    message: REGISTRATION_REJECTED_MESSAGE,
  });
}

module.exports = {
  REGISTRATION_REJECTED_MESSAGE,
  sendRegistrationRejected,
};
