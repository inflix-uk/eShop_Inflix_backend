const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createEmailKeyedRateLimiter } = require('../createRateLimiter');
const { REGISTER_RATE_LIMIT_MESSAGE } = require('../registrationRateLimits');

function createRegisterTestApp(limiter) {
  const app = express();
  app.use(express.json());
  app.post('/register', limiter, (req, res) => {
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      status: 201,
    });
  });
  return app;
}

describe('register rate limit', () => {
  test('returns 429 after 5 registration attempts for the same IP and email', async () => {
    const limiter = createEmailKeyedRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: REGISTER_RATE_LIMIT_MESSAGE,
    });
    const app = createRegisterTestApp(limiter);
    const agent = request(app);
    const payload = { email: 'newuser@test.com', password: 'secret' };

    for (let i = 0; i < 5; i += 1) {
      const res = await agent.post('/register').send(payload);
      assert.equal(res.status, 201);
    }

    const blocked = await agent.post('/register').send(payload);
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false,
      message: REGISTER_RATE_LIMIT_MESSAGE,
    });
  });

  test('different emails on the same IP use separate buckets', async () => {
    const limiter = createEmailKeyedRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: REGISTER_RATE_LIMIT_MESSAGE,
    });
    const app = createRegisterTestApp(limiter);
    const agent = request(app);

    for (let i = 0; i < 5; i += 1) {
      await agent.post('/register').send({ email: 'first@test.com' });
    }

    const blocked = await agent.post('/register').send({ email: 'first@test.com' });
    assert.equal(blocked.status, 429);

    const otherEmail = await agent.post('/register').send({ email: 'second@test.com' });
    assert.equal(otherEmail.status, 201);
  });
});
