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
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/securityRemediationD2.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const express = require('express');
const { db } = require('../config/db');
const { initSchema } = require('../initDb');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const auditLogger = require('../utils/auditLogger');
const apiRoutes = require('../routes');

async function runSecurityRemediationD2Suite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PHASE D2.2 SECURITY REMEDIATION SUITE');
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

  // Mount test Express HTTP server
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(optionalUserExtractor);
  app.use('/api', apiRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const serverPort = server.address().port;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${serverPort}`);
  console.log('====================================================================');

  const createdUserIds = [];

  const makeRequest = ({ method = 'GET', path, token, body, headers = {} }) => {
    return new Promise((resolve, reject) => {
      const postData = body ? JSON.stringify(body) : '';
      const reqHeaders = { ...headers };
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
      if (body) {
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path,
          method,
          headers: reqHeaders
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            let parsedBody = null;
            try {
              parsedBody = rawData ? JSON.parse(rawData) : null;
            } catch (_) {
              parsedBody = rawData;
            }
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsedBody });
          });
        }
      );
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  };

  const createTestUser = async ({
    name = 'Test User',
    role = 'Staff',
    department = 'General',
    password = 'Password123!',
    status = 'active',
    tokenVersion = 1
  } = {}) => {
    const uniqueEmail = `test_sec_${Date.now()}_${Math.floor(Math.random() * 100000)}@yaf.test`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status, token_version)
       VALUES (?, ?, ?, 'TU', ?, ?, ?, ?)`,
      [name, role, department, uniqueEmail, hashedPassword, status, tokenVersion]
    );
    const userId = result.insertId;
    createdUserIds.push(userId);
    return { id: userId, name, role, email: uniqueEmail, status, token_version: tokenVersion, password };
  };

  let passedTests = 0;
  let totalTests = 0;

  const test = async (name, fn) => {
    totalTests++;
    try {
      await fn();
      console.log(`  PASS: [${String(totalTests).padStart(2, '0')}] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  FAIL: [${String(totalTests).padStart(2, '0')}] ${name}`);
      console.error(`        Error: ${err.message}`);
      throw err;
    }
  };

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: ADMIN USER SETUP & CONTROLS
    // ------------------------------------------------------------------------
    console.log('\n--- PART 1: SEC-02 SESSION REVOCATION ON STATUS TRANSITIONS ---');

    const admin = await createTestUser({ name: 'Admin Officer', role: 'ERP Admin' });
    const adminToken = jwt.sign(
      { id: admin.id, role: admin.role, email: admin.email, name: admin.name, token_version: 1 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await test('Old token rejected after account suspension (PATCH /api/users/:id/status)', async () => {
      const user = await createTestUser({ name: 'Target Staff 1', role: 'Staff' });
      const userToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verify token is initially valid
      const initialRes = await makeRequest({ path: '/api/auth/me', token: userToken });
      assert.strictEqual(initialRes.statusCode, 200);

      // Admin suspends user
      const suspendRes = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });
      assert.strictEqual(suspendRes.statusCode, 200);
      assert.strictEqual(suspendRes.body.success, true);

      // Verify token_version in database was incremented from 1 to 2
      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].status, 'suspended');
      assert.strictEqual(dbRows[0].token_version, 2, 'token_version must increment upon suspension');

      // Old token must now be rejected with 403 (suspended)
      const afterSuspendRes = await makeRequest({ path: '/api/auth/me', token: userToken });
      assert.strictEqual(afterSuspendRes.statusCode, 403);
      assert.ok(afterSuspendRes.body?.error?.includes('inactive or suspended'));
    });

    await test('Old token remains permanently rejected after account reactivation', async () => {
      const user = await createTestUser({ name: 'Target Staff 2', role: 'Staff' });
      const preSuspensionToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // 1. Suspend account (token_version becomes 2)
      await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });

      // 2. Reactivate account (token_version becomes 3)
      const reactivateRes = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'active' }
      });
      assert.strictEqual(reactivateRes.statusCode, 200);

      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].status, 'active');
      assert.strictEqual(dbRows[0].token_version, 3, 'token_version must increment upon reactivation to prevent token revival');

      // 3. User attempts to use pre-suspension token (token_version: 1) on reactivated account
      const reuseRes = await makeRequest({ path: '/api/auth/me', token: preSuspensionToken });
      assert.strictEqual(reuseRes.statusCode, 401, 'Pre-suspension token must be rejected with 401 after reactivation');
      assert.ok(reuseRes.body?.error?.includes('Token has been revoked or invalidated'));
    });

    await test('Fresh login after reactivation issues token with new token_version and succeeds', async () => {
      const user = await createTestUser({ name: 'Target Staff 3', role: 'Staff', password: 'ValidPassword123!' });

      // Suspend then reactivate
      await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });
      await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'active' }
      });

      // Fresh login with real credentials
      const loginRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: user.email, password: 'ValidPassword123!' }
      });
      assert.strictEqual(loginRes.statusCode, 200);
      assert.ok(loginRes.body.token);

      const decoded = jwt.decode(loginRes.body.token);
      assert.strictEqual(decoded.token_version, 3, 'Newly issued token must reflect current token_version 3');

      // New token succeeds on protected route
      const verifyRes = await makeRequest({ path: '/api/auth/me', token: loginRes.body.token });
      assert.strictEqual(verifyRes.statusCode, 200);
      assert.strictEqual(verifyRes.body.id, user.id);
    });

    await test('Status update to "inactive" invalidates existing sessions', async () => {
      const user = await createTestUser({ name: 'Target Staff 4', role: 'Staff' });
      const userToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const deactRes = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'inactive' }
      });
      assert.strictEqual(deactRes.statusCode, 200);

      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].status, 'inactive');
      assert.strictEqual(dbRows[0].token_version, 2);

      const testRes = await makeRequest({ path: '/api/auth/me', token: userToken });
      assert.strictEqual(testRes.statusCode, 403);
    });

    await test('Identical status update is idempotent and does NOT increment token_version', async () => {
      const user = await createTestUser({ name: 'Target Staff 5', role: 'Staff', status: 'active' });
      const userToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Re-apply same status 'active'
      const sameRes = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'active' }
      });
      assert.strictEqual(sameRes.statusCode, 200);
      assert.ok(sameRes.body?.message?.includes('already active'));

      const [dbRows] = await db.query('SELECT token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].token_version, 1, 'token_version must NOT increment when status is identical');

      // Existing token remains valid
      const tokenRes = await makeRequest({ path: '/api/auth/me', token: userToken });
      assert.strictEqual(tokenRes.statusCode, 200);
    });

    await test('Invalid status value is rejected with 400 without modifying token_version', async () => {
      const user = await createTestUser({ name: 'Target Staff 6', role: 'Staff' });
      const badStatuses = ['deleted', 'banned', '', null, 123, true];

      for (const badStatus of badStatuses) {
        const res = await makeRequest({
          method: 'PATCH',
          path: `/api/users/${user.id}/status`,
          token: adminToken,
          body: { status: badStatus }
        });
        assert.strictEqual(res.statusCode, 400, `Expected 400 for bad status: ${badStatus}`);
      }

      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].status, 'active');
      assert.strictEqual(dbRows[0].token_version, 1);
    });

    await test('Status update on nonexistent user ID returns 404', async () => {
      const res = await makeRequest({
        method: 'PATCH',
        path: `/api/users/999999/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error, 'User not found');
    });

    await test('Corrupted or NULL token_version in database fails closed with 500', async () => {
      const user = await createTestUser({ name: 'Corrupted Token Version User', role: 'Staff' });
      await db.query('UPDATE users SET token_version = NULL WHERE id = ?', [user.id]);

      const res = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });
      assert.strictEqual(res.statusCode, 500);
      assert.ok(res.body?.error?.includes('Account session configuration is invalid'));

      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].status, 'active', 'Status must not mutate on invalid token_version');
      assert.strictEqual(dbRows[0].token_version, null);
    });

    await test('Status change via PUT /api/users/:id also atomically increments token_version', async () => {
      const user = await createTestUser({ name: 'Target Staff 7', role: 'Staff', status: 'active' });
      const userToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const putRes = await makeRequest({
        method: 'PUT',
        path: `/api/users/${user.id}`,
        token: adminToken,
        body: { name: 'Target Staff 7 Updated', status: 'suspended' }
      });
      assert.strictEqual(putRes.statusCode, 200);

      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].status, 'suspended');
      assert.strictEqual(dbRows[0].token_version, 2, 'PUT /api/users/:id must increment token_version when status changes');

      // Token now rejected
      const testRes = await makeRequest({ path: '/api/auth/me', token: userToken });
      assert.strictEqual(testRes.statusCode, 403);
    });

    await test('PUT /api/users/:id with identical status does NOT increment token_version', async () => {
      const user = await createTestUser({ name: 'Target Staff 8', role: 'Staff', status: 'active' });
      const userToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const putRes = await makeRequest({
        method: 'PUT',
        path: `/api/users/${user.id}`,
        token: adminToken,
        body: { name: 'Target Staff 8 Name Only', status: 'active' }
      });
      assert.strictEqual(putRes.statusCode, 200);

      const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbRows[0].token_version, 1);

      // Token still succeeds
      const testRes = await makeRequest({ path: '/api/auth/me', token: userToken });
      assert.strictEqual(testRes.statusCode, 200);
    });

    await test('Concurrent status updates do not create session revival gaps', async () => {
      const user = await createTestUser({ name: 'Target Staff Concurrency', role: 'Staff' });
      const preToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Execute 3 updates concurrently
      await Promise.all([
        makeRequest({ method: 'PATCH', path: `/api/users/${user.id}/status`, token: adminToken, body: { status: 'suspended' } }),
        makeRequest({ method: 'PATCH', path: `/api/users/${user.id}/status`, token: adminToken, body: { status: 'active' } }),
        makeRequest({ method: 'PATCH', path: `/api/users/${user.id}/status`, token: adminToken, body: { status: 'suspended' } })
      ]);

      const [dbRows] = await db.query('SELECT token_version FROM users WHERE id = ?', [user.id]);
      assert.ok(dbRows[0].token_version > 1, 'token_version must have incremented beyond initial version');

      // Pre-token must remain dead
      const testRes = await makeRequest({ path: '/api/auth/me', token: preToken });
      assert.ok(testRes.statusCode === 401 || testRes.statusCode === 403, 'Pre-token must be rejected');
    });

    await test('Status update on one user does NOT affect another active user session', async () => {
      const userA = await createTestUser({ name: 'User A', role: 'Staff' });
      const userB = await createTestUser({ name: 'User B', role: 'Staff' });

      const tokenB = jwt.sign(
        { id: userB.id, role: userB.role, email: userB.email, name: userB.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Suspend User A
      await makeRequest({
        method: 'PATCH',
        path: `/api/users/${userA.id}/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });

      // User B session must remain 100% active and untouched
      const [dbB] = await db.query('SELECT token_version FROM users WHERE id = ?', [userB.id]);
      assert.strictEqual(dbB[0].token_version, 1);

      const resB = await makeRequest({ path: '/api/auth/me', token: tokenB });
      assert.strictEqual(resB.statusCode, 200);
      assert.strictEqual(resB.body.id, userB.id);
    });

    // ------------------------------------------------------------------------
    // SECTION 2: SEC-01 FRONTEND ROLE SWITCHER ISOLATION AUDIT
    // ------------------------------------------------------------------------
    console.log('\n--- PART 2: SEC-01 ROLE SWITCHER ISOLATION LOGIC AUDIT ---');

    await test('App.jsx condition prevents RoleSwitcherModal render unless DEV and VITE_ENABLE_DEV_ROLE_SWITCHER === "true"', async () => {
      const fs = require('node:fs');
      const appContent = fs.readFileSync('frontend/src/App.jsx', 'utf8');

      // Verify presence of strict dev flag condition
      assert.ok(
        appContent.includes("import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_ROLE_SWITCHER === 'true'"),
        'App.jsx must evaluate import.meta.env.DEV and VITE_ENABLE_DEV_ROLE_SWITCHER'
      );
      assert.ok(
        appContent.includes('{isDevRoleSwitcherEnabled && ('),
        'RoleSwitcherModal must be wrapped in isDevRoleSwitcherEnabled guard'
      );
    });

    await test('RoleSwitcherModal.jsx fails closed if DEV is false or flag is omitted', async () => {
      const fs = require('node:fs');
      const modalContent = fs.readFileSync('frontend/src/components/RoleSwitcherModal.jsx', 'utf8');

      assert.ok(
        modalContent.includes('if (!isOpen || !isDevRoleSwitcherEnabled) return null;'),
        'RoleSwitcherModal must return null if not open or dev role switcher is not enabled'
      );
      assert.ok(
        modalContent.includes('DEVELOPMENT UI PREVIEW ONLY:'),
        'RoleSwitcherModal must contain explicit disclaimer banner'
      );
    });

    // ------------------------------------------------------------------------
    // SECTION 3: ARCH-01 TRANSACTIONAL AUDIT LOGGING & ROLLBACK SUITE
    // ------------------------------------------------------------------------
    console.log('\n--- PART 3: ARCH-01 TRANSACTIONAL AUDIT LOGGING & ROLLBACK SUITE ---');

    await test('Successful transactional status update commits both user mutation and audit record atomically', async () => {
      const user = await createTestUser({ name: 'Tx Happy Status User', role: 'Staff' });

      const res = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'suspended' }
      });
      assert.strictEqual(res.statusCode, 200);

      // Verify user updated in database
      const [dbUser] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbUser[0].status, 'suspended');
      assert.strictEqual(dbUser[0].token_version, 2);

      // Verify audit log committed on transaction
      const [dbAudit] = await db.query(
        'SELECT action, entity_id, user_id, status FROM audit_logs WHERE entity_type = "USER" AND entity_id = ?',
        [String(user.id)]
      );
      assert.strictEqual(dbAudit.length, 1);
      assert.strictEqual(dbAudit[0].action, 'SUSPEND_USER');
      assert.strictEqual(dbAudit[0].user_id, admin.id);
      assert.strictEqual(dbAudit[0].status, 'WARNING');
    });

    await test('Audit insert failure rolls back status change and token-version increment', async () => {
      const user = await createTestUser({ name: 'Rollback Status User', role: 'Staff' });
      const preToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const originalLogAudit = auditLogger.logAudit;
      // Deterministically intercept logAudit to simulate DB write failure inside transaction
      auditLogger.logAudit = async (opts) => {
        if (Number(opts.entityId) === user.id) {
          throw new Error('Simulated database audit log insertion failure');
        }
        return originalLogAudit(opts);
      };

      try {
        const res = await makeRequest({
          method: 'PATCH',
          path: `/api/users/${user.id}/status`,
          token: adminToken,
          body: { status: 'suspended' }
        });

        assert.strictEqual(res.statusCode, 500, 'Must return 500 when audit log write fails inside transaction');
        assert.ok(
          res.body?.error?.includes('audit') || res.body?.error?.includes('Failed to update'),
          'Error message must indicate audit or update failure'
        );

        // Verify status and token_version were rolled back
        const [dbRows] = await db.query('SELECT status, token_version FROM users WHERE id = ?', [user.id]);
        assert.strictEqual(dbRows[0].status, 'active', 'User status must remain active after transaction rollback');
        assert.strictEqual(dbRows[0].token_version, 1, 'token_version must NOT increment after transaction rollback');

        // Verify pre-existing token is STILL VALID (proves no partial state was committed)
        const tokenRes = await makeRequest({ path: '/api/auth/me', token: preToken });
        assert.strictEqual(tokenRes.statusCode, 200, 'Pre-token must remain valid because transaction rolled back cleanly');

        // Verify zero audit logs exist for this user transition
        const [auditRows] = await db.query(
          'SELECT * FROM audit_logs WHERE entity_type = "USER" AND entity_id = ?',
          [String(user.id)]
        );
        assert.strictEqual(auditRows.length, 0, 'No audit record must be committed on failure');
      } finally {
        auditLogger.logAudit = originalLogAudit;
      }
    });

    await test('Successful transactional profile update commits both profile mutation and audit record atomically', async () => {
      const user = await createTestUser({ name: 'Tx Profile User', role: 'Staff', department: 'General' });

      const res = await makeRequest({
        method: 'PUT',
        path: `/api/users/${user.id}`,
        token: adminToken,
        body: { name: 'Tx Profile User Updated', department: 'Procurement', status: 'suspended' }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.name, 'Tx Profile User Updated');

      const [dbUser] = await db.query('SELECT name, department, status, token_version FROM users WHERE id = ?', [user.id]);
      assert.strictEqual(dbUser[0].name, 'Tx Profile User Updated');
      assert.strictEqual(dbUser[0].department, 'Procurement');
      assert.strictEqual(dbUser[0].status, 'suspended');
      assert.strictEqual(dbUser[0].token_version, 2);

      const [dbAudit] = await db.query(
        'SELECT action, entity_id, user_id, details FROM audit_logs WHERE entity_type = "USER" AND entity_id = ?',
        [String(user.id)]
      );
      assert.strictEqual(dbAudit.length, 1);
      assert.strictEqual(dbAudit[0].action, 'UPDATE_USER');
      assert.strictEqual(dbAudit[0].user_id, admin.id);
      assert.ok(dbAudit[0].details.includes('status changed to "suspended"'));
    });

    await test('Audit insert failure rolls back profile update and token-version change', async () => {
      const user = await createTestUser({ name: 'Rollback Profile User', role: 'Staff', department: 'General' });
      const preToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name, token_version: 1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const originalLogAudit = auditLogger.logAudit;
      auditLogger.logAudit = async (opts) => {
        if (Number(opts.entityId) === user.id) {
          throw new Error('Simulated database audit log insertion failure during profile update');
        }
        return originalLogAudit(opts);
      };

      try {
        const res = await makeRequest({
          method: 'PUT',
          path: `/api/users/${user.id}`,
          token: adminToken,
          body: { name: 'Attempted Renamed User', department: 'Operations', status: 'suspended' }
        });

        assert.strictEqual(res.statusCode, 500, 'Must return 500 on audit failure during profile update');

        // Verify profile and status changes were rolled back
        const [dbRows] = await db.query('SELECT name, department, status, token_version FROM users WHERE id = ?', [user.id]);
        assert.strictEqual(dbRows[0].name, 'Rollback Profile User', 'Name must not change on rollback');
        assert.strictEqual(dbRows[0].department, 'General', 'Department must not change on rollback');
        assert.strictEqual(dbRows[0].status, 'active', 'Status must not change on rollback');
        assert.strictEqual(dbRows[0].token_version, 1, 'token_version must not increment on rollback');

        // Pre-token remains valid
        const tokenRes = await makeRequest({ path: '/api/auth/me', token: preToken });
        assert.strictEqual(tokenRes.statusCode, 200);

        const [auditRows] = await db.query(
          'SELECT * FROM audit_logs WHERE entity_type = "USER" AND entity_id = ?',
          [String(user.id)]
        );
        assert.strictEqual(auditRows.length, 0);
      } finally {
        auditLogger.logAudit = originalLogAudit;
      }
    });

    await test('Validation failure on status update does NOT write audit record', async () => {
      const user = await createTestUser({ name: 'Validation Fail User', role: 'Staff' });

      const res = await makeRequest({
        method: 'PATCH',
        path: `/api/users/${user.id}/status`,
        token: adminToken,
        body: { status: 'invalid_status_value' }
      });
      assert.strictEqual(res.statusCode, 400);

      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_type = "USER" AND entity_id = ?',
        [String(user.id)]
      );
      assert.strictEqual(auditRows.length, 0, 'No audit record must be written on 400 validation failure');
    });

    await test('Non-transactional callers of logAudit without connection remain unaffected', async () => {
      // Call logAudit directly without connection (standard behavior)
      const auditId = await auditLogger.logAudit({
        userId: admin.id,
        userName: admin.name,
        role: admin.role,
        action: 'TEST_NON_TRANSACTIONAL',
        entityType: 'TEST',
        details: 'Verify backward compatibility for callers without connection'
      });
      assert.ok(auditId, 'logAudit without connection must return insertId');

      // Verify record was inserted
      const [rows] = await db.query('SELECT * FROM audit_logs WHERE id = ?', [auditId]);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].action, 'TEST_NON_TRANSACTIONAL');

      // Cleanup this specific test audit record
      await db.query('DELETE FROM audit_logs WHERE id = ?', [auditId]);
    });

    console.log('====================================================================');
    console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed successfully.`);
    console.log('====================================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (createdUserIds.length > 0) {
      const strIds = createdUserIds.map(String);
      await db.query('DELETE FROM audit_logs WHERE user_id IN (?) OR (entity_type = "USER" AND entity_id IN (?))', [createdUserIds, strIds]);
      await db.query('DELETE FROM users WHERE id IN (?)', [createdUserIds]);
      console.log(`[Safety Cleanup] Cleaned up ${createdUserIds.length} test user record(s) and audit logs.`);
    }
  }
}

if (require.main === module) {
  runSecurityRemediationD2Suite().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runSecurityRemediationD2Suite };
