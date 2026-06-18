function isValidTimeHHmm(value) {
  return typeof value === 'string' && /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value.trim());
}

function isValidDateYYYYMMDD(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

module.exports = {
  isValidTimeHHmm,
  isValidDateYYYYMMDD,
};
