const INVALID_CREDENTIALS_BODY = {
  success: false,
  message: 'Invalid email or password',
};

function sendInvalidCredentials(res) {
  return res.status(401).json(INVALID_CREDENTIALS_BODY);
}

module.exports = {
  INVALID_CREDENTIALS_BODY,
  sendInvalidCredentials,
};
