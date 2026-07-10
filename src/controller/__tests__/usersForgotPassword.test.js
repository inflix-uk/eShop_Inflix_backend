const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../models/user');

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
  return res;
}

describe('forgotPassword generic response', () => {
  let originalFindOne;

  afterEach(() => {
    if (originalFindOne) {
      User.findOne = originalFindOne;
      originalFindOne = undefined;
    }
    delete require.cache[require.resolve('../users')];
  });

  test('unknown email returns the same ack as a valid email (no enumeration)', async () => {
    originalFindOne = User.findOne;
    User.findOne = async () => null;

    const usersController = require('../users');
    const res = createMockRes();

    await usersController.forgotPassword({ body: { email: 'missing@test.com' } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(
      res.body.message,
      'If an account exists for this email, a reset link has been sent.'
    );
    assert.equal(res.body.status, 201);
  });
});
