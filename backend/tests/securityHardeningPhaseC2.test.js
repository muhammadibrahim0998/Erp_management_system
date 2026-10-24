const assert = require('node:assert');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============================================================================
// ENVIRONMENT & SAFETY GUARDS
// ============================================================================
const nodeEnv = process.env.NODE_ENV || 'test';
if (nodeEnv === 'production') {
  console.error('FATAL SAFETY VIOLATION: Tests must never execute in a production environment.');
  process.exit(1);
}

const currentDb = process.env.DB_NAME || '';
const isTestDb = currentDb.toLowerCase().endsWith('_test') || currentDb === 'yaf_erp_test';
if (!isTestDb) {
  console.error(`\n====================================================================`);
  console.error(`FATAL SAFETY REFUSAL: Unverified or non-test database configuration.`);
  console.error(`Active DB_NAME: "${currentDb || '(empty - defaults to dev/prod)'}"`);
  console.error(`Tests are strictly blocked from running against development or production databases.`);
  console.error(`To run tests safely, provide an isolated test database:`);
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/securityHardeningPhaseC2.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const express = require('express');
const { db } = require('../config/db');
const { initSchema } = require('../initDb');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const apiRoutes = require('../routes');

async function runPhaseC2SecurityTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PHASE C2 AUTHENTICATION SECURITY SUITE');
  console.log('====================================================================');
  console.log(`[Safety Guard] Node Environment: ${nodeEnv}`);
  console.log(`[Safety Guard] Database Target:   ${currentDb} (ISOLATED TEST DATABASE)`);

  const [dbNameRows] = await db.query('SELECT DATABASE() as active_db');
  const activeDbName = dbNameRows[0]?.active_db;
  assert.strictEqual(
    activeDbName,
    currentDb,
    `Active database mismatch: Expected ${currentDb}, got ${activeDbName}`
  );
  console.log(`[Safety Guard] Verified Connection: Connected to "${activeDbName}"`);

  // Ensure schema migrations are applied to the test database
  await initSchema(db);
  const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'token_version'");
  assert.ok(cols.length > 0, 'Schema migration failure: token_version column missing on users table');
  console.log(`[Safety Guard] Verified Schema: users.token_version column verified.`);

  // Mount test Express HTTP server with trust proxy enabled for test client IP isolation
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(optionalUserExtractor);
  app.use('/api', apiRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const ephemeralPort = server.address().port;
  const BASE_URL = `http://127.0.0.1:${ephemeralPort}`;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${ephemeralPort}`);
  console.log('====================================================================\n');

  const RUN_SIGNATURE = 'C2_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const createdUserIds = new Set();
  const createdUserEmails = new Set();

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  PASS: [${total.toString().padStart(2, '0')}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: [${total.toString().padStart(2, '0')}] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  async function createTestUser({
    name,
    role = 'Staff',
    department = 'General',
    email,
    password,
    status = 'active',
    tokenVersion = 1
  }) {
    const uniqueEmail = email || `c2_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@yaf-c2-test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status, token_version)
       VALUES (?, ?, ?, 'TU', ?, ?, ?, ?)`,
      [name, role, department, uniqueEmail, password, status, tokenVersion]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    createdUserEmails.add(uniqueEmail);
    return {
      id: userId,
      name,
      role,
      department,
      email: uniqueEmail,
      status,
      token_version: tokenVersion
    };
  }

  let reqCount = 0;
  function makeRequest({ method, path, headers = {}, body = null }) {
    reqCount++;
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const reqHeaders = {
        'x-forwarded-for': `198.51.100.${(reqCount % 240) + 1}`,
        ...headers
      };
      let payload = null;

      if (body !== null) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['content-type'] && !reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          headers: reqHeaders
        },
        (res) => {
          let responseData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            let json = null;
            try {
              json = JSON.parse(responseData);
            } catch (_) {}
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: json,
              rawBody: responseData
            });
          });
        }
      );

      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  try {
    const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

    // ========================================================================
    // SCOPE A: CONSISTENT LOGIN FAILURE BEHAVIOR & TIMING DEFENSE
    // ========================================================================
    console.log('--- SCOPE A: LOGIN TIMING DEFENSE & CONSISTENT FAILURE BEHAVIOR ---');

    await test('Non-existent email returns generic 401 { error: "Invalid email or password" }', async () => {
      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: `ghost_${Date.now()}@yaf-c2-nonexistent.com`,
          password: 'AnyPassword123!'
        }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error, 'Invalid email or password');
    });

    await test('Existing user with wrong password returns identical generic 401', async () => {
      const user = await createTestUser({
        name: 'Scope A Wrong Pass User',
        password: hashedPassword
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: user.email,
          password: 'WrongPassword999!'
        }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error, 'Invalid email or password');
    });

    await test('Non-existent email executes bcrypt compare for timing side-channel mitigation', async () => {
      // Warm up JIT
      await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'warmup@yaf-c2.com', password: 'Password123!' }
      });

      const startNonExistent = Date.now();
      await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: `timing_${Date.now()}@yaf-c2-ghost.com`, password: 'TestPassword123!' }
      });
      const durationNonExistent = Date.now() - startNonExistent;

      // Bcrypt hash comparison at cost 10 typically takes > 30ms on modern CPUs.
      // An instant response (< 5ms) indicates no bcrypt compare occurred.
      assert.ok(
        durationNonExistent >= 20,
        `Timing attack defense failed: non-existent email responded too quickly (${durationNonExistent}ms), indicating no dummy bcrypt compare was executed`
      );
    });

    await test('Legacy plaintext password in database fails closed with generic 401', async () => {
      const user = await createTestUser({
        name: 'Plaintext Password User',
        password: 'plaintext_password_in_db'
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: user.email,
          password: 'plaintext_password_in_db'
        }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error, 'Invalid email or password');
    });

    await test('Malformed bcrypt hash in database fails closed with generic 401', async () => {
      const user = await createTestUser({
        name: 'Malformed Hash User',
        password: '$2a$10$malformed_truncated_hash'
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: user.email,
          password: 'SomePassword123!'
        }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error, 'Invalid email or password');
    });

    await test('Deactivated account with INCORRECT password returns generic 401 (does not leak deactivation)', async () => {
      const user = await createTestUser({
        name: 'Suspended User Wrong Pass',
        password: hashedPassword,
        status: 'suspended'
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: user.email,
          password: 'IncorrectPassword999!'
        }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error, 'Invalid email or password');
    });

    await test('Deactivated account with CORRECT password returns 403 Account is deactivated', async () => {
      const user = await createTestUser({
        name: 'Suspended User Correct Pass',
        password: hashedPassword,
        status: 'suspended'
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: user.email,
          password: 'CorrectPassword123!'
        }
      });
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.error, 'Account is deactivated. Please contact ERP Administrator.');
    });

    await test('Active user with valid credentials logs in successfully and receives JWT with token_version', async () => {
      const user = await createTestUser({
        name: 'Valid Login User',
        password: hashedPassword,
        status: 'active'
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: user.email,
          password: 'CorrectPassword123!'
        }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body?.token, 'Response must include JWT token');
      assert.strictEqual(res.body?.user?.email, user.email);

      const decoded = jwt.decode(res.body.token);
      assert.strictEqual(decoded.token_version, 1, 'Decoded token must include token_version: 1');
      assert.strictEqual(decoded.id, user.id);
    });

    await test('Missing or malformed login credentials reject with 400', async () => {
      const resMissing = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: '' }
      });
      assert.strictEqual(resMissing.statusCode, 400);

      const resType = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'user@yaf.com', password: 12345 }
      });
      assert.strictEqual(resType.statusCode, 400);
    });

    // ========================================================================
    // SCOPE B: TOKEN VERSIONING & PASSWORD CHANGE INVALIDATION
    // ========================================================================
    console.log('\n--- SCOPE B: TOKEN VERSIONING & REVOCATION AFTER PASSWORD CHANGE ---');

    await test('Protected route /api/auth/me succeeds with freshly issued token', async () => {
      const user = await createTestUser({
        name: 'Token Version Valid User',
        password: hashedPassword,
        status: 'active'
      });

      const loginRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'CorrectPassword123!' }
      });
      const token = loginRes.body.token;

      const meRes = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(meRes.statusCode, 200);
      assert.strictEqual(meRes.body?.email, user.email);
    });

    await test('Changing password via /api/auth/change-password increments token_version in DB', async () => {
      const user = await createTestUser({
        name: 'Change Password User',
        password: hashedPassword,
        status: 'active'
      });

      const loginRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'CorrectPassword123!' }
      });
      const originalToken = loginRes.body.token;

      const changeRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/change-password',
        headers: { Authorization: `Bearer ${originalToken}` },
        body: {
          currentPassword: 'CorrectPassword123!',
          newPassword: 'BrandNewSecurePassword456!'
        }
      });
      assert.strictEqual(changeRes.statusCode, 200);
      assert.strictEqual(changeRes.body?.success, true);

      // Verify DB token_version incremented to 2
      const [rows] = await db.query('SELECT token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(rows[0].token_version, 2, 'Database token_version must be incremented to 2');
    });

    await test('Token issued before password change is strictly rejected on protected routes with 401', async () => {
      const user = await createTestUser({
        name: 'Invalidated Old Token User',
        password: hashedPassword,
        status: 'active'
      });

      // Login to get token (version 1)
      const loginRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'CorrectPassword123!' }
      });
      const tokenBeforeChange = loginRes.body.token;

      // Verify token initially works
      const initialMe = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${tokenBeforeChange}` }
      });
      assert.strictEqual(initialMe.statusCode, 200);

      // Change password
      await makeRequest({
        method: 'POST',
        path: '/api/auth/change-password',
        headers: { Authorization: `Bearer ${tokenBeforeChange}` },
        body: {
          currentPassword: 'CorrectPassword123!',
          newPassword: 'UpdatedPassword789!'
        }
      });

      // Now verify old token is REJECTED
      const postChangeMe = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${tokenBeforeChange}` }
      });
      assert.strictEqual(postChangeMe.statusCode, 401);
      assert.strictEqual(
        postChangeMe.body?.error,
        'Token has been revoked or invalidated. Please log in again.'
      );
    });

    await test('Newly issued token after password change succeeds on protected routes', async () => {
      const user = await createTestUser({
        name: 'New Token User',
        password: hashedPassword,
        status: 'active'
      });

      // Login and change password
      const login1 = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'CorrectPassword123!' }
      });
      await makeRequest({
        method: 'POST',
        path: '/api/auth/change-password',
        headers: { Authorization: `Bearer ${login1.body.token}` },
        body: {
          currentPassword: 'CorrectPassword123!',
          newPassword: 'BrandNewPassword2026!'
        }
      });

      // Login with new password
      const login2 = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'BrandNewPassword2026!' }
      });
      assert.strictEqual(login2.statusCode, 200);
      const newToken = login2.body.token;

      const decoded = jwt.decode(newToken);
      assert.strictEqual(decoded.token_version, 2, 'New token must have token_version: 2');

      const meRes = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${newToken}` }
      });
      assert.strictEqual(meRes.statusCode, 200);
      assert.strictEqual(meRes.body?.email, user.email);
    });

    await test('Admin password reset via /api/users/:id/reset-password increments token_version and invalidates user token', async () => {
      const admin = await createTestUser({
        name: 'Admin For Reset',
        role: 'ERP Admin',
        password: hashedPassword,
        status: 'active'
      });
      const adminToken = jwt.sign(
        { id: admin.id, role: 'ERP Admin', email: admin.email, name: admin.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const targetUser = await createTestUser({
        name: 'Target User For Admin Reset',
        role: 'Staff',
        password: hashedPassword,
        status: 'active'
      });
      const userToken = jwt.sign(
        { id: targetUser.id, role: 'Staff', email: targetUser.email, name: targetUser.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verify target user token works before reset
      const preCheck = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(preCheck.statusCode, 200);

      // Admin resets target user password
      const resetRes = await makeRequest({
        method: 'POST',
        path: `/api/users/${targetUser.id}/reset-password`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { newPassword: 'AdminAssignedNewPass99!' }
      });
      assert.strictEqual(resetRes.statusCode, 200);
      assert.strictEqual(resetRes.body?.success, true);

      // Verify target user token is now invalidated
      const postCheck = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${userToken}` }
      });
      assert.strictEqual(postCheck.statusCode, 401);
      assert.strictEqual(
        postCheck.body?.error,
        'Token has been revoked or invalidated. Please log in again.'
      );
    });

    await test('Tampered token_version (e.g. version 999) fails closed with 401', async () => {
      const user = await createTestUser({
        name: 'Tampered Version User',
        password: hashedPassword,
        status: 'active'
      });

      const forgedVersionToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 999 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${forgedVersionToken}` }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(
        res.body?.error,
        'Token has been revoked or invalidated. Please log in again.'
      );
    });

    await test('Numeric string token_version claims (e.g. "1") are strictly rejected without coercion', async () => {
      const user = await createTestUser({
        name: 'Numeric String Token Version User',
        password: hashedPassword,
        status: 'active',
        tokenVersion: 1
      });

      // Craft tokens with numeric string version claims
      for (const stringVer of ['1', '01', ' 1 ', '2', 'true']) {
        const stringToken = jwt.sign(
          { id: user.id, role: user.role, email: user.email, name: user.name, token_version: stringVer },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const res = await makeRequest({
          method: 'GET',
          path: '/api/auth/me',
          headers: { Authorization: `Bearer ${stringToken}` }
        });
        assert.strictEqual(
          res.statusCode,
          401,
          `Expected 401 for string-coerced token_version: ${JSON.stringify(stringVer)}`
        );
        assert.strictEqual(
          res.body?.error,
          'Token has been revoked or invalidated. Please log in again.'
        );
      }
    });

    await test('Invalid/non-integer token_version claims (float, negative, zero, objects, null) fail closed with 401', async () => {
      const user = await createTestUser({
        name: 'Non-integer Version User',
        password: hashedPassword,
        status: 'active',
        tokenVersion: 1
      });

      for (const badVersion of [1.5, 1.0001, -1, 0, null, true, false, {}, [1]]) {
        const badToken = jwt.sign(
          { id: user.id, role: user.role, email: user.email, name: user.name, token_version: badVersion },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const res = await makeRequest({
          method: 'GET',
          path: '/api/auth/me',
          headers: { Authorization: `Bearer ${badToken}` }
        });
        assert.strictEqual(
          res.statusCode,
          401,
          `Expected 401 for bad token_version: ${JSON.stringify(badVersion)}`
        );
      }
    });

    await test('Corrupted or NULL token_version in database strictly fails closed (401 on API, 500 on login) and cannot restore old tokens', async () => {
      const user = await createTestUser({
        name: 'Corrupted DB Version User',
        password: hashedPassword,
        status: 'active'
      });

      const oldToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verify token initially works when DB version is 1
      const preCheck = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${oldToken}` }
      });
      assert.strictEqual(preCheck.statusCode, 200);

      // Corrupt DB token_version to NULL (simulates unmigrated or corrupted DB row)
      await db.query('UPDATE users SET token_version = NULL WHERE id = ?', [user.id]);

      // Old token MUST fail closed with 401 (must NOT silently default to 1)
      const resNull = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${oldToken}` }
      });
      assert.strictEqual(
        resNull.statusCode,
        401,
        'Expected 401 fail-closed when database token_version is NULL'
      );
      assert.strictEqual(
        resNull.body?.error,
        'Token has been revoked or invalidated. Please log in again.'
      );

      // Login attempt while DB token_version is NULL must fail closed (no automatic repair)
      const loginNullRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'CorrectPassword123!' }
      });
      assert.strictEqual(loginNullRes.statusCode, 500);
      assert.ok(loginNullRes.body?.error?.includes('Account session configuration is invalid'));

      // Confirm database was NOT automatically mutated
      const [checkDb] = await db.query('SELECT token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(checkDb[0].token_version, null, 'Login must not automatically repair token_version in DB');

      // Old token still fails closed with 401 (proves old token was NOT reactivated)
      const resStillRevoked = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${oldToken}` }
      });
      assert.strictEqual(resStillRevoked.statusCode, 401);

      // Password reset attempt while DB token_version is NULL must also fail closed without mutating DB
      const adminUser = await createTestUser({
        name: 'Admin For Null Version Test',
        role: 'ERP Admin',
        password: hashedPassword,
        status: 'active',
        tokenVersion: 1
      });
      const adminToken = jwt.sign(
        { id: adminUser.id, role: 'ERP Admin', email: adminUser.email, name: adminUser.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const resetNullRes = await makeRequest({
        method: 'POST',
        path: `/api/users/${user.id}/reset-password`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { newPassword: 'BrandNewPassword123!' }
      });
      assert.strictEqual(resetNullRes.statusCode, 500);
      assert.ok(resetNullRes.body?.error?.includes('Account session configuration is invalid'));
      const [resetDbCheck] = await db.query('SELECT token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(resetDbCheck[0].token_version, null, 'Reset password must not use COALESCE to synthesize version');

      // Simulate explicit, controlled migration setting token_version to 1
      await db.query('UPDATE users SET token_version = 1 WHERE id = ?', [user.id]);

      // Valid migrated user logs in normally
      const loginMigratedRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'CorrectPassword123!' }
      });
      assert.strictEqual(loginMigratedRes.statusCode, 200);
      assert.strictEqual(loginMigratedRes.body?.token ? true : false, true);

      // New token succeeds on protected endpoint
      const newMeRes = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${loginMigratedRes.body.token}` }
      });
      assert.strictEqual(newMeRes.statusCode, 200);
      assert.strictEqual(newMeRes.body?.email, user.email);
    });

    await test('Legacy unversioned token without token_version claim succeeds when token_version is 1 (backward compatibility)', async () => {
      const user = await createTestUser({
        name: 'Legacy Unversioned User',
        password: hashedPassword,
        status: 'active',
        tokenVersion: 1
      });

      const legacyToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${legacyToken}` }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.email, user.email);
    });

    await test('Legacy unversioned token is rejected after password change (cannot bypass invalidation)', async () => {
      const user = await createTestUser({
        name: 'Legacy User After Password Change',
        password: hashedPassword,
        status: 'active',
        tokenVersion: 1
      });

      const legacyToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Change password manually in DB to simulate version increment
      await db.query('UPDATE users SET token_version = 2 WHERE id = ?', [user.id]);

      const res = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${legacyToken}` }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(
        res.body?.error,
        'Token has been revoked or invalidated. Please log in again.'
      );
    });

    await test('Deactivated user is rejected even with valid matching token_version', async () => {
      const user = await createTestUser({
        name: 'Deactivated With Valid Version User',
        password: hashedPassword,
        status: 'active',
        tokenVersion: 1
      });

      const validToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Now deactivate user
      await db.query('UPDATE users SET status = "suspended" WHERE id = ?', [user.id]);

      const res = await makeRequest({
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body?.error?.includes('inactive or suspended'));
    });

    await test('Audit logs do not disclose passwords or sensitive credentials during login or password reset', async () => {
      const [auditRows] = await db.query(
        'SELECT details FROM audit_logs WHERE details LIKE ? OR details LIKE ?',
        ['%CorrectPassword123!%', '%BrandNewSecurePassword456!%']
      );
      assert.strictEqual(
        auditRows.length,
        0,
        'FATAL CREDENTIAL LEAK: Plaintext passwords found in audit_logs details column'
      );
    });

    console.log('\n====================================================================');
    console.log(`TEST SUMMARY: ${passed} / ${total} tests passed successfully.`);
    console.log('====================================================================\n');

    if (passed !== total) {
      process.exitCode = 1;
    }
  } finally {
    // Clean up ephemeral test artifacts
    server.close();

    if (createdUserIds.size > 0) {
      const ids = Array.from(createdUserIds);
      const placeholders = ids.map(() => '?').join(',');
      await db.query(`DELETE FROM audit_logs WHERE user_id IN (${placeholders})`, ids);
      await db.query(`DELETE FROM users WHERE id IN (${placeholders})`, ids);
      console.log(`[Safety Cleanup] Cleaned up ${ids.length} test user record(s) and audit logs.`);
    }

    if (createdUserEmails.size > 0) {
      const emails = Array.from(createdUserEmails);
      const placeholders = emails.map(() => '?').join(',');
      await db.query(`DELETE FROM audit_logs WHERE user_name IN (${placeholders})`, emails);
    }

    await db.end();
  }
}

runPhaseC2SecurityTestSuite().catch((err) => {
  console.error('Test runner caught unhandled error:', err);
  process.exit(1);
});
