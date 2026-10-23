const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

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
  console.error(`Tests are blocked from running against development or production databases.`);
  console.error(`To run tests safely, provide an isolated test database:`);
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/productionReadinessPhaseA.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const { db } = require('../config/db');
const { JWT_SECRET, optionalUserExtractor, resolveJwtSecret } = require('../middlewares/auth');
const { shouldSeedDemoData, initSchema } = require('../initDb');
const apiRoutes = require('../routes');

async function runProductionReadinessTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PRODUCTION-READINESS PHASE A REGRESSION SUITE');
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

  // Mount API router under /api
  const app = express();
  app.use(express.json());
  app.use(optionalUserExtractor);
  app.use('/api', apiRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const ephemeralPort = server.address().port;
  const BASE_URL = `http://localhost:${ephemeralPort}/api`;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${ephemeralPort}`);
  console.log('====================================================================\n');

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

  async function createTestUser({ name, role, email, status = 'active', department = 'Testing' }) {
    const uniqueEmail = email || `test_phasea_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@yaf-test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status)
       VALUES (?, ?, ?, 'TU', ?, 'hashed_placeholder', ?)`,
      [name, role, department, uniqueEmail, status]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    createdUserEmails.add(uniqueEmail);
    return { id: userId, name, role, email: uniqueEmail, status };
  }

  function signToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  try {
    // Test actors
    const adminUser = await createTestUser({ name: 'Admin PhaseA', role: 'ERP Admin', department: 'IT' });
    const ceoUser = await createTestUser({ name: 'CEO PhaseA', role: 'Chairman & CEO', department: 'Executive' });
    const financeDir = await createTestUser({ name: 'Finance Dir PhaseA', role: 'Director Finance', department: 'Finance' });
    const gmUser = await createTestUser({ name: 'GM PhaseA', role: 'General Manager', department: 'Executive' });
    const opsDir = await createTestUser({ name: 'Ops Dir PhaseA', role: 'Director Operations', department: 'Operations' });
    const staffUser = await createTestUser({ name: 'Staff PhaseA', role: 'Staff', department: 'General' });
    const gateUser = await createTestUser({ name: 'Gate PhaseA', role: 'Gate Officer', department: 'Security' });
    const salesUser = await createTestUser({ name: 'Sales PhaseA', role: 'Sales Officer', department: 'Sales' });

    const adminToken = signToken(adminUser);
    const ceoToken = signToken(ceoUser);
    const financeToken = signToken(financeDir);
    const gmToken = signToken(gmUser);
    const opsToken = signToken(opsDir);
    const staffToken = signToken(staffUser);
    const gateToken = signToken(gateUser);
    const salesToken = signToken(salesUser);

    // ========================================================================
    // 1. FINDING H-01: AUDIT LOG AUTHORIZATION & ACCESS CONTROL
    // ========================================================================
    await test('Finding H-01: Unauthenticated GET /api/audit-logs is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/audit-logs`);
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.ok(body.error.includes('Access denied. Token missing.'));
    });

    await test('Finding H-01: Unauthenticated GET /api/audit-logs/export is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/audit-logs/export`);
      assert.strictEqual(res.status, 401);
    });

    await test('Finding H-01: Unauthorized role (Staff) is rejected with HTTP 403 on audit log listing', async () => {
      const res = await fetch(`${BASE_URL}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

    await test('Finding H-01: Unauthorized role (Gate Officer) is rejected with HTTP 403 on audit log export', async () => {
      const res = await fetch(`${BASE_URL}/audit-logs/export`, {
        headers: { 'Authorization': `Bearer ${gateToken}` }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

    await test('Finding H-01: Unauthorized role (Sales Officer) is rejected with HTTP 403 on audit log listing', async () => {
      const res = await fetch(`${BASE_URL}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${salesToken}` }
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

    await test('Finding H-01: Authorized role (ERP Admin) successfully accesses audit logs and export', async () => {
      const resLogs = await fetch(`${BASE_URL}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(resLogs.status, 200);
      const bodyLogs = await resLogs.json();
      assert.ok(Array.isArray(bodyLogs.logs));
      assert.ok(bodyLogs.pagination);

      const resExport = await fetch(`${BASE_URL}/audit-logs/export`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(resExport.status, 200);
      const bodyExport = await resExport.json();
      assert.ok(Array.isArray(bodyExport));
    });

    await test('Finding H-01: Authorized executive roles (Chairman & CEO, GM, Directors) can access audit logs', async () => {
      for (const [roleName, token] of [
        ['Chairman & CEO', ceoToken],
        ['General Manager', gmToken],
        ['Director Finance', financeToken],
        ['Director Operations', opsToken]
      ]) {
        const res = await fetch(`${BASE_URL}/audit-logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        assert.strictEqual(res.status, 200, `Expected HTTP 200 for authorized role ${roleName}, got ${res.status}`);
      }
    });

    // ========================================================================
    // 2. FINDING H-02: PRODUCTION DEMO-DATA SEEDING SAFEGUARDS
    // ========================================================================
    await test('Finding H-02: shouldSeedDemoData strictly defaults to false when NODE_ENV=production', async () => {
      const shouldSeed = shouldSeedDemoData({ NODE_ENV: 'production' });
      assert.strictEqual(shouldSeed, false, 'Production mode must not seed demo data by default');
    });

    await test('Finding H-02: shouldSeedDemoData allows explicit opt-in in production when SEED_DEMO_DATA=true', async () => {
      const shouldSeed = shouldSeedDemoData({ NODE_ENV: 'production', SEED_DEMO_DATA: 'true' });
      assert.strictEqual(shouldSeed, true, 'Explicit opt-in must be honored in production');
    });

    await test('Finding H-02: shouldSeedDemoData defaults to true in development mode for seamless local setup', async () => {
      const shouldSeed = shouldSeedDemoData({ NODE_ENV: 'development' });
      assert.strictEqual(shouldSeed, true, 'Development mode should allow seeding by default');
    });

    await test('Finding H-02: shouldSeedDemoData allows opt-out in development when SEED_DEMO_DATA=false', async () => {
      const shouldSeed = shouldSeedDemoData({ NODE_ENV: 'development', SEED_DEMO_DATA: 'false' });
      assert.strictEqual(shouldSeed, false, 'Explicit opt-out in development must disable seeding');
    });

    await test('Finding H-02: initSchema executes cleanly and idempotently on isolated database', async () => {
      // Must not throw and must verify all tables exist
      await initSchema(db);
      const [tables] = await db.query('SHOW TABLES');
      assert.ok(tables.length >= 13, `Expected at least 13 tables, found ${tables.length}`);
    });

    // ========================================================================
    // 3. FINDING M-01: JWT SECRET CONFIGURATION & PRODUCTION VALIDATION
    // ========================================================================
    await test('Finding M-01: resolveJwtSecret fails fast when NODE_ENV=production and JWT_SECRET is unset', async () => {
      assert.throws(
        () => resolveJwtSecret({ NODE_ENV: 'production' }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('JWT_SECRET environment variable is mandatory in production mode'));
          return true;
        }
      );
    });

    await test('Finding M-01: resolveJwtSecret fails fast when NODE_ENV=production and JWT_SECRET is empty string', async () => {
      assert.throws(
        () => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '' }),
        (err) => {
          assert.ok(err.message.includes('JWT_SECRET environment variable is mandatory in production mode'));
          return true;
        }
      );
    });

    await test('Finding M-01: resolveJwtSecret fails fast when NODE_ENV=production and JWT_SECRET is whitespace only', async () => {
      assert.throws(
        () => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '   \t  ' }),
        (err) => {
          assert.ok(err.message.includes('JWT_SECRET environment variable is mandatory in production mode'));
          return true;
        }
      );
    });

    await test('Finding M-01: resolveJwtSecret returns valid trimmed secret in production mode', async () => {
      const validSecret = 'super_secure_production_secret_key_994';
      const resolved = resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: `  ${validSecret}  ` });
      assert.strictEqual(resolved, validSecret);
    });

    await test('Finding M-01: resolveJwtSecret does not expose or leak secret values in error messages', async () => {
      try {
        resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '' });
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(!err.message.includes('password'));
        assert.ok(!err.message.includes('secret_key'));
        assert.ok(!err.message.includes('yaf_erp_secure'));
      }
    });

    await test('Finding M-01: resolveJwtSecret falls back safely in non-production when secret unset', async () => {
      const devResolved = resolveJwtSecret({ NODE_ENV: 'development' });
      assert.strictEqual(devResolved, 'yaf_erp_secure_jwt_secret_key_2026_mardan');
    });

  } finally {
    // Safe cleanup
    console.log('\n[Safe Cleanup] Executing targeted cleanup of run-created records...');
    if (createdUserEmails.size > 0) {
      const emailList = Array.from(createdUserEmails);
      await db.query('DELETE FROM users WHERE email IN (?)', [emailList]);
      console.log(`[Safe Cleanup] Removed ${emailList.length} temporary test user(s).`);
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

runProductionReadinessTestSuite().catch((err) => {
  console.error('Fatal unhandled error during test suite execution:', err);
  process.exit(1);
});
