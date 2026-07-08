const SENSITIVE_USER_FIELDS =
  '-password -resetPasswordToken -resetPasswordExpires -otp -otpExpires -__v';

/**
 * Strip sensitive fields from a user document/object for API responses.
 */
function toSafeUser(user) {
  if (!user) return null;

  const doc = typeof user.toObject === 'function' ? user.toObject({ virtuals: true }) : { ...user };
  const roleRef = doc.roleId && typeof doc.roleId === 'object' ? doc.roleId : null;

  return {
    id: doc._id ? String(doc._id) : doc.id || null,
    _id: doc._id ? String(doc._id) : doc.id || null,
    firstName: doc.firstname ?? doc.firstName ?? '',
    lastName: doc.lastname ?? doc.lastName ?? '',
    firstname: doc.firstname ?? doc.firstName ?? '',
    lastname: doc.lastname ?? doc.lastName ?? '',
    email: doc.email ?? '',
    phoneNumber: doc.phoneNumber ?? null,
    address: doc.address ?? null,
    companyname: doc.companyname ?? null,
    dateofbirth: doc.dateofbirth ?? null,
    pricingGroup: doc.pricingGroup ?? null,
    role: doc.role ?? 'user',
    roleId: roleRef ? String(roleRef._id || roleRef.id) : doc.roleId ? String(doc.roleId) : null,
    userType: roleRef?.name ?? doc.userType ?? null,
    permissions: roleRef?.permissions ?? doc.permissions ?? null,
    registerForApp: doc.registerForApp ?? false,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}

module.exports = {
  SENSITIVE_USER_FIELDS,
  toSafeUser,
};
