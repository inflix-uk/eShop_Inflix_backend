const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertSelfOrAdmin,
  assertOrderAccess,
  resolveScopedUserId,
  orderOwnedByRequester,
} = require('../ownershipAuth');

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439012';

function reqAs(user, role = 'user') {
  return {
    user: {
      _id: user,
      id: user,
      email: user === USER_A ? 'a@example.com' : 'b@example.com',
      role,
    },
  };
}

describe('ownershipAuth', () => {
  test('customer cannot access another user id', () => {
    const result = assertSelfOrAdmin(reqAs(USER_A), USER_B);
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  test('customer can access own user id', () => {
    const result = assertSelfOrAdmin(reqAs(USER_A), USER_A);
    assert.equal(result.ok, true);
  });

  test('admin can access another user id', () => {
    const result = assertSelfOrAdmin(reqAs(USER_A, 'admin'), USER_B);
    assert.equal(result.ok, true);
  });

  test('resolveScopedUserId ignores client userId for customers', () => {
    const result = resolveScopedUserId(reqAs(USER_A), USER_B);
    assert.equal(result.ok, false);
  });

  test('order access by userId', () => {
    const order = { contactDetails: { userId: USER_A, email: 'a@example.com' } };
    assert.equal(orderOwnedByRequester(reqAs(USER_A), order), true);
    assert.equal(orderOwnedByRequester(reqAs(USER_B), order), false);
  });

  test('order access by email for guest orders', () => {
    const order = { contactDetails: { email: 'a@example.com' } };
    const access = assertOrderAccess(reqAs(USER_A), order);
    assert.equal(access.ok, true);
  });

  test('admin bypass on order access when allowed', () => {
    const order = { contactDetails: { userId: USER_B, email: 'b@example.com' } };
    const access = assertOrderAccess(reqAs(USER_A, 'admin'), order, { allowAdmin: true });
    assert.equal(access.ok, true);
  });
});
