const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../models/user');
const { REGISTRATION_REJECTED_MESSAGE } = require('../../utils/registrationResponses');

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

describe('registerUser security responses', () => {
  let originalFindOne;

  afterEach(() => {
    if (originalFindOne) {
      User.findOne = originalFindOne;
      originalFindOne = undefined;
    }
    delete require.cache[require.resolve('../users')];
  });

  test('duplicate email returns generic 400 without enumeration', async () => {
    originalFindOne = User.findOne;
    User.findOne = async (query) => {
      if (query.email) {
        return { _id: '507f1f77bcf86cd799439011', email: query.email };
      }
      return null;
    };

    const usersController = require('../users');
    const res = createMockRes();

    await usersController.registerUser(
      {
        body: {
          firstName: 'Test',
          lastName: 'User',
          email: 'exists@test.com',
          password: 'secret',
        },
      },
      res,
      () => {}
    );

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      success: false,
      message: REGISTRATION_REJECTED_MESSAGE,
    });
  });

  test('duplicate phone returns the same generic 400 message', async () => {
    originalFindOne = User.findOne;
    User.findOne = async (query) => {
      if (query.email) return null;
      if (query.phoneNumber) {
        return { _id: '507f1f77bcf86cd799439012', phoneNumber: query.phoneNumber };
      }
      return null;
    };

    const usersController = require('../users');
    const res = createMockRes();

    await usersController.registerUser(
      {
        body: {
          firstName: 'Test',
          lastName: 'User',
          email: 'new@test.com',
          password: 'secret',
          phoneNumber: '07123456789',
        },
      },
      res,
      () => {}
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, REGISTRATION_REJECTED_MESSAGE);
  });
});
