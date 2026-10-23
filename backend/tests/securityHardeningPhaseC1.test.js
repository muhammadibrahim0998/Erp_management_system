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
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/securityHardeningPhaseC1.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const { db } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');
const {
  app,
  resolveAllowedOrigins,
  validateOrigin,
  securityHeadersMiddleware
} = require('../server');

async function runPhaseC1SecurityTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PHASE C1 SECURITY HARDENING TEST SUITE');
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

  // Start ephemeral server using the fully configured app from server.js
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const ephemeralPort = server.address().port;
  const BASE_URL = `http://127.0.0.1:${ephemeralPort}`;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${ephemeralPort}`);
  console.log('====================================================================\n');

  const RUN_SIGNATURE = 'C1_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
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

  async function createTestUser({ name, role, email, password, status = 'active', department = 'IT' }) {
    const uniqueEmail = email || `c1_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@yaf-c1-test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status)
       VALUES (?, ?, ?, 'TU', ?, ?, ?)`,
      [name, role, department, uniqueEmail, password, status]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    createdUserEmails.add(uniqueEmail);
    return { id: userId, name, role, email: uniqueEmail, password, status };
  }

  function signToken(user, overrideClaims = {}) {
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        ...overrideClaims
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: ORIGIN VALIDATION & CORS UNIT TESTS
    // ------------------------------------------------------------------------
    await test('validateOrigin accepts valid HTTP and HTTPS origins without paths', () => {
      assert.strictEqual(validateOrigin('http://localhost:5173'), 'http://localhost:5173');
      assert.strictEqual(validateOrigin('https://erp.yousafzai.com'), 'https://erp.yousafzai.com');
      assert.strictEqual(validateOrigin('http://127.0.0.1:7001'), 'http://127.0.0.1:7001');
      assert.strictEqual(validateOrigin('https://sub.domain.example.com:8443'), 'https://sub.domain.example.com:8443');
    });

    await test('validateOrigin normalizes trailing slash cleanly', () => {
      assert.strictEqual(validateOrigin('https://erp.yousafzai.com/'), 'https://erp.yousafzai.com');
    });

    await test('validateOrigin rejects wildcard origins', () => {
      assert.throws(() => validateOrigin('*'), /Wildcard origins/);
      assert.throws(() => validateOrigin('https://*.example.com'), /Wildcard origins/);
    });

    await test('validateOrigin rejects disallowed protocols', () => {
      assert.throws(() => validateOrigin('ftp://example.com'), /only http and https/);
      assert.throws(() => validateOrigin('javascript:alert(1)'), /only http and https/);
    });

    await test('validateOrigin rejects origins with credentials', () => {
      assert.throws(() => validateOrigin('http://user:pass@example.com'), /credentials/);
    });

    await test('validateOrigin rejects origins with url path components', () => {
      assert.throws(() => validateOrigin('https://example.com/api'), /path component/);
      assert.throws(() => validateOrigin('https://example.com/login/'), /path component/);
    });

    await test('validateOrigin rejects queries and hashes', () => {
      assert.throws(() => validateOrigin('https://example.com?query=1'), /query parameters/);
      assert.throws(() => validateOrigin('https://example.com#fragment'), /query parameters or hashes/);
    });

    await test('resolveAllowedOrigins requires ALLOWED_ORIGINS in production', () => {
      assert.throws(
        () => resolveAllowedOrigins({ NODE_ENV: 'production' }),
        /ALLOWED_ORIGINS environment variable is required/
      );
      assert.throws(
        () => resolveAllowedOrigins({ NODE_ENV: 'production', ALLOWED_ORIGINS: '   ' }),
        /ALLOWED_ORIGINS environment variable is required/
      );
    });

    await test('resolveAllowedOrigins parses production comma-separated origins', () => {
      const origins = resolveAllowedOrigins({
        NODE_ENV: 'production',
        ALLOWED_ORIGINS: 'https://app.yousafzai.com, https://admin.yousafzai.com'
      });
      assert.deepStrictEqual(origins, ['https://app.yousafzai.com', 'https://admin.yousafzai.com']);
    });

    await test('resolveAllowedOrigins defaults to localhost in non-production environments', () => {
      const origins = resolveAllowedOrigins({ NODE_ENV: 'development' });
      assert.ok(origins.includes('http://localhost:5173'));
      assert.ok(origins.includes('http://127.0.0.1:5173'));
      assert.ok(origins.includes('http://localhost:7001'));
      assert.ok(origins.includes('http://127.0.0.1:7001'));
    });

    // ------------------------------------------------------------------------
    // SECTION 2: CORS INTEGRATION & PREFLIGHT BEHAVIOR
    // ------------------------------------------------------------------------
    await test('CORS allows requests from authorized origin with correct headers', async () => {
      const res = await fetch(`${BASE_URL}/`, {
        method: 'GET',
        headers: { Origin: 'http://localhost:5173' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    });

    await test('CORS preflight OPTIONS request from authorized origin succeeds with 204', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization'
        }
      });
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.ok(res.headers.get('access-control-allow-methods').includes('GET'));
    });

    await test('CORS rejects requests from unauthorized origin with HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'GET',
        headers: { Origin: 'http://evil-attacker.com' }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.error, 'CORS origin not allowed');
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
    });

    await test('CORS preflight OPTIONS request from unauthorized origin is rejected with HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://evil-attacker.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.error, 'CORS origin not allowed');
    });

    await test('Requests without Origin header (curl, mobile apps) are allowed', async () => {
      const res = await fetch(`${BASE_URL}/`);
      assert.strictEqual(res.status, 200);
    });

    // ------------------------------------------------------------------------
    // SECTION 3: ENTERPRISE SECURITY HEADERS & SANITIZATION
    // ------------------------------------------------------------------------
    await test('Security headers are present on successful API responses', async () => {
      const res = await fetch(`${BASE_URL}/`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
      assert.strictEqual(res.headers.get('x-xss-protection'), '0');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.strictEqual(res.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'");
      assert.strictEqual(res.headers.get('x-powered-by'), null);
    });

    await test('Security headers are present on 404 responses', async () => {
      const res = await fetch(`${BASE_URL}/api/nonexistent-route-${RUN_SIGNATURE}`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
      assert.strictEqual(res.headers.get('x-xss-protection'), '0');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.strictEqual(res.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'");
      assert.strictEqual(res.headers.get('x-powered-by'), null);
    });

    await test('Status endpoint GET / is sanitized and leaks no database name or port', async () => {
      const res = await fetch(`${BASE_URL}/`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, 'online');
      assert.strictEqual(body.system, 'AgenTech ERP — Yousafzai Agri Foods (Pvt) Ltd');
      assert.ok(body.timestamp, 'Timestamp must be present');
      assert.strictEqual(body.database, undefined, 'Internal database name must not be leaked');
      assert.strictEqual(body.port, undefined, 'Internal port must not be leaked');
    });

    await test('Liveness probe GET /health returns status ok and uptime', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(typeof body.uptime, 'number');
      assert.ok(body.uptime >= 0);
      assert.ok(body.timestamp);
    });

    // ------------------------------------------------------------------------
    // SECTION 4: STRICT BCRYPT VERIFICATION & AUTHENTICATION HARDENING
    // ------------------------------------------------------------------------
    const bcryptPassword = 'StrongBcryptPassword123!';
    const hashedBcrypt = await bcrypt.hash(bcryptPassword, 10);
    const validBcryptUser = await createTestUser({
      name: 'Valid Bcrypt User',
      role: 'Staff',
      password: hashedBcrypt,
      status: 'active'
    });

    await test('Authentication succeeds for user with valid bcrypt hash', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: validBcryptUser.email,
          password: bcryptPassword
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.token, 'Token must be issued');
      assert.strictEqual(body.user.email, validBcryptUser.email);
      assert.strictEqual(body.user.password, undefined, 'Password must never be returned');
    });

    const plaintextUser = await createTestUser({
      name: 'Legacy Plaintext User',
      role: 'Staff',
      password: 'LegacyPlaintextPassword!',
      status: 'active'
    });

    await test('Authentication fails closed (HTTP 401) for legacy plaintext password', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: plaintextUser.email,
          password: 'LegacyPlaintextPassword!'
        })
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.error, 'Invalid email or password');
    });

    const malformedHashUser = await createTestUser({
      name: 'Malformed Hash User',
      role: 'Staff',
      password: '$2b$10$invalidhashstringthatistooshort',
      status: 'active'
    });

    await test('Authentication fails closed (HTTP 401) without crash for malformed bcrypt hash', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: malformedHashUser.email,
          password: 'anyPassword'
        })
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.error, 'Invalid email or password');
    });

    // ------------------------------------------------------------------------
    // SECTION 5: ACCOUNT RECOVERY & ADMIN PASSWORD RESET
    // ------------------------------------------------------------------------
    const adminUser = await createTestUser({
      name: 'C1 Admin',
      role: 'ERP Admin',
      password: await bcrypt.hash('AdminPassword123!', 10),
      status: 'active'
    });
    const adminToken = signToken(adminUser);

    await test('Admin password reset hashes password and permits login for previously plaintext user', async () => {
      const newPassword = 'NewlyResetPassword123!';
      const resReset = await fetch(`${BASE_URL}/api/users/${plaintextUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ newPassword })
      });
      assert.strictEqual(resReset.status, 200);

      // Verify in DB that password was updated to a valid bcrypt hash
      const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [plaintextUser.id]);
      const storedHash = rows[0]?.password;
      assert.ok(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedHash), 'Must be standard bcrypt hash');

      // Verify user can now authenticate successfully with new password
      const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: plaintextUser.email,
          password: newPassword
        })
      });
      assert.strictEqual(resLogin.status, 200);
      const bodyLogin = await resLogin.json();
      assert.ok(bodyLogin.token);
    });

    // ------------------------------------------------------------------------
    // SECTION 6: LIVE DATABASE-BACKED IDENTITY & ACCOUNT STATUS IN authenticateToken
    // ------------------------------------------------------------------------
    const activeStaffUser = await createTestUser({
      name: 'Active Staff User',
      role: 'Staff',
      password: await bcrypt.hash('Password123!', 10),
      status: 'active'
    });
    const activeStaffToken = signToken(activeStaffUser);

    await test('Active user with valid JWT can access protected read endpoint (GET /api/users)', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${activeStaffToken}` }
      });
      assert.strictEqual(res.status, 200);
      const users = await res.json();
      assert.ok(Array.isArray(users));
    });

    const suspendedUser = await createTestUser({
      name: 'Suspended Staff User',
      role: 'Staff',
      password: await bcrypt.hash('Password123!', 10),
      status: 'suspended'
    });
    const suspendedToken = signToken(suspendedUser);

    await test('Suspended user is rejected with HTTP 403 on protected read endpoint despite valid JWT', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${suspendedToken}` }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('User account is inactive or suspended'));
    });

    const inactiveUser = await createTestUser({
      name: 'Inactive Staff User',
      role: 'Staff',
      password: await bcrypt.hash('Password123!', 10),
      status: 'inactive'
    });
    const inactiveToken = signToken(inactiveUser);

    await test('Inactive user is rejected with HTTP 403 on protected read endpoint despite valid JWT', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${inactiveToken}` }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('User account is inactive or suspended'));
    });

    const ephemeralDeletedUser = await createTestUser({
      name: 'Ephemeral Deleted User',
      role: 'Staff',
      password: await bcrypt.hash('Password123!', 10),
      status: 'active'
    });
    const deletedUserToken = signToken(ephemeralDeletedUser);

    // Delete user from DB
    await db.query('DELETE FROM users WHERE id = ?', [ephemeralDeletedUser.id]);
    createdUserIds.delete(ephemeralDeletedUser.id);
    createdUserEmails.delete(ephemeralDeletedUser.email);

    await test('Deleted user is rejected with HTTP 403 on protected read endpoint despite valid JWT', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${deletedUserToken}` }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('User record does not exist'));
    });

    // ------------------------------------------------------------------------
    // SECTION 7: TAMPERED JWT CLAIMS OVERRIDE BY LIVE DATABASE IDENTITY
    // ------------------------------------------------------------------------
    const honestStaffUser = await createTestUser({
      name: 'Honest Staff User',
      role: 'Staff',
      password: await bcrypt.hash('Password123!', 10),
      status: 'active'
    });
    // Attacker crafts a token containing role: 'ERP Admin' for this honest staff user
    const forgedAdminToken = signToken(honestStaffUser, { role: 'ERP Admin' });

    await test('Tampered JWT claim (forged ERP Admin role) fails closed with HTTP 403 due to live DB verification', async () => {
      // Attempting an admin-only endpoint: POST /api/users
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${forgedAdminToken}`
        },
        body: JSON.stringify({
          name: 'Unauthorized Created User',
          email: `forged_${Date.now()}@yaf-c1-test.com`,
          password: 'Password123!',
          role: 'Staff',
          department: 'General'
        })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

  } finally {
    // ========================================================================
    // SAFE CLEANUP: Only remove records tracked in this specific test run
    // ========================================================================
    console.log('\n[Safe Cleanup] Executing targeted cleanup of run-created test records...');

    if (createdUserEmails.size > 0) {
      const emailList = Array.from(createdUserEmails);
      await db.query('DELETE FROM users WHERE email IN (?)', [emailList]);
      console.log(`[Safe Cleanup] Removed ${emailList.length} temporary test user(s).`);
    }

    if (createdUserIds.size > 0) {
      const idList = Array.from(createdUserIds);
      await db.query('DELETE FROM audit_logs WHERE entity_id IN (?) AND entity_type IN ("USER", "AUTH")', [idList]);
      console.log(`[Safe Cleanup] Cleaned audit logs for test user IDs.`);
    }

    await new Promise((resolve) => server.close(resolve));
    console.log('[Safe Cleanup] Ephemeral test server closed cleanly.');
  }

  console.log(`\n====================================================================`);
  console.log(`Final Result: ${passed} / ${total} tests passed.`);
  console.log(`====================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runPhaseC1SecurityTestSuite().catch((err) => {
  console.error('Fatal unhandled error during test suite execution:', err);
  process.exit(1);
});
