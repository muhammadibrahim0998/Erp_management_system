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
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/productionTransitionHardening.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const { db } = require('../config/db');
const { initSchema } = require('../initDb');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const operationsRoutes = require('../routes/operations.routes');
const { PRODUCTION_STAGES } = require('../controllers/operations.controller');

async function runProductionTransitionTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PRODUCTION TRANSITION HARDENING SUITE');
  console.log('====================================================================');
  console.log(`[Safety Guard] Node Environment: ${nodeEnv}`);
  console.log(`[Safety Guard] Database Target:   ${currentDb} (ISOLATED TEST DATABASE)`);

  // Verify connection target
  const [dbNameRows] = await db.query('SELECT DATABASE() as active_db');
  const activeDbName = dbNameRows[0]?.active_db;
  assert.strictEqual(
    activeDbName,
    currentDb,
    `Active database mismatch: Expected ${currentDb}, got ${activeDbName}`
  );
  console.log(`[Safety Guard] Verified Connection: Connected to "${activeDbName}"`);

  // Ensure test database schema is verified
  await initSchema(db);
  console.log('[Safety Guard] Verified Schema: Schema and tables verified.');

  // Mount ephemeral test server
  const app = express();
  app.use(express.json());
  app.use(optionalUserExtractor);
  app.use('/api', operationsRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const ephemeralPort = server.address().port;
  const BASE_URL = `http://127.0.0.1:${ephemeralPort}/api`;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${ephemeralPort}`);
  console.log('====================================================================\n');

  const createdOrderIds = new Set();
  const createdUserIds = new Set();

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

  async function createTestUser({ name, role = 'Production Manager', email, status = 'active', tokenVersion = 1 }) {
    const uniqueEmail = email || `prod_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@yaf-test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status, token_version)
       VALUES (?, ?, 'Plant', 'PR', ?, '$2a$10$wT1rM5Zf9vW1234567890.abcdefghijklmnopqrstuvwxyza', ?, ?)`,
      [name, role, uniqueEmail, status, tokenVersion]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    return { id: userId, name, role, email: uniqueEmail, status, token_version: tokenVersion };
  }

  async function createTestProductionOrder({
    woNumber,
    stage = 'With GM',
    customer = 'Test Bakery Ltd',
    productName = 'Liquid whole egg',
    quantityKg = 500,
    eggsToBreak = 10000,
    traysCount = 334,
    costPerKg = 363.00
  }) {
    const uniqueWo = woNumber || `WO-TEST-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const [result] = await db.query(
      `INSERT INTO production_orders
       (wo_number, stage, customer, product_name, quantity_kg, eggs_to_break, trays_count, due_date, duration_hours, priority, cost_per_kg)
       VALUES (?, ?, ?, ?, ?, ?, ?, '28 Oct 2026', 1.0, 'normal', ?)`,
      [uniqueWo, stage, customer, productName, quantityKg, eggsToBreak, traysCount, costPerKg]
    );
    const orderId = result.insertId;
    createdOrderIds.add(orderId);
    return { id: orderId, wo_number: uniqueWo, stage };
  }

  function generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        token_version: user.token_version || 1
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  let reqSeq = 0;
  function makeRequest({ method = 'POST', path, token, body = null }) {
    reqSeq++;
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const headers = {
        'x-forwarded-for': `198.51.100.${(reqSeq % 240) + 1}`
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let payload = null;
      if (body !== null) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          headers
        },
        (res) => {
          let responseData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            let parsedBody = null;
            try {
              parsedBody = JSON.parse(responseData);
            } catch (_) {
              parsedBody = responseData;
            }
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody
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
    // ------------------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & ROLE AUTHORIZATION
    // ------------------------------------------------------------------------
    console.log('--- PART 1: AUTHENTICATION & ROLE AUTHORIZATION ---');

    await test('Unauthenticated POST /api/production/move is rejected with HTTP 401', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 401);
    });

    await test('Unauthorized role (Staff) is rejected with HTTP 403', async () => {
      const staffUser = await createTestUser({ name: 'General Staff Worker', role: 'Staff' });
      const staffToken = generateToken(staffUser);
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: staffToken,
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 403);
    });

    await test('Unauthorized role (HR Manager) is rejected with HTTP 403', async () => {
      const hrUser = await createTestUser({ name: 'HR Admin Person', role: 'HR Manager' });
      const hrToken = generateToken(hrUser);
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: hrToken,
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 403);
    });

    const prodManager = await createTestUser({ name: 'Rashakai Plant Production Manager', role: 'Production Manager' });
    const prodToken = generateToken(prodManager);

    const plantManager = await createTestUser({ name: 'Plant General Manager', role: 'Plant Manager' });
    const plantToken = generateToken(plantManager);

    await test('Authorized role (Production Manager) can transition stages', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.stage, 'With Plant Manager');
    });

    await test('Authorized role (Plant Manager) can transition stages', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: plantToken,
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
    });

    // ------------------------------------------------------------------------
    // SECTION 2: INPUT VALIDATION & NOT FOUND HANDLING
    // ------------------------------------------------------------------------
    console.log('\n--- PART 2: INPUT VALIDATION & NOT FOUND HANDLING ---');

    await test('Missing order id is rejected with HTTP 400', async () => {
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('ID'));
    });

    await test('Malformed or non-numeric order id is rejected with HTTP 400', async () => {
      for (const badId of ['abc', -5, 0, null, true, {}]) {
        const res = await makeRequest({
          path: '/api/production/move',
          token: prodToken,
          body: { id: badId, stage: 'With Plant Manager' }
        });
        assert.strictEqual(res.statusCode, 400, `Expected 400 for bad id: ${JSON.stringify(badId)}`);
      }
    });

    await test('Missing or empty target stage is rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: '   ' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('stage'));
    });

    await test('Unrecognized target stage is rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      for (const badStage of ['Shipping', 'Dispatched', 'Quality Approved', 'Unknown Stage', 123]) {
        const res = await makeRequest({
          path: '/api/production/move',
          token: prodToken,
          body: { id: order.id, stage: badStage }
        });
        assert.strictEqual(res.statusCode, 400, `Expected 400 for invalid stage: ${JSON.stringify(badStage)}`);
        assert.ok(res.body?.error?.includes('production stage'));
      }
    });

    await test('Nonexistent order id returns HTTP 404', async () => {
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: 9999999, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 404);
      assert.ok(res.body?.error?.includes('not found'));
    });

    // ------------------------------------------------------------------------
    // SECTION 3: TRANSITION RULES & STAGE ADVANCEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- PART 3: TRANSITION RULES & STAGE ADVANCEMENT ---');

    await test('Transition to the same stage is rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'With GM' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('already in "With GM" stage'));
    });

    await test('Skipped forward stages (With GM -> In production) are rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'In production' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('Invalid stage transition'));
    });

    await test('Skipped forward stages (With GM -> Completed) are rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'Completed' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('Invalid stage transition'));
    });

    await test('Multi-stage backward jump (Completed -> With GM) is rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'Completed' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'With GM' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('Invalid stage transition'));
    });

    await test('Step through full 6-stage forward pipeline sequentially succeeds', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const expectedSteps = [
        'With Plant Manager',
        'With Production Manager',
        'Materials requested',
        'In production',
        'Completed'
      ];

      for (const nextStage of expectedSteps) {
        const res = await makeRequest({
          path: '/api/production/move',
          token: prodToken,
          body: { id: order.id, stage: nextStage }
        });
        assert.strictEqual(res.statusCode, 200, `Failed advancing to ${nextStage}: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.stage, nextStage);

        // Verify database reflects the change
        const [dbRows] = await db.query('SELECT stage FROM production_orders WHERE id = ?', [order.id]);
        assert.strictEqual(dbRows[0].stage, nextStage);
      }
    });

    await test('Backward transition attempt (Completed -> In production) is rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'Completed' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'In production' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('Only sequential forward advancement to the immediate next stage is permitted'));

      const [dbRows] = await db.query('SELECT stage FROM production_orders WHERE id = ?', [order.id]);
      assert.strictEqual(dbRows[0].stage, 'Completed');
    });

    await test('Backward transition attempt (With Production Manager -> With Plant Manager) is rejected with HTTP 400', async () => {
      const order = await createTestProductionOrder({ stage: 'With Production Manager' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body?.error?.includes('Only sequential forward advancement to the immediate next stage is permitted'));

      const [dbRows] = await db.query('SELECT stage FROM production_orders WHERE id = ?', [order.id]);
      assert.strictEqual(dbRows[0].stage, 'With Production Manager');
    });

    // ------------------------------------------------------------------------
    // SECTION 4: STATE INTEGRITY & AUDIT TRAIL VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- PART 4: STATE INTEGRITY & AUDIT TRAIL VERIFICATION ---');

    await test('Rejected transition does NOT modify order stage in database', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'In production' } // Invalid skipped jump
      });
      assert.strictEqual(res.statusCode, 400);

      const [dbRows] = await db.query('SELECT stage FROM production_orders WHERE id = ?', [order.id]);
      assert.strictEqual(dbRows[0].stage, 'With GM', 'Order stage must remain unchanged after rejected request');
    });

    await test('Rejected transition does NOT record misleading success audit entry', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const initialAuditCount = (
        await db.query('SELECT COUNT(*) as count FROM audit_logs WHERE entity_type = "PRODUCTION" AND entity_id = ?', [order.id])
      )[0][0].count;

      await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'Completed' } // Invalid jump
      });

      const finalAuditCount = (
        await db.query('SELECT COUNT(*) as count FROM audit_logs WHERE entity_type = "PRODUCTION" AND entity_id = ?', [order.id])
      )[0][0].count;

      assert.strictEqual(finalAuditCount, initialAuditCount, 'No new audit log should be written for rejected transition');
    });

    await test('Successful transition writes complete audit entry with true actor attribution', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });
      const res = await makeRequest({
        path: '/api/production/move',
        token: prodToken,
        body: { id: order.id, stage: 'With Plant Manager' }
      });
      assert.strictEqual(res.statusCode, 200);

      const [logs] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_type = "PRODUCTION" AND entity_id = ? ORDER BY id DESC LIMIT 1',
        [order.id]
      );
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].action, 'MOVE_PRODUCTION');
      assert.strictEqual(logs[0].user_name, prodManager.name);
      assert.strictEqual(logs[0].role, prodManager.role);
      assert.ok(logs[0].details.includes('moved production work order'));
      assert.ok(logs[0].details.includes('"With GM" to "With Plant Manager"'));
    });

    // ------------------------------------------------------------------------
    // SECTION 5: CONCURRENCY & RACE-CONDITION PROTECTION
    // ------------------------------------------------------------------------
    console.log('\n--- PART 5: CONCURRENCY & RACE-CONDITION PROTECTION ---');

    await test('Concurrent conflicting transitions on the same order are serialized safely', async () => {
      const order = await createTestProductionOrder({ stage: 'With GM' });

      // Launch 5 concurrent requests all attempting to advance the same order to 'With Plant Manager'
      const concurrentReqs = [];
      for (let i = 0; i < 5; i++) {
        concurrentReqs.push(
          makeRequest({
            path: '/api/production/move',
            token: prodToken,
            body: { id: order.id, stage: 'With Plant Manager' }
          })
        );
      }

      const results = await Promise.all(concurrentReqs);
      const successfulMoves = results.filter((r) => r.statusCode === 200);
      const rejectedMoves = results.filter((r) => r.statusCode === 400);

      // Exactly ONE request must succeed; subsequent requests encounter 'already in stage' error
      assert.strictEqual(successfulMoves.length, 1, 'Exactly one concurrent transition must succeed');
      assert.strictEqual(rejectedMoves.length, 4, 'Remaining concurrent transitions must be rejected');

      // The rejected moves must report already in stage or invalid transition
      for (const rej of rejectedMoves) {
        assert.ok(
          rej.body?.error?.includes('already in') || rej.body?.error?.includes('Invalid stage transition'),
          `Unexpected rejection message: ${JSON.stringify(rej.body)}`
        );
      }

      // Authoritative database stage must be 'With Plant Manager'
      const [finalRows] = await db.query('SELECT stage FROM production_orders WHERE id = ?', [order.id]);
      assert.strictEqual(finalRows[0].stage, 'With Plant Manager');
    });

    console.log('\n====================================================================');
    console.log(`TEST SUMMARY: ${passed} / ${total} tests passed successfully.`);
    console.log('====================================================================\n');

    if (passed !== total) {
      process.exitCode = 1;
    }
  } finally {
    server.close();

    // Clean up created test production orders and their audit logs
    if (createdOrderIds.size > 0) {
      const oids = Array.from(createdOrderIds);
      const placeholders = oids.map(() => '?').join(',');
      await db.query(`DELETE FROM audit_logs WHERE entity_type = "PRODUCTION" AND entity_id IN (${placeholders})`, oids);
      await db.query(`DELETE FROM production_orders WHERE id IN (${placeholders})`, oids);
      console.log(`[Safety Cleanup] Cleaned up ${oids.length} test production order record(s) and associated audit logs.`);
    }

    if (createdUserIds.size > 0) {
      const uids = Array.from(createdUserIds);
      const placeholders = uids.map(() => '?').join(',');
      await db.query(`DELETE FROM audit_logs WHERE user_id IN (${placeholders})`, uids);
      await db.query(`DELETE FROM users WHERE id IN (${placeholders})`, uids);
      console.log(`[Safety Cleanup] Cleaned up ${uids.length} temporary test user(s).`);
    }

    await db.end();
  }
}

runProductionTransitionTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
