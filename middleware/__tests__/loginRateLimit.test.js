const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const {
  createLoginRateLimiter,
  normalizeLoginEmail,
  buildLoginRateLimitKey,
  LOGIN_RATE_LIMIT_MESSAGE,
} = require('../createRateLimiter');

function createTestApp(limiter, { trustProxy = false } = {}) {
  const app = express();
  if (trustProxy) {
    app.set('trust proxy', true);
  }
  app.use(express.json());
  app.post('/login', limiter, (req, res) => {
    if (req.body.outcome === 'success') {
      return res.status(200).json({ success: true });
    }
    if (req.body.outcome === 'forbidden') {
      return res.status(403).json({ success: false });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  });
  return app;
}

function postLoginWithIp(app, ip) {
  return request(app).post('/login').set('X-Forwarded-For', ip);
}

describe('normalizeLoginEmail / buildLoginRateLimitKey', () => {
  test('normalizes trim and lowercase', () => {
    assert.equal(normalizeLoginEmail('  User@Example.COM  '), 'user@example.com');
  });

  test('missing email uses __empty__', () => {
    assert.equal(normalizeLoginEmail(undefined), '__empty__');
    assert.equal(normalizeLoginEmail('   '), '__empty__');
  });

  test('buildLoginRateLimitKey combines ip and normalized email', () => {
    const req = {
      ip: '203.0.113.10',
      body: { email: '  Alice@Site.com ' },
    };
    assert.equal(buildLoginRateLimitKey(req), '203.0.113.10:alice@site.com');
  });
});

describe('user login rate limit', () => {
  test('returns 429 after 5 failed attempts', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    const app = createTestApp(limiter);
    const agent = request(app);
    const payload = { email: 'user@test.com', outcome: 'fail' };

    for (let i = 0; i < 5; i += 1) {
      const res = await agent.post('/login').send(payload);
      assert.equal(res.status, 401, `attempt ${i + 1} should be 401`);
    }

    const blocked = await agent.post('/login').send(payload);
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false,
      message: LOGIN_RATE_LIMIT_MESSAGE,
    });
    assert.ok(blocked.headers['ratelimit-limit']);
    assert.ok(!blocked.headers['x-ratelimit-limit']);
  });

  test('successful login does not consume failed-attempt quota', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    const app = createTestApp(limiter);
    const agent = request(app);
    const email = 'quota@test.com';

    for (let i = 0; i < 4; i += 1) {
      const res = await agent.post('/login').send({ email, outcome: 'fail' });
      assert.equal(res.status, 401);
    }

    const success = await agent.post('/login').send({ email, outcome: 'success' });
    assert.equal(success.status, 200);

    const fifthFail = await agent.post('/login').send({ email, outcome: 'fail' });
    assert.equal(fifthFail.status, 401, 'fifth failure should still be allowed');

    const sixthFail = await agent.post('/login').send({ email, outcome: 'fail' });
    assert.equal(sixthFail.status, 429);
  });

  test('different emails on the same IP use separate buckets', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    const app = createTestApp(limiter);
    const agent = request(app);

    for (let i = 0; i < 5; i += 1) {
      await agent.post('/login').send({ email: 'first@test.com', outcome: 'fail' });
    }

    const blockedFirst = await agent.post('/login').send({
      email: 'first@test.com',
      outcome: 'fail',
    });
    assert.equal(blockedFirst.status, 429);

    const otherEmail = await agent.post('/login').send({
      email: 'second@test.com',
      outcome: 'fail',
    });
    assert.equal(otherEmail.status, 401);
  });

  test('email case and whitespace variants share one bucket', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    const app = createTestApp(limiter);
    const agent = request(app);

    const variants = [
      'Shared@test.com',
      '  shared@test.com',
      'SHARED@TEST.COM',
      'shared@test.com  ',
      'shared@test.com',
    ];

    for (const email of variants) {
      const res = await agent.post('/login').send({ email, outcome: 'fail' });
      assert.equal(res.status, 401);
    }

    const blocked = await agent.post('/login').send({
      email: 'shared@test.com',
      outcome: 'fail',
    });
    assert.equal(blocked.status, 429);
  });

  test('missing email uses the __empty__ bucket', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    const app = createTestApp(limiter);
    const agent = request(app);

    for (let i = 0; i < 5; i += 1) {
      const res = await agent.post('/login').send({ outcome: 'fail' });
      assert.equal(res.status, 401);
    }

    const blocked = await agent.post('/login').send({ outcome: 'fail' });
    assert.equal(blocked.status, 429);
  });
});

describe('superadmin login rate limit', () => {
  test('returns 429 after 3 failed attempts', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 30 * 60 * 1000,
      max: 3,
    });
    const app = createTestApp(limiter);
    const agent = request(app);
    const payload = { email: 'admin@test.com', outcome: 'fail' };

    for (let i = 0; i < 3; i += 1) {
      const res = await agent.post('/login').send(payload);
      assert.equal(res.status, 401);
    }

    const blocked = await agent.post('/login').send(payload);
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false,
      message: LOGIN_RATE_LIMIT_MESSAGE,
    });
  });

  test('HTTP 403 counts as a failed superadmin attempt', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 30 * 60 * 1000,
      max: 3,
    });
    const app = createTestApp(limiter);
    const agent = request(app);
    const email = 'regular@test.com';

    for (let i = 0; i < 2; i += 1) {
      const res = await agent.post('/login').send({ email, outcome: 'forbidden' });
      assert.equal(res.status, 403);
    }

    const third = await agent.post('/login').send({ email, outcome: 'forbidden' });
    assert.equal(third.status, 403);

    const blocked = await agent.post('/login').send({ email, outcome: 'forbidden' });
    assert.equal(blocked.status, 429);
  });
});

describe('proxy trust and client IP keying', () => {
  test('uses X-Forwarded-For client IP when trust proxy is enabled', async () => {
    const limiter = createLoginRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    const app = createTestApp(limiter, { trustProxy: true });
    const email = 'proxy@test.com';

    for (let i = 0; i < 5; i += 1) {
      const res = await postLoginWithIp(app, '198.51.100.20').send({
        email,
        outcome: 'fail',
      });
      assert.equal(res.status, 401);
    }

    const blockedSameIp = await postLoginWithIp(app, '198.51.100.20').send({
      email,
      outcome: 'fail',
    });
    assert.equal(blockedSameIp.status, 429);

    const differentIp = await postLoginWithIp(app, '198.51.100.99').send({
      email,
      outcome: 'fail',
    });
    assert.equal(differentIp.status, 401);
  });
});
