const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const {
  createEmailKeyedRateLimiter,
  createIpKeyedRateLimiter,
} = require('../createRateLimiter');
const {
  FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
  RESET_PASSWORD_RATE_LIMIT_MESSAGE,
} = require('../passwordResetRateLimits');

function createForgotTestApp(limiter) {
  const app = express();
  app.use(express.json());
  app.post('/forgotpassword', limiter, (req, res) => {
    res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a reset link has been sent.',
      status: 201,
    });
  });
  return app;
}

function createResetTestApp(limiter) {
  const app = express();
  app.use(express.json());
  app.post('/resetpassword', limiter, (req, res) => {
    if (req.body.outcome === 'success') {
      return res.status(200).json({ success: true, message: 'Password reset successful' });
    }
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  });
  return app;
}

describe('forgot password rate limit', () => {
  test('returns 429 after 3 requests for the same IP and email', async () => {
    const limiter = createEmailKeyedRateLimiter({
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });
    const app = createForgotTestApp(limiter);
    const agent = request(app);
    const payload = { email: 'user@test.com' };

    for (let i = 0; i < 3; i += 1) {
      const res = await agent.post('/forgotpassword').send(payload);
      assert.equal(res.status, 200);
    }

    const blocked = await agent.post('/forgotpassword').send(payload);
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false,
      message: FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });
  });

  test('different emails on the same IP use separate buckets', async () => {
    const limiter = createEmailKeyedRateLimiter({
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });
    const app = createForgotTestApp(limiter);
    const agent = request(app);

    for (let i = 0; i < 3; i += 1) {
      await agent.post('/forgotpassword').send({ email: 'first@test.com' });
    }

    const blocked = await agent.post('/forgotpassword').send({ email: 'first@test.com' });
    assert.equal(blocked.status, 429);

    const otherEmail = await agent.post('/forgotpassword').send({ email: 'second@test.com' });
    assert.equal(otherEmail.status, 200);
  });
});

describe('reset password rate limit', () => {
  test('returns 429 after 10 failed token attempts from the same IP', async () => {
    const limiter = createIpKeyedRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: RESET_PASSWORD_RATE_LIMIT_MESSAGE,
      skipSuccessfulRequests: true,
    });
    const app = createResetTestApp(limiter);
    const agent = request(app);

    for (let i = 0; i < 10; i += 1) {
      const res = await agent.post('/resetpassword').send({ outcome: 'fail' });
      assert.equal(res.status, 400);
    }

    const blocked = await agent.post('/resetpassword').send({ outcome: 'fail' });
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false,
      message: RESET_PASSWORD_RATE_LIMIT_MESSAGE,
    });
  });

  test('successful reset does not consume the failed-attempt quota', async () => {
    const limiter = createIpKeyedRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: RESET_PASSWORD_RATE_LIMIT_MESSAGE,
      skipSuccessfulRequests: true,
    });
    const app = createResetTestApp(limiter);
    const agent = request(app);

    for (let i = 0; i < 9; i += 1) {
      const res = await agent.post('/resetpassword').send({ outcome: 'fail' });
      assert.equal(res.status, 400);
    }

    const success = await agent.post('/resetpassword').send({ outcome: 'success' });
    assert.equal(success.status, 200);

    const tenthFail = await agent.post('/resetpassword').send({ outcome: 'fail' });
    assert.equal(tenthFail.status, 400);

    const blocked = await agent.post('/resetpassword').send({ outcome: 'fail' });
    assert.equal(blocked.status, 429);
  });
});
