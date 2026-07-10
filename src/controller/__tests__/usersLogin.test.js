const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../models/user');
const bcrypt = require('bcrypt');
const usersController = require('../users');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.cookie = () => res;
  res.clearCookie = () => res;
  return res;
}

function stubUserFindOne(result) {
  return () => ({
    populate: async () => result,
  });
}

describe('users login HTTP responses', () => {
  let originalFindOne;
  let originalCompare;

  afterEach(() => {
    if (originalFindOne) {
      User.findOne = originalFindOne;
      originalFindOne = undefined;
    }
    if (originalCompare) {
      bcrypt.compare = originalCompare;
      originalCompare = undefined;
    }
  });

  test('unknown email returns 401 with generic message', async () => {
    originalFindOne = User.findOne;
    User.findOne = stubUserFindOne(null);

    const res = createMockRes();
    await usersController.loginUser(
      { body: { email: 'missing@test.com', password: 'secret' } },
      res,
      () => {}
    );

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      success: false,
      message: 'Invalid email or password',
    });
  });

  test('incorrect password returns 401 with the same generic message', async () => {
    originalFindOne = User.findOne;
    originalCompare = bcrypt.compare;

    User.findOne = stubUserFindOne({
      _id: '507f1f77bcf86cd799439011',
      email: 'user@test.com',
      password: 'hashed',
      role: 'user',
      roleId: null,
    });
    bcrypt.compare = async () => false;

    const res = createMockRes();
    await usersController.loginUser(
      { body: { email: 'user@test.com', password: 'wrong' } },
      res,
      () => {}
    );

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      success: false,
      message: 'Invalid email or password',
    });
  });

  test('successful login returns HTTP 200', async () => {
    originalFindOne = User.findOne;
    originalCompare = bcrypt.compare;

    User.findOne = stubUserFindOne({
      _id: '507f1f77bcf86cd799439011',
      email: 'user@test.com',
      password: 'hashed',
      role: 'user',
      roleId: null,
    });
    bcrypt.compare = async () => true;

    const res = createMockRes();
    await usersController.loginUser(
      { body: { email: 'user@test.com', password: 'correct' } },
      res,
      () => {}
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Login successful');
    assert.ok(res.body.user);
  });

  test('valid non-superadmin account returns HTTP 403 on superadmin login', async () => {
    originalFindOne = User.findOne;
    originalCompare = bcrypt.compare;

    User.findOne = stubUserFindOne({
      _id: '507f1f77bcf86cd799439011',
      email: 'user@test.com',
      password: 'hashed',
      role: 'user',
      roleId: null,
    });
    bcrypt.compare = async () => true;

    const res = createMockRes();
    await usersController.superadminLogin(
      { body: { email: 'user@test.com', password: 'correct' } },
      res,
      () => {}
    );

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
      success: false,
      message: 'Access denied: superadmin only',
    });
  });
});
