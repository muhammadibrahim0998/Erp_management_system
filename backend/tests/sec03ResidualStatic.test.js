const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// ============================================================================
// PHASE D2.18 STATIC ACCESS-CONTROL & AUDIT INTEGRITY TEST SUITE
// This test suite runs STRICTLY OFFLINE with ZERO database connections.
// ============================================================================

console.log('====================================================================');
console.log('PHASE D2.18 STATIC ACCESS-CONTROL & AUDIT INTEGRITY TEST SUITE');
console.log('Zero Database Connections · Pure Static & Mock-Level Validation');
console.log('====================================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  PASS: [${total.toString().padStart(2, '0')}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: [${total.toString().padStart(2, '0')}] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function asyncTest(name, fn) {
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

const opsControllerSource = fs.readFileSync(
  path.join(__dirname, '../controllers/operations.controller.js'),
  'utf8'
);
const opsRoutesSource = fs.readFileSync(
  path.join(__dirname, '../routes/operations.routes.js'),
  'utf8'
);
const auditLoggerSource = fs.readFileSync(
  path.join(__dirname, '../utils/auditLogger.js'),
  'utf8'
);
const sec03DocSource = fs.readFileSync(
  path.join(__dirname, '../../docs/workflow-approvals-sec03.md'),
  'utf8'
);
const settingsMatrixSource = fs.readFileSync(
  path.join(__dirname, '../../frontend/src/components/views/SettingsMatrix.jsx'),
  'utf8'
);
const initDbSource = fs.readFileSync(
  path.join(__dirname, '../initDb.js'),
  'utf8'
);
const serverSource = fs.readFileSync(
  path.join(__dirname, '../server.js'),
  'utf8'
);
const migrateScriptSource = fs.readFileSync(
  path.join(__dirname, '../scripts/migrateSec03.js'),
  'utf8'
);

// ----------------------------------------------------------------------------
// 1. STATIC CODE INVARIANT CHECKS
// ----------------------------------------------------------------------------
test('ST-01: OPERATIONAL_STEP_VERIFIED is completely eliminated from backend code', () => {
  assert.strictEqual(
    opsControllerSource.includes('OPERATIONAL_STEP_VERIFIED'),
    false,
    'operations.controller.js must not contain OPERATIONAL_STEP_VERIFIED'
  );
  assert.strictEqual(
    auditLoggerSource.includes('OPERATIONAL_STEP_VERIFIED'),
    false,
    'auditLogger.js must not contain OPERATIONAL_STEP_VERIFIED'
  );
});

test('ST-02: Operational workflow branch in actionApproval sets sodStatus to CREATOR_UNRECORDED', () => {
  const hasCreatorUnrecorded = opsControllerSource.includes("sodStatus = 'CREATOR_UNRECORDED'");
  assert.strictEqual(
    hasCreatorUnrecorded,
    true,
    "operations.controller.js must assign sodStatus = 'CREATOR_UNRECORDED' for operational tasks"
  );
});

test('ST-03: ERP Admin is barred from actionApproval with HTTP 403', () => {
  const hasAdminBar = opsControllerSource.includes("if (userRole === 'ERP Admin')") &&
    opsControllerSource.includes('ERP Admin is barred from operational and financial workflow approvals');
  assert.strictEqual(hasAdminBar, true, 'actionApproval must explicitly bar ERP Admin');
});

test('ST-04: getApprovals returns empty list for ERP Admin', () => {
  const hasInboxScoping = opsControllerSource.includes("if (userRole === 'ERP Admin') {\n      return res.json([]);");
  assert.strictEqual(hasInboxScoping, true, 'getApprovals must return [] for ERP Admin');
});

test('ST-05: POST /approvals/:id/action route does not use coarse WORKFLOW_ROLES', () => {
  const hasCoarseRole = opsRoutesSource.includes("router.post('/approvals/:id/action', authenticateToken, requireRoles(");
  assert.strictEqual(
    hasCoarseRole,
    false,
    'POST /approvals/:id/action must not use requireRoles on route level'
  );
  assert.ok(
    opsRoutesSource.includes("router.post('/approvals/:id/action', authenticateToken, operationsController.actionApproval);"),
    'Route must delegate to operationsController.actionApproval with authenticateToken'
  );
});

test('ST-06: logAudit re-throws errors when a transactional connection is passed', () => {
  const rethrowsOnConnection = auditLoggerSource.includes('if (connection) {\n      throw err;\n    }');
  assert.strictEqual(
    rethrowsOnConnection,
    true,
    'auditLogger.js must re-throw on failure when connection is provided'
  );
});

// ----------------------------------------------------------------------------
// 2. MOCK-BASED getChairmanDashboard BEHAVIOR VALIDATION
// ----------------------------------------------------------------------------
(async () => {
  // Isolate getChairmanDashboard using mocked dependencies
  const { db } = require('../config/db');
  const originalQuery = db.query;

  try {
    await asyncTest('ST-07: getChairmanDashboard returns waitingApprovals = [] for ERP Admin', async () => {
      let queryExecutedForTasks = false;
      db.query = async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM workflow_tasks')) {
          queryExecutedForTasks = true;
          return [[{ id: 99, title: 'Secret Task', status: 'pending' }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM inventory_items')) {
          return [[{ count: 5 }]];
        }
        if (typeof sql === 'string' && sql.includes('FROM purchase_orders')) {
          return [[{ count: 12 }]];
        }
        return [[]];
      };

      const operationsController = require('../controllers/operations.controller');

      const mockReq = {
        user: { id: 10, role: 'ERP Admin', name: 'Kamran Ali' },
        trustedUser: { id: 10, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
      };

      let jsonResult = null;
      let statusCode = 200;
      const mockRes = {
        status: (code) => { statusCode = code; return mockRes; },
        json: (data) => { jsonResult = data; return mockRes; }
      };

      await operationsController.getChairmanDashboard(mockReq, mockRes);

      assert.strictEqual(statusCode, 200);
      assert.ok(jsonResult, 'Response JSON must be returned');
      assert.strictEqual(queryExecutedForTasks, false, 'No database query on workflow_tasks should run for ERP Admin');
      assert.ok(Array.isArray(jsonResult.waitingApprovals), 'waitingApprovals must be an array');
      assert.strictEqual(jsonResult.waitingApprovals.length, 0, 'waitingApprovals must be strictly empty for ERP Admin');
      assert.ok(jsonResult.kpis, 'KPIs must remain present');
      assert.ok(jsonResult.revenueChart, 'Revenue chart must remain present');
      assert.ok(jsonResult.receivablesAging, 'Receivables aging must remain present');
    });

    await asyncTest('ST-08: getChairmanDashboard returns pending tasks for Chairman & CEO', async () => {
      const sampleTasks = [
        { id: 1, doc_number: 'PO-2026-0929', doc_type: 'Purchase order', status: 'pending' },
        { id: 2, doc_number: 'WO-2026-0004', doc_type: 'Production order', status: 'pending' }
      ];

      db.query = async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM workflow_tasks')) {
          return [sampleTasks];
        }
        return [[{ count: 1 }]];
      };

      const operationsController = require('../controllers/operations.controller');

      const mockReq = {
        user: { id: 1, role: 'Chairman & CEO', name: 'Sana Ullah' },
        trustedUser: { id: 1, role: 'Chairman & CEO', name: 'Sana Ullah', status: 'active' }
      };

      let jsonResult = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { jsonResult = data; return mockRes; }
      };

      await operationsController.getChairmanDashboard(mockReq, mockRes);

      assert.ok(jsonResult, 'Response JSON must be returned');
      assert.strictEqual(jsonResult.waitingApprovals.length, 2);
      assert.strictEqual(jsonResult.waitingApprovals[0].doc_number, 'PO-2026-0929');
    });

    await asyncTest('ST-09: getChairmanDashboard scopes operational tasks for Director Operations', async () => {
      let executedSql = '';
      db.query = async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM workflow_tasks')) {
          executedSql = sql;
          return [[{ id: 2, doc_type: 'Production order', status: 'pending' }]];
        }
        return [[{ count: 1 }]];
      };

      const operationsController = require('../controllers/operations.controller');

      const mockReq = {
        user: { id: 3, role: 'Director Operations', name: 'Saeed ur Rehman' },
        trustedUser: { id: 3, role: 'Director Operations', name: 'Saeed ur Rehman', status: 'active' }
      };

      let jsonResult = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { jsonResult = data; return mockRes; }
      };

      await operationsController.getChairmanDashboard(mockReq, mockRes);

      assert.ok(executedSql.includes("doc_type IN ('Production order', 'Gate pass — inward', 'Goods receipt (GRN)', 'Raw material requirement')"), 'Query must filter by operational domain');
      assert.strictEqual(jsonResult.waitingApprovals.length, 1);
    });

    await asyncTest('ST-10: getChairmanDashboard scopes financial tasks for Director Finance', async () => {
      let executedSql = '';
      db.query = async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('FROM workflow_tasks')) {
          executedSql = sql;
          return [[{ id: 1, doc_type: 'Purchase order', status: 'pending' }]];
        }
        return [[{ count: 1 }]];
      };

      const operationsController = require('../controllers/operations.controller');

      const mockReq = {
        user: { id: 4, role: 'Director Finance', name: 'Mujeeb Ullah' },
        trustedUser: { id: 4, role: 'Director Finance', name: 'Mujeeb Ullah', status: 'active' }
      };

      let jsonResult = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { jsonResult = data; return mockRes; }
      };

      await operationsController.getChairmanDashboard(mockReq, mockRes);

      assert.ok(executedSql.includes("doc_type = 'Purchase order'"), 'Query must filter by financial domain');
      assert.strictEqual(jsonResult.waitingApprovals.length, 1);
    });

    await asyncTest('ST-11: Alternate fields in getChairmanDashboard do not leak workflow task data', async () => {
      db.query = async (sql, params) => {
        return [[{ count: 0 }]];
      };

      const operationsController = require('../controllers/operations.controller');

      const mockReq = {
        user: { id: 10, role: 'ERP Admin', name: 'Kamran Ali' },
        trustedUser: { id: 10, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
      };

      let jsonResult = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { jsonResult = data; return mockRes; }
      };

      await operationsController.getChairmanDashboard(mockReq, mockRes);

      // Verify no task objects are present in kpis, budgetVsActual, exceptions, or revenueChart
      const serialized = JSON.stringify({
        kpis: jsonResult.kpis,
        budgetVsActual: jsonResult.budgetVsActual,
        exceptions: jsonResult.exceptions,
        revenueChart: jsonResult.revenueChart,
        receivablesAging: jsonResult.receivablesAging
      });

      assert.strictEqual(serialized.includes('PO-2026'), false, 'Alternate fields must not contain PO doc numbers');
      assert.strictEqual(serialized.includes('WO-2026'), false, 'Alternate fields must not contain WO doc numbers');
      assert.strictEqual(serialized.includes('GPI-2026'), false, 'Alternate fields must not contain GPI doc numbers');
      assert.strictEqual(serialized.includes('GRN-2026'), false, 'Alternate fields must not contain GRN doc numbers');
      assert.strictEqual(serialized.includes('RMR-2026'), false, 'Alternate fields must not contain RMR doc numbers');
    });

    // ------------------------------------------------------------------------
    // MOCK-BASED actionApproval BEHAVIOR VALIDATION (Fixes F-02 & F-03)
    // ------------------------------------------------------------------------
    const operationsController = require('../controllers/operations.controller');
    const originalGetConnection = db.getConnection;
    const auditLogger = require('../utils/auditLogger');
    const originalLogAudit = auditLogger.logAudit;

    try {
      await asyncTest('ST-22: PO with null created_by_user_id fails closed with HTTP 403 and rollback (Phase D2.30)', async () => {
        let rolledBack = false;
        let committed = false;
        let responseJson = null;

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 1,
                doc_number: 'PO-2026-0001',
                doc_type: 'Purchase order',
                amount: 100000,
                status: 'pending',
                assigned_role: 'Director Finance'
              }]];
            }
            if (sql.includes('FROM purchase_orders')) {
              return [[{
                id: 10,
                po_number: 'PO-2026-0001',
                amount: 100000,
                created_by: 'Waqar Ahmad',
                created_by_user_id: null,
                status: 'Draft'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => { committed = true; },
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '1' },
          body: { action: 'approved' },
          user: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance' },
          trustedUser: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance', status: 'active' }
        };
        let statusCode = 200;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (data) => { responseJson = data; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403, 'PO with null created_by_user_id must fail closed with HTTP 403');
        assert.strictEqual(rolledBack, true, 'Transaction must be rolled back');
        assert.strictEqual(committed, false, 'Transaction must not be committed');
        assert.ok(responseJson?.error?.includes('Creator identity is unverified on purchase order'), 'Must report unverified creator');
      });

      await asyncTest('ST-23: PO with non-null verified created_by_user_id sets sodStatus = VERIFIED_INDEPENDENT (Fix F-02)', async () => {
        let lastAudit = null;
        auditLogger.logAudit = async ({ details }) => {
          lastAudit = JSON.parse(details);
        };

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 1,
                doc_number: 'PO-2026-0001',
                doc_type: 'Purchase order',
                amount: 100000,
                status: 'pending',
                assigned_role: 'Director Finance'
              }]];
            }
            if (sql.includes('FROM purchase_orders')) {
              return [[{
                id: 10,
                po_number: 'PO-2026-0001',
                amount: 100000,
                created_by: 'Waqar Ahmad',
                created_by_user_id: 12,
                status: 'Draft'
              }]];
            }
            if (sql.includes('UPDATE')) {
              return [{ affectedRows: 1 }];
            }
            return [[]];
          },
          rollback: async () => {},
          commit: async () => {},
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '1' },
          body: { action: 'approved' },
          user: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance' },
          trustedUser: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance', status: 'active' }
        };
        let statusCode = 200;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: () => mockRes
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 200);
        assert.ok(lastAudit, 'Audit log must be written');
        assert.strictEqual(lastAudit.sod_status, 'VERIFIED_INDEPENDENT', 'PO with verified independent creator must be VERIFIED_INDEPENDENT');
      });

      await asyncTest('ST-24: Gate Pass missing from trusted store fails closed with HTTP 403 (Fix F-03)', async () => {
        let rolledBack = false;
        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 2,
                doc_number: 'GPI-2026-9999',
                doc_type: 'Gate pass — inward',
                amount: 0,
                status: 'pending',
                assigned_role: 'QC Cell'
              }]];
            }
            if (sql.includes('FROM gate_passes')) {
              return [[]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => {},
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '2' },
          body: { action: 'approved' },
          user: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell' },
          trustedUser: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.ok(jsonResult.error.includes('not found in trusted store'), 'Must fail closed on missing document');
      });

      await asyncTest('ST-25: Gate Pass with null created_by_user_id fails closed with HTTP 403 (Fix F-03)', async () => {
        let rolledBack = false;
        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 2,
                doc_number: 'GPI-2026-0002',
                doc_type: 'Gate pass — inward',
                amount: 0,
                status: 'pending',
                assigned_role: 'QC Cell'
              }]];
            }
            if (sql.includes('FROM gate_passes')) {
              return [[{
                id: 22,
                pass_number: 'GPI-2026-0002',
                created_by_user_id: null,
                status: 'At gate'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => {},
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '2' },
          body: { action: 'approved' },
          user: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell' },
          trustedUser: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.ok(jsonResult.error.includes('Creator identity is unverified'), 'Must fail closed on unverified creator');
      });

      await asyncTest('ST-26: Production Order with null created_by_user_id fails closed with HTTP 403 (Fix F-03)', async () => {
        let rolledBack = false;
        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 3,
                doc_number: 'WO-2026-0002',
                doc_type: 'Production order',
                amount: 836000,
                status: 'pending',
                assigned_role: 'Farhan Ali',
                assigned_user_id: 6
              }]];
            }
            if (sql.includes('FROM production_orders')) {
              return [[{
                id: 33,
                wo_number: 'WO-2026-0002',
                created_by_user_id: null,
                status: 'in_progress'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => {},
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '3' },
          body: { action: 'approved' },
          user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
          trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.ok(jsonResult.error.includes('Creator identity is unverified'), 'Must fail closed on unverified creator');
      });

      await asyncTest('ST-27: Production Order self-approval by creator is rejected with HTTP 403 (Fix F-03)', async () => {
        let rolledBack = false;
        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 3,
                doc_number: 'WO-2026-0002',
                doc_type: 'Production order',
                amount: 836000,
                status: 'pending',
                assigned_role: 'Farhan Ali',
                assigned_user_id: 6
              }]];
            }
            if (sql.includes('FROM production_orders')) {
              return [[{
                id: 33,
                wo_number: 'WO-2026-0002',
                created_by_user_id: 6,
                status: 'in_progress'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => {},
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '3' },
          body: { action: 'approved' },
          user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
          trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.ok(jsonResult.error.includes('Separation of duties violation'), 'Must reject self-approval');
      });

      await asyncTest('ST-31: Lowercase Production Order name ("production order") fail-closed on unverified creator (Bypass Closure Test)', async () => {
        let rolledBack = false;
        let committed = false;
        let auditLogged = false;
        auditLogger.logAudit = async () => { auditLogged = true; };

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 30,
                doc_number: 'WO-2026-0002',
                doc_type: 'production order', // NON-CANONICAL LOWERCASE
                amount: 836000,
                status: 'pending',
                assigned_role: 'Farhan Ali',
                assigned_user_id: 6
              }]];
            }
            if (sql.includes('FROM production_orders')) {
              return [[{
                id: 33,
                wo_number: 'WO-2026-0002',
                created_by_user_id: null,
                status: 'in_progress'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => { committed = true; },
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '30' },
          body: { action: 'approved' },
          user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
          trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on rejection');
        assert.strictEqual(committed, false, 'Transaction must NOT be committed on rejection');
        assert.strictEqual(auditLogged, false, 'No successful audit record may be emitted on rejected action');
        assert.ok(jsonResult.error.includes('Creator identity is unverified on production order'), 'Must fail closed on unverified creator for lowercase doc_type');
      });

      await asyncTest('ST-32: ASCII-hyphen Gate Pass alias ("gate pass - inward") fail-closed on unverified creator', async () => {
        let rolledBack = false;
        let committed = false;
        let auditLogged = false;
        auditLogger.logAudit = async () => { auditLogged = true; };

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 31,
                doc_number: 'GPI-2026-0002',
                doc_type: 'gate pass - inward', // ASCII HYPHEN
                amount: 0,
                status: 'pending',
                assigned_role: 'QC Cell'
              }]];
            }
            if (sql.includes('FROM gate_passes')) {
              return [[{
                id: 22,
                pass_number: 'GPI-2026-0002',
                created_by_user_id: null,
                status: 'At gate'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => { committed = true; },
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '31' },
          body: { action: 'approved' },
          user: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell' },
          trustedUser: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.strictEqual(committed, false);
        assert.strictEqual(auditLogged, false);
        assert.ok(jsonResult.error.includes('Creator identity is unverified on gate pass'), 'Must fail closed on unverified creator for hyphenated gate pass');
      });

      await asyncTest('ST-33: Em-dash & title-cased Gate Pass alias ("Gate Pass — Inward") self-approval rejection', async () => {
        let rolledBack = false;
        let committed = false;
        let auditLogged = false;
        auditLogger.logAudit = async () => { auditLogged = true; };

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 32,
                doc_number: 'GPI-2026-0002',
                doc_type: 'Gate Pass — Inward', // EM-DASH & TITLE CASE
                amount: 0,
                status: 'pending',
                assigned_role: 'Dr. Asma Noor',
                assigned_user_id: 9
              }]];
            }
            if (sql.includes('FROM gate_passes')) {
              return [[{
                id: 22,
                pass_number: 'GPI-2026-0002',
                created_by_user_id: 9, // Creator is user id 9
                status: 'At gate'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => { committed = true; },
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '32' },
          body: { action: 'approved' },
          user: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell' },
          trustedUser: { id: 9, name: 'Dr. Asma Noor', role: 'QC Cell', status: 'active' } // Approver is user id 9
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.strictEqual(committed, false);
        assert.strictEqual(auditLogged, false);
        assert.ok(jsonResult.error.includes('Separation of duties violation'), 'Must reject creator self-approval on alternate-cased gate pass');
      });

      await asyncTest('ST-34: Lowercase "work order" alias for production order with missing record fails closed', async () => {
        let rolledBack = false;
        let committed = false;
        let auditLogged = false;
        auditLogger.logAudit = async () => { auditLogged = true; };

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 33,
                doc_number: 'WO-2026-9999',
                doc_type: 'work order', // ALIAS
                amount: 100000,
                status: 'pending',
                assigned_role: 'Farhan Ali',
                assigned_user_id: 6
              }]];
            }
            if (sql.includes('FROM production_orders')) {
              return [[]]; // MISSING RECORD
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => { committed = true; },
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '33' },
          body: { action: 'approved' },
          user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
          trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.strictEqual(committed, false);
        assert.strictEqual(auditLogged, false);
        assert.ok(jsonResult.error.includes('not found in trusted store'), 'Must fail closed on missing document for work order alias');
      });

      await asyncTest('ST-35: Unsupported operational task type ("Payroll run") fails closed with HTTP 403 and no audit commit', async () => {
        let rolledBack = false;
        let committed = false;
        let auditLogged = false;
        auditLogger.logAudit = async () => { auditLogged = true; };

        const mockConn = {
          beginTransaction: async () => {},
          query: async (sql, params) => {
            if (sql.includes('FROM workflow_tasks')) {
              return [[{
                id: 34,
                doc_number: 'PR-2026-0001',
                doc_type: 'Payroll run', // UNSUPPORTED WORKFLOW TASK TYPE IN actionApproval
                amount: 500000,
                status: 'pending',
                assigned_role: 'HR Manager'
              }]];
            }
            return [[]];
          },
          rollback: async () => { rolledBack = true; },
          commit: async () => { committed = true; },
          release: () => {}
        };
        db.getConnection = async () => mockConn;

        const mockReq = {
          params: { id: '34' },
          body: { action: 'approved' },
          user: { id: 18, name: 'Nadia Shah', role: 'HR Manager' },
          trustedUser: { id: 18, name: 'Nadia Shah', role: 'HR Manager', status: 'active' }
        };
        let statusCode = 200;
        let jsonResult = null;
        const mockRes = {
          status: (c) => { statusCode = c; return mockRes; },
          json: (d) => { jsonResult = d; return mockRes; }
        };

        await operationsController.actionApproval(mockReq, mockRes);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(rolledBack, true);
        assert.strictEqual(committed, false);
        assert.strictEqual(auditLogged, false);
        assert.ok(jsonResult.error.includes('is not supported for workflow approval decisions'), 'Must fail closed on unhandled document type');
      });
    } finally {
      db.getConnection = originalGetConnection;
      auditLogger.logAudit = originalLogAudit;
    }

  } finally {
    db.query = originalQuery;
  }

  // ----------------------------------------------------------------------------
  // 3. DOCUMENTATION INVARIANTS
  // ----------------------------------------------------------------------------
  test('ST-12: SEC-03 specification documents F3 dashboard remediation', () => {
    assert.ok(
      sec03DocSource.includes('Chairman Executive Dashboard (`GET /api/dashboard/chairman` — F3 Remediation)'),
      'docs/workflow-approvals-sec03.md must document F3 remediation'
    );
    assert.ok(
      sec03DocSource.includes('`ERP Admin`**: Receives `waitingApprovals: []`'),
      'docs/workflow-approvals-sec03.md must document ERP Admin empty waitingApprovals'
    );
  });

  test('ST-13: SEC-03 specification documents F2 CREATOR_UNRECORDED audit label', () => {
    assert.ok(
      sec03DocSource.includes('sod_status: "CREATOR_UNRECORDED"'),
      'docs/workflow-approvals-sec03.md must document CREATOR_UNRECORDED'
    );
  });

  test('ST-14: SEC-03 specification documents F1 and F4 residual architectural limitations', () => {
    assert.ok(
      sec03DocSource.includes('Limitation 1 (F1): Operational Workflow Creator SOD Gap'),
      'docs/workflow-approvals-sec03.md must document Limitation 1 (F1)'
    );
    assert.ok(
      sec03DocSource.includes('Limitation 2 (F4): Purchase Order Creator String Display Name vs. Durable Foreign Key'),
      'docs/workflow-approvals-sec03.md must document Limitation 2 (F4)'
    );
  });

  // ----------------------------------------------------------------------------
  // 4. PHASE D2.21 IMPLEMENTATION VALIDATIONS (Workstreams A, B, C)
  // ----------------------------------------------------------------------------
  test('ST-15: SettingsMatrix.jsx enforces single-stage monetary ceiling without sequential arrows', () => {
    assert.strictEqual(
      settingsMatrixSource.includes('→'),
      false,
      'SettingsMatrix.jsx must not contain sequential arrow characters (→)'
    );
    assert.ok(
      settingsMatrixSource.includes('Single-stage authority') ||
      settingsMatrixSource.includes('single-stage ceiling decisions'),
      'SettingsMatrix.jsx must document single-stage authority'
    );
  });

  test('ST-16: SettingsMatrix.jsx displays Band 3 Chairman & CEO exclusivity with GM barred', () => {
    assert.ok(
      settingsMatrixSource.includes('Chairman & CEO Exclusively'),
      'SettingsMatrix.jsx must specify Chairman & CEO Exclusively for Band 3'
    );
    assert.ok(
      settingsMatrixSource.includes('GM override barred'),
      'SettingsMatrix.jsx must explicitly display GM override barred for Band 3'
    );
  });

  test('ST-17: operations.controller.js verifies created_by_user_id for POs, Gate Passes, and Production Orders', () => {
    assert.ok(
      opsControllerSource.includes('poRecord.created_by_user_id') &&
      opsControllerSource.includes('Number(poRecord.created_by_user_id) === Number(trustedUser.id)'),
      'operations.controller.js must check poRecord.created_by_user_id against trustedUser.id'
    );
    assert.ok(
      opsControllerSource.includes('gpRecord.created_by_user_id') &&
      opsControllerSource.includes('Number(gpRecord.created_by_user_id) === Number(trustedUser.id)'),
      'operations.controller.js must check gpRecord.created_by_user_id against trustedUser.id'
    );
    assert.ok(
      opsControllerSource.includes('prodRecord.created_by_user_id') &&
      opsControllerSource.includes('Number(prodRecord.created_by_user_id) === Number(trustedUser.id)'),
      'operations.controller.js must check prodRecord.created_by_user_id against trustedUser.id'
    );
  });

  test('ST-18: operations.controller.js enforces fail-closed checks for missing or unmigrated GRN and RMR', () => {
    assert.ok(
      opsControllerSource.includes('Underlying goods receipt record') &&
      opsControllerSource.includes('Goods receipt schema not migrated in trusted store'),
      'operations.controller.js must fail closed for missing or unmigrated goods receipt records'
    );
    assert.ok(
      opsControllerSource.includes('Underlying raw material requirement record') &&
      opsControllerSource.includes('Raw material requirement schema not migrated in trusted store'),
      'operations.controller.js must fail closed for missing or unmigrated raw material requirements'
    );
  });

  test('ST-19: initDb.js defines reviewable idempotent DDL for goods_receipts, goods_receipt_items, and raw_material_requirements', () => {
    assert.ok(
      initDbSource.includes('CREATE TABLE IF NOT EXISTS goods_receipts'),
      'initDb.js must define goods_receipts table'
    );
    assert.ok(
      initDbSource.includes('CREATE TABLE IF NOT EXISTS goods_receipt_items'),
      'initDb.js must define goods_receipt_items table'
    );
    assert.ok(
      initDbSource.includes('CREATE TABLE IF NOT EXISTS raw_material_requirements'),
      'initDb.js must define raw_material_requirements table'
    );
  });

  test('ST-20: initDb.js contains created_by_user_id column and idempotent migrations for gate_passes, purchase_orders, production_orders', () => {
    assert.ok(
      initDbSource.includes("TABLE_NAME = 'gate_passes'") &&
      initDbSource.includes("ALTER TABLE gate_passes ADD COLUMN created_by_user_id INT NULL"),
      'initDb.js must contain idempotent alter for gate_passes.created_by_user_id'
    );
    assert.ok(
      initDbSource.includes("TABLE_NAME = 'purchase_orders'") &&
      initDbSource.includes("ALTER TABLE purchase_orders ADD COLUMN created_by_user_id INT NULL"),
      'initDb.js must contain idempotent alter for purchase_orders.created_by_user_id'
    );
    assert.ok(
      initDbSource.includes("TABLE_NAME = 'production_orders'") &&
      initDbSource.includes("ALTER TABLE production_orders ADD COLUMN created_by_user_id INT NULL"),
      'initDb.js must contain idempotent alter for production_orders.created_by_user_id'
    );
  });

  test('ST-21: createGatePass and createProcurementPO capture created_by_user_id with backward-compatible fallback', () => {
    assert.ok(
      opsControllerSource.includes('creatorUserId') &&
      opsControllerSource.includes('[passNo, vehicle_number, supplier_customer, pass_type || \'inward\', creatorUserId]'),
      'createGatePass must pass creatorUserId to insert'
    );
    assert.ok(
      opsControllerSource.includes('cleanCreator, cleanAmount, cleanItemsCount, authenticatedUserId'),
      'createProcurementPO must pass authenticatedUserId to insert'
    );
    assert.ok(
      opsControllerSource.includes("ER_BAD_FIELD_ERROR") &&
      opsControllerSource.includes("Unknown column"),
      'Creation routines must catch ER_BAD_FIELD_ERROR for schema backwards compatibility'
    );
  });

  test('ST-28: Server startup does NOT automatically execute SEC-03 DDL migrations (Fix F-01)', () => {
    assert.strictEqual(
      serverSource.includes('runSec03Migrations'),
      false,
      'server.js must not invoke runSec03Migrations on startup'
    );
    assert.strictEqual(
      initDbSource.includes('await runSec03Migrations'),
      false,
      'initDatabase() must not automatically call runSec03Migrations'
    );
  });

  test('ST-29: migrateSec03.js standalone runner enforces CONFIRM_MIGRATE safety guard (Fix F-01)', () => {
    assert.ok(
      migrateScriptSource.includes("process.env.CONFIRM_MIGRATE !== 'true'"),
      'migrateSec03.js must require CONFIRM_MIGRATE=true guard'
    );
    assert.ok(
      migrateScriptSource.includes('runSec03Migrations(conn)'),
      'migrateSec03.js must invoke runSec03Migrations'
    );
  });

  test('ST-30: runSec03Migrations includes idempotent index additions on existing tables (Fix F-05)', () => {
    assert.ok(
      initDbSource.includes('ADD INDEX idx_gp_created_by (created_by_user_id)'),
      'runSec03Migrations must add index idx_gp_created_by'
    );
    assert.ok(
      initDbSource.includes('ADD INDEX idx_po_created_by (created_by_user_id)'),
      'runSec03Migrations must add index idx_po_created_by'
    );
    assert.ok(
      initDbSource.includes('ADD INDEX idx_prod_created_by (created_by_user_id)'),
      'runSec03Migrations must add index idx_prod_created_by'
    );
  });

  // ----------------------------------------------------------------------------
  // 5. PHASE D2.25 NORMALIZATION & MIGRATION HARDENING VALIDATIONS
  // ----------------------------------------------------------------------------
  test('ST-36: normalizeWorkflowDocType maps all aliases, dash variants, and cases to canonical types', () => {
    const { normalizeWorkflowDocType, CANONICAL_DOC_TYPES } = require('../controllers/operations.controller');

    // Gate Pass variants (em dash, en dash, hyphen, uppercase, lowercase, aliases)
    assert.strictEqual(normalizeWorkflowDocType('Gate pass — inward'), CANONICAL_DOC_TYPES.GATE_PASS);
    assert.strictEqual(normalizeWorkflowDocType('gate pass - inward'), CANONICAL_DOC_TYPES.GATE_PASS);
    assert.strictEqual(normalizeWorkflowDocType('GATE PASS – INWARD'), CANONICAL_DOC_TYPES.GATE_PASS);
    assert.strictEqual(normalizeWorkflowDocType('Gate Pass'), CANONICAL_DOC_TYPES.GATE_PASS);
    assert.strictEqual(normalizeWorkflowDocType('gpi'), CANONICAL_DOC_TYPES.GATE_PASS);
    assert.strictEqual(normalizeWorkflowDocType('gate pass - outward'), CANONICAL_DOC_TYPES.GATE_PASS);

    // Production Order variants
    assert.strictEqual(normalizeWorkflowDocType('Production order'), CANONICAL_DOC_TYPES.PRODUCTION_ORDER);
    assert.strictEqual(normalizeWorkflowDocType('production order'), CANONICAL_DOC_TYPES.PRODUCTION_ORDER);
    assert.strictEqual(normalizeWorkflowDocType('WORK ORDER'), CANONICAL_DOC_TYPES.PRODUCTION_ORDER);
    assert.strictEqual(normalizeWorkflowDocType('wo'), CANONICAL_DOC_TYPES.PRODUCTION_ORDER);

    // Purchase Order variants
    assert.strictEqual(normalizeWorkflowDocType('Purchase order'), CANONICAL_DOC_TYPES.PURCHASE_ORDER);
    assert.strictEqual(normalizeWorkflowDocType('purchase order'), CANONICAL_DOC_TYPES.PURCHASE_ORDER);
    assert.strictEqual(normalizeWorkflowDocType('PO'), CANONICAL_DOC_TYPES.PURCHASE_ORDER);

    // Goods Receipt & Raw Material Requirement
    assert.strictEqual(normalizeWorkflowDocType('Goods receipt (GRN)'), CANONICAL_DOC_TYPES.GOODS_RECEIPT);
    assert.strictEqual(normalizeWorkflowDocType('grn'), CANONICAL_DOC_TYPES.GOODS_RECEIPT);
    assert.strictEqual(normalizeWorkflowDocType('Raw material requirement'), CANONICAL_DOC_TYPES.RAW_MATERIAL_REQUIREMENT);
    assert.strictEqual(normalizeWorkflowDocType('rmr'), CANONICAL_DOC_TYPES.RAW_MATERIAL_REQUIREMENT);

    // Payroll Run
    assert.strictEqual(normalizeWorkflowDocType('Payroll run'), CANONICAL_DOC_TYPES.PAYROLL_RUN);
    assert.strictEqual(normalizeWorkflowDocType('payroll'), CANONICAL_DOC_TYPES.PAYROLL_RUN);

    // Unknown and malformed inputs
    assert.strictEqual(normalizeWorkflowDocType('Special Order'), CANONICAL_DOC_TYPES.UNKNOWN);
    assert.strictEqual(normalizeWorkflowDocType(''), CANONICAL_DOC_TYPES.UNKNOWN);
    assert.strictEqual(normalizeWorkflowDocType(null), CANONICAL_DOC_TYPES.UNKNOWN);
    assert.strictEqual(normalizeWorkflowDocType(123), CANONICAL_DOC_TYPES.UNKNOWN);
  });

  await asyncTest('ST-37: migrateSec03.js catches connection acquisition failure and reports cleanly', async () => {
    const migrateSec03 = require('../scripts/migrateSec03');
    const { db } = require('../config/db');
    const originalGetConn = db.getConnection;
    const originalExitCode = process.exitCode;
    const originalEnv = process.env.CONFIRM_MIGRATE;

    try {
      process.env.CONFIRM_MIGRATE = 'true';
      db.getConnection = async () => {
        throw new Error('Connection refused by mock MySQL socket');
      };

      const result = await migrateSec03.main();
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('Database connection acquisition failed'), 'Must report connection acquisition failure');
      assert.strictEqual(process.exitCode, 1, 'Must set exitCode = 1 on failure');
    } finally {
      db.getConnection = originalGetConn;
      process.exitCode = originalExitCode;
      process.env.CONFIRM_MIGRATE = originalEnv;
    }
  });

  await asyncTest('ST-38: migrateSec03.js releases connection in finally block upon migration execution failure', async () => {
    const migrateSec03 = require('../scripts/migrateSec03');
    const { db } = require('../config/db');
    const initDb = require('../initDb');
    const originalGetConn = db.getConnection;
    const originalRunSec03 = initDb.runSec03Migrations;
    const originalExitCode = process.exitCode;
    const originalEnv = process.env.CONFIRM_MIGRATE;

    let releasedCount = 0;
    try {
      process.env.CONFIRM_MIGRATE = 'true';
      db.getConnection = async () => ({
        query: async () => { throw new Error('Mock table alteration failure in step 2'); },
        release: () => { releasedCount++; }
      });

      const result = await migrateSec03.main();
      assert.strictEqual(result.success, false);
      assert.strictEqual(releasedCount, 1, 'Connection must be released exactly once');
      assert.strictEqual(process.exitCode, 1, 'Must set exitCode = 1 on failure');
    } finally {
      db.getConnection = originalGetConn;
      initDb.runSec03Migrations = originalRunSec03;
      process.exitCode = originalExitCode;
      process.env.CONFIRM_MIGRATE = originalEnv;
    }
  });

  test('ST-39: docs/workflow-approvals-sec03.md documents migration recovery, implicit DDL commit, and doc normalization', () => {
    const sec03Doc = fs.readFileSync(path.join(__dirname, '../../docs/workflow-approvals-sec03.md'), 'utf8');
    assert.ok(
      sec03Doc.includes('Phase D2.25 Document Normalization & Migration Recovery Architecture'),
      'docs must document Phase D2.25 architecture'
    );
    assert.ok(
      sec03Doc.includes('Implicit DDL Commits'),
      'docs must document MySQL implicit DDL commit behavior'
    );
    assert.ok(
      sec03Doc.includes('Non-Atomic Migration Notice'),
      'docs must document non-atomic migration behavior'
    );
    assert.ok(
      sec03Doc.includes('Idempotent Rerun Recovery'),
      'docs must document idempotent rerun recovery'
    );
  });

  // ------------------------------------------------------------------------
  // PHASE D2.28: ADMINISTRATIVE SELF-MODIFICATION REGRESSION TESTS (F-D2.26-01)
  // ------------------------------------------------------------------------
  const userController = require('../controllers/user.controller');
  const userAuditLogger = require('../utils/auditLogger');
  const originalUserLogAudit = userAuditLogger.logAudit;
  const originalDbGetConn = db.getConnection;

  await asyncTest('ST-40: Admin self-role escalation is rejected with HTTP 403 in updateUser', async () => {
    let rolledBack = false;
    let released = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 20,
            name: 'Kamran Ali',
            email: 'kamran@algohub.com',
            role: 'ERP Admin',
            department: 'IT',
            avatar: 'KA',
            status: 'active',
            token_version: 1
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => { released = true; }
    });

    const mockReq = {
      params: { id: '20' },
      body: { role: 'Chairman & CEO' },
      user: { id: 20, role: 'ERP Admin', name: 'Kamran Ali' },
      trustedUser: { id: 20, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await userController.updateUser(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Self-role escalation must return HTTP 403');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on prohibited self-role change');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.strictEqual(released, true, 'Connection must be released in finally block');
    assert.ok(responseJson?.error?.includes('Administrative users cannot modify their own role'), 'Error message must specify role modification rejection');
  });

  await asyncTest('ST-41: Admin self-display-name change is rejected with HTTP 403 in updateUser', async () => {
    let rolledBack = false;
    let released = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 20,
            name: 'Kamran Ali',
            email: 'kamran@algohub.com',
            role: 'ERP Admin',
            department: 'IT',
            avatar: 'KA',
            status: 'active',
            token_version: 1
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => { released = true; }
    });

    const mockReq = {
      params: { id: '20' },
      body: { name: 'Farhan Ali' },
      user: { id: 20, role: 'ERP Admin', name: 'Kamran Ali' },
      trustedUser: { id: 20, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await userController.updateUser(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Self-display-name change must return HTTP 403');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on prohibited self-name change');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.strictEqual(released, true, 'Connection must be released in finally block');
    assert.ok(responseJson?.error?.includes('Administrative users cannot modify their own display name'), 'Error message must specify display name rejection');
  });

  await asyncTest('ST-42: Admin self-status change is rejected with HTTP 403 in updateUser', async () => {
    let rolledBack = false;
    let released = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 20,
            name: 'Kamran Ali',
            email: 'kamran@algohub.com',
            role: 'ERP Admin',
            department: 'IT',
            avatar: 'KA',
            status: 'active',
            token_version: 1
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => { released = true; }
    });

    const mockReq = {
      params: { id: '20' },
      body: { status: 'suspended' },
      user: { id: 20, role: 'ERP Admin', name: 'Kamran Ali' },
      trustedUser: { id: 20, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await userController.updateUser(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Self-status change must return HTTP 403 in updateUser');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on prohibited self-status change');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.strictEqual(released, true, 'Connection must be released in finally block');
    assert.ok(responseJson?.error?.includes('Administrative users cannot modify their own account status'), 'Error message must specify status rejection');
  });

  await asyncTest('ST-43: Admin self-status change is rejected with HTTP 403 in updateStatus', async () => {
    let rolledBack = false;
    let released = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 20,
            name: 'Kamran Ali',
            email: 'kamran@algohub.com',
            status: 'active',
            token_version: 1
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => { released = true; }
    });

    const mockReq = {
      params: { id: '20' },
      body: { status: 'suspended' },
      user: { id: 20, role: 'ERP Admin', name: 'Kamran Ali' },
      trustedUser: { id: 20, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await userController.updateStatus(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Self-status change must return HTTP 403 in updateStatus');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on prohibited self-status change in updateStatus');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.strictEqual(released, true, 'Connection must be released in finally block');
    assert.ok(responseJson?.error?.includes('Administrative users cannot alter their own account status'), 'Error message must specify status rejection');
  });

  await asyncTest('ST-44: Legitimate update to another user is permitted through updateUser', async () => {
    let rolledBack = false;
    let committed = false;
    let released = false;
    let statusCode = 200;
    let responseJson = null;
    let audited = false;

    userAuditLogger.logAudit = async () => { audited = true; };

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 15,
            name: 'Tariq K.',
            email: 'tariq@algohub.com',
            role: 'Staff',
            department: 'Procurement',
            avatar: 'TK',
            status: 'active',
            token_version: 1
          }]];
        }
        if (sql.includes('UPDATE users SET')) {
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?')) {
          return [[{
            id: 15,
            name: 'Tariq Khan',
            email: 'tariq@algohub.com',
            role: 'Procurement',
            department: 'Procurement',
            avatar: 'TA',
            status: 'active'
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => { released = true; }
    });

    const mockReq = {
      params: { id: '15' },
      body: { name: 'Tariq Khan', role: 'Procurement' },
      user: { id: 20, role: 'ERP Admin', name: 'Kamran Ali' },
      trustedUser: { id: 20, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await userController.updateUser(mockReq, mockRes);

    assert.strictEqual(statusCode, 200, 'Legitimate administrative update to other user must return HTTP 200');
    assert.strictEqual(rolledBack, false, 'Transaction must not be rolled back on legitimate update');
    assert.strictEqual(committed, true, 'Transaction must be committed on legitimate update');
    assert.strictEqual(released, true, 'Connection must be released in finally block');
    assert.strictEqual(audited, true, 'Audit log must be recorded on legitimate update');
    assert.strictEqual(responseJson?.name, 'Tariq Khan');
  });

  await asyncTest('ST-45: Legitimate status update to another user is permitted through updateStatus', async () => {
    let rolledBack = false;
    let committed = false;
    let released = false;
    let statusCode = 200;
    let responseJson = null;
    let audited = false;

    userAuditLogger.logAudit = async () => { audited = true; };

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 15,
            name: 'Tariq Khan',
            email: 'tariq@algohub.com',
            status: 'active',
            token_version: 1
          }]];
        }
        if (sql.includes('UPDATE users SET status = ?')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => { released = true; }
    });

    const mockReq = {
      params: { id: '15' },
      body: { status: 'suspended' },
      user: { id: 20, role: 'ERP Admin', name: 'Kamran Ali' },
      trustedUser: { id: 20, role: 'ERP Admin', name: 'Kamran Ali', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await userController.updateStatus(mockReq, mockRes);

    assert.strictEqual(statusCode, 200, 'Legitimate administrative status update to other user must return HTTP 200');
    assert.strictEqual(rolledBack, false, 'Transaction must not be rolled back on legitimate status update');
    assert.strictEqual(committed, true, 'Transaction must be committed on legitimate status update');
    assert.strictEqual(released, true, 'Connection must be released in finally block');
    assert.strictEqual(audited, true, 'Audit log must be recorded on legitimate status update');
    assert.strictEqual(responseJson?.success, true);

    // Restore originals
    userAuditLogger.logAudit = originalUserLogAudit;
    db.getConnection = originalDbGetConn;
  });

  // ----------------------------------------------------------------------------
  // 8. PHASE D2.30 STABLE-ID APPROVAL AUTHORIZATION & FAIL-CLOSED PO SOD TESTS
  // ----------------------------------------------------------------------------
  const opsController = require('../controllers/operations.controller');

  await asyncTest('ST-46: Matching stable assigned user ID is accepted when all other policy checks pass', async () => {
    let rolledBack = false;
    let committed = false;
    let statusCode = 200;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM workflow_tasks WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 101,
            doc_number: 'WO-2026-0001',
            doc_type: 'Production order',
            amount: 0,
            status: 'pending',
            assigned_role: 'Farhan Ali',
            assigned_user_id: 6
          }]];
        }
        if (sql.includes('FROM production_orders')) {
          return [[{
            id: 1,
            wo_number: 'WO-2026-0001',
            created_by_user_id: 20,
            status: 'in_progress'
          }]];
        }
        if (sql.includes('UPDATE workflow_tasks')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => {}
    });

    const mockReq = {
      params: { id: '101' },
      body: { action: 'approved' },
      headers: {},
      user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
      trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: () => mockRes
    };

    await opsController.actionApproval(mockReq, mockRes);

    assert.strictEqual(statusCode, 200, 'Matching assigned_user_id must grant approval');
    assert.strictEqual(rolledBack, false, 'Transaction must not be rolled back');
    assert.strictEqual(committed, true, 'Transaction must be committed');
  });

  await asyncTest('ST-47: Different user ID is rejected even if caller display name matches legacy assignment string', async () => {
    let rolledBack = false;
    let committed = false;
    let statusCode = 200;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM workflow_tasks WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 102,
            doc_number: 'WO-2026-0001',
            doc_type: 'Production order',
            amount: 0,
            status: 'pending',
            assigned_role: 'Farhan Ali',
            assigned_user_id: 8
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => {}
    });

    const mockReq = {
      params: { id: '102' },
      body: { action: 'approved' },
      headers: {},
      user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
      trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: () => mockRes
    };

    await opsController.actionApproval(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Mismatched assigned_user_id must fail closed even if name matches');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
  });

  await asyncTest('ST-48: NULL individual assignment ID fails closed with HTTP 403 and blocks display-name fallback', async () => {
    let rolledBack = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM workflow_tasks WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 103,
            doc_number: 'WO-2026-0001',
            doc_type: 'Production order',
            amount: 0,
            status: 'pending',
            assigned_role: 'Farhan Ali',
            assigned_user_id: null
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => {}
    });

    const mockReq = {
      params: { id: '103' },
      body: { action: 'approved' },
      headers: {},
      user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
      trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await opsController.actionApproval(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'NULL individual assignment ID must fail closed with HTTP 403');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.ok(
      responseJson?.error?.includes('has an unverified individual assignee identity. Approval is blocked pending assignment migration.'),
      'Must return informative fail-closed message on unverified individual assignment'
    );
  });

  await asyncTest('ST-49: Valid functional-role assignment authorizes caller with matching canonical role', async () => {
    let rolledBack = false;
    let committed = false;
    let statusCode = 200;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM workflow_tasks WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 104,
            doc_number: 'GPI-2026-0001',
            doc_type: 'Gate pass — inward',
            amount: 0,
            status: 'pending',
            assigned_role: 'Director Operations',
            assigned_user_id: null
          }]];
        }
        if (sql.includes('FROM gate_passes')) {
          return [[{
            id: 5,
            pass_number: 'GPI-2026-0001',
            created_by_user_id: 15,
            status: 'At gate'
          }]];
        }
        if (sql.includes('UPDATE workflow_tasks')) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => {}
    });

    const mockReq = {
      params: { id: '104' },
      body: { action: 'approved' },
      headers: {},
      user: { id: 3, name: 'Saeed ur Rehman', role: 'Director Operations' },
      trustedUser: { id: 3, name: 'Saeed ur Rehman', role: 'Director Operations', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: () => mockRes
    };

    await opsController.actionApproval(mockReq, mockRes);

    assert.strictEqual(statusCode, 200, 'Matching functional role must grant approval');
    assert.strictEqual(rolledBack, false, 'Transaction must not be rolled back');
    assert.strictEqual(committed, true, 'Transaction must be committed');
  });

  await asyncTest('ST-50: getApprovals queries assigned_user_id and omits display-name matching', async () => {
    let executedSql = '';
    let executedParams = null;

    db.query = async (sql, params) => {
      executedSql = sql;
      executedParams = params;
      return [[]];
    };

    const mockReq = {
      user: { id: 6, name: 'Farhan Ali', role: 'Production Manager' },
      trustedUser: { id: 6, name: 'Farhan Ali', role: 'Production Manager', status: 'active' }
    };
    const mockRes = {
      status: () => mockRes,
      json: () => mockRes
    };

    await opsController.getApprovals(mockReq, mockRes);

    assert.ok(executedSql.includes('assigned_user_id = ?'), 'getApprovals query must filter by assigned_user_id = ?');
    assert.ok(executedSql.includes('LOWER(assigned_role) = LOWER(?)'), 'getApprovals query must filter by LOWER(assigned_role) = LOWER(?)');
    assert.strictEqual(
      executedParams.includes('Farhan Ali'),
      false,
      'getApprovals query must not pass user display name as query parameter'
    );
    assert.strictEqual(executedParams[0], 6, 'First query parameter must be caller user ID');
    assert.strictEqual(executedParams[1], 'Production Manager', 'Second query parameter must be caller role');
  });

  await asyncTest('ST-51: getChairmanDashboard queries assigned_user_id and omits display-name matching', async () => {
    let taskSql = '';
    let taskParams = null;

    db.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('FROM workflow_tasks')) {
        taskSql = sql;
        taskParams = params;
        return [[]];
      }
      return [[{ count: 0 }]];
    };

    const mockReq = {
      user: { id: 3, name: 'Saeed ur Rehman', role: 'Director Operations' },
      trustedUser: { id: 3, name: 'Saeed ur Rehman', role: 'Director Operations', status: 'active' }
    };
    const mockRes = {
      status: () => mockRes,
      json: () => mockRes
    };

    await opsController.getChairmanDashboard(mockReq, mockRes);

    assert.ok(taskSql.includes('assigned_user_id = ?'), 'Dashboard query must filter by assigned_user_id = ?');
    assert.ok(taskSql.includes('LOWER(assigned_role) = LOWER(?)'), 'Dashboard query must filter by LOWER(assigned_role) = LOWER(?)');
    assert.strictEqual(
      taskParams.includes('Saeed ur Rehman'),
      false,
      'Dashboard query must not pass user display name as query parameter'
    );
    assert.strictEqual(taskParams[0], 3, 'First query parameter must be caller user ID');
    assert.strictEqual(taskParams[1], 'Director Operations', 'Second query parameter must be caller role');
  });

  await asyncTest('ST-52: PO with malformed/negative created_by_user_id is rejected with HTTP 403 and rolls back', async () => {
    let rolledBack = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM workflow_tasks WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 105,
            doc_number: 'PO-2026-0002',
            doc_type: 'Purchase order',
            amount: 100000,
            status: 'pending',
            assigned_role: 'Director Finance',
            assigned_user_id: null
          }]];
        }
        if (sql.includes('FROM purchase_orders')) {
          return [[{
            id: 2,
            po_number: 'PO-2026-0002',
            amount: 100000,
            created_by_user_id: -1,
            created_by: 'Invalid User',
            status: 'Draft'
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => {}
    });

    const mockReq = {
      params: { id: '105' },
      body: { action: 'approved' },
      user: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance' },
      trustedUser: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await opsController.actionApproval(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Malformed created_by_user_id must fail closed with HTTP 403');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.ok(
      responseJson?.error?.includes('Creator identity is unverified on purchase order'),
      'Must report unverified creator on PO'
    );
  });

  await asyncTest('ST-53: PO creator cannot approve their own PO (self-approval rejected with HTTP 403 and rollback)', async () => {
    let rolledBack = false;
    let committed = false;
    let statusCode = 200;
    let responseJson = null;

    db.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (sql.includes('FROM workflow_tasks WHERE id = ? FOR UPDATE')) {
          return [[{
            id: 106,
            doc_number: 'PO-2026-0003',
            doc_type: 'Purchase order',
            amount: 100000,
            status: 'pending',
            assigned_role: 'Director Finance',
            assigned_user_id: null
          }]];
        }
        if (sql.includes('FROM purchase_orders')) {
          return [[{
            id: 3,
            po_number: 'PO-2026-0003',
            amount: 100000,
            created_by_user_id: 4,
            created_by: 'Mujeeb Ullah',
            status: 'Draft'
          }]];
        }
        return [[]];
      },
      rollback: async () => { rolledBack = true; },
      commit: async () => { committed = true; },
      release: () => {}
    });

    const mockReq = {
      params: { id: '106' },
      body: { action: 'approved' },
      user: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance' },
      trustedUser: { id: 4, name: 'Mujeeb Ullah', role: 'Director Finance', status: 'active' }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseJson = data; return mockRes; }
    };

    await opsController.actionApproval(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'PO creator self-approval must return HTTP 403');
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back');
    assert.strictEqual(committed, false, 'Transaction must not be committed');
    assert.ok(
      responseJson?.error?.includes('Separation of duties violation: Document creator cannot approve their own purchase order'),
      'Must return PO SOD violation error message'
    );
  });

  test('ST-54: workflow_tasks table schema in initDb.js defines assigned_user_id INT NULL and index idx_wt_assigned_user', () => {
    assert.ok(
      initDbSource.includes('assigned_user_id INT NULL'),
      'initDb.js workflow_tasks schema must define assigned_user_id INT NULL'
    );
    assert.ok(
      initDbSource.includes('INDEX idx_wt_assigned_user (assigned_user_id)'),
      'initDb.js workflow_tasks schema must define index idx_wt_assigned_user'
    );
  });

  test('ST-55: runSec03Migrations in initDb.js includes idempotent migration for workflow_tasks.assigned_user_id and index', () => {
    assert.ok(
      initDbSource.includes("TABLE_NAME = 'workflow_tasks'") &&
      initDbSource.includes("COLUMN_NAME = 'assigned_user_id'") &&
      initDbSource.includes("ALTER TABLE workflow_tasks ADD COLUMN assigned_user_id INT NULL AFTER assigned_role") &&
      initDbSource.includes("ALTER TABLE workflow_tasks ADD INDEX idx_wt_assigned_user (assigned_user_id)"),
      'runSec03Migrations must idempotently add assigned_user_id and index to workflow_tasks'
    );
  });

  test('ST-56: Demo seed tasks in initDb.js assign canonical functional roles and populate assigned_user_id', () => {
    assert.ok(
      initDbSource.includes("'Production Manager', 6") ||
      initDbSource.includes("'Plant Manager', 5") ||
      initDbSource.includes("'QC Cell', 9"),
      'seedDemoData in initDb.js must map canonical roles and integer assigned_user_id'
    );
  });

  test('ST-57: SEC-03 specification documents Phase D2.30 stable-ID authorization and fail-closed PO SOD', () => {
    assert.ok(
      sec03DocSource.includes('12. Phase D2.30 Stable-ID Approval Authorization & Fail-Closed PO SOD Architecture'),
      'docs/workflow-approvals-sec03.md must document Phase D2.30 section'
    );
    assert.ok(
      sec03DocSource.includes('workflow_tasks.assigned_user_id'),
      'docs/workflow-approvals-sec03.md must document assigned_user_id'
    );
    assert.ok(
      sec03DocSource.includes('Fail-Closed Verification') &&
      sec03DocSource.includes('Creator identity is unverified on purchase order'),
      'docs/workflow-approvals-sec03.md must document fail-closed PO SOD verification'
    );
  });
  console.log('====================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
})();
