const crypto = require('node:crypto');
const { db } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { logAudit } = auditLogger;
const { getNextDocNumber } = require('../utils/sequence');
const { getTrustedUser } = require('../middlewares/auth');

const VALID_ERP_ROLES = [
  'Chairman & CEO',
  'General Manager',
  'Director Operations',
  'Director Finance',
  'Plant Manager',
  'Production Manager',
  'Breaking Supervisor',
  'Gate Officer',
  'QC Cell',
  'Raw Material Store',
  'Finish Store & Delivery',
  'Procurement',
  'Sales Manager',
  'Sales Officer',
  'Head of Marketing',
  'Social Media & Content',
  'Accounts Officer',
  'HR Manager',
  'Poultry Farms',
  'ERP Admin',
  'Staff'
];

/**
 * 1. Chairman's Executive Dashboard
 */
const getChairmanDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const trustedUser = req.trustedUser || (userId ? await getTrustedUser(userId) : null);
    const userRole = (typeof trustedUser?.role === 'string') ? trustedUser.role.trim() : (req.user?.role || '');
    const userName = (typeof trustedUser?.name === 'string') ? trustedUser.name.trim() : (req.user?.name || '');
    const callerId = Number(trustedUser?.id || req.user?.id);
    const validCallerId = Number.isInteger(callerId) && callerId > 0 ? callerId : -1;

    // DEC-02: A & DEC-06: A: Least-privilege visibility for pending workflow approvals
    let tasks = [];
    if (userRole === 'ERP Admin') {
      // ERP Admin is barred from operational & financial approvals; receive empty waitingApprovals (F3 remediation)
      tasks = [];
    } else if (userRole === 'Chairman & CEO' || userRole === 'General Manager') {
      const [allPending] = await db.query(
        'SELECT * FROM workflow_tasks WHERE status = "pending" ORDER BY id ASC LIMIT 6'
      );
      tasks = allPending;
    } else if (userRole === 'Director Operations') {
      const [opsPending] = await db.query(
        `SELECT * FROM workflow_tasks
         WHERE status = "pending"
           AND (doc_type IN ('Production order', 'Gate pass — inward', 'Goods receipt (GRN)', 'Raw material requirement')
                OR assigned_user_id = ?
                OR LOWER(assigned_role) = LOWER(?))
         ORDER BY id ASC LIMIT 6`,
        [validCallerId, userRole]
      );
      tasks = opsPending;
    } else if (userRole === 'Director Finance') {
      const [finPending] = await db.query(
        `SELECT * FROM workflow_tasks
         WHERE status = "pending"
           AND (doc_type = 'Purchase order'
                OR assigned_user_id = ?
                OR LOWER(assigned_role) = LOWER(?))
         ORDER BY id ASC LIMIT 6`,
        [validCallerId, userRole]
      );
      tasks = finPending;
    } else {
      tasks = [];
    }

    const [inventoryCount] = await db.query('SELECT COUNT(*) as count FROM inventory_items WHERE status = "Reorder"');
    const [totalOrders] = await db.query('SELECT COUNT(*) as count FROM purchase_orders');

    res.json({
      kpis: {
        revenue: 'PKR 50.3M',
        revenueTargetChange: '+10.1%',
        revenueTargetText: '99% of target',
        grossMargin: '21.9%',
        marginChange: '▼0.1 pts vs last month',
        cashAndBank: 'PKR 29.4M',
        cashAccounts: '4 accounts',
        receivables: 'PKR 45.7M',
        receivablesOverdue: 'PKR 3.2M over 30 days',
        eggsSold: '572K',
        eggsSoldTrays: '19,077 trays',
        eggsSoldChange: '+28.8%'
      },
      revenueChart: [
        { month: 'Oct', actual: 44, target: 46 },
        { month: 'Nov', actual: 48, target: 49 },
        { month: 'Dec', actual: 52, target: 51 },
        { month: 'Jan', actual: 55, target: 53 },
        { month: 'Feb', actual: 45, target: 47 },
        { month: 'Mar', actual: 42, target: 44 },
        { month: 'Apr', actual: 46, target: 45 },
        { month: 'May', actual: 49, target: 48 },
        { month: 'Jun', actual: 51, target: 50 },
        { month: 'Jul', actual: 54, target: 52 },
        { month: 'Aug', actual: 53, target: 51 },
        { month: 'Sep', actual: 50.3, target: 50.8 }
      ],
      waitingApprovals: tasks,
      receivablesAging: {
        total: 'PKR 45,660,034',
        current: '31.0M',
        d1_30: '11.4M',
        d31_60: '3.2M',
        d61_90: '0.0M'
      },
      budgetVsActual: [
        { dept: 'Poultry Farms', actual: '28.3M', budget: '31.1M', pct: 91 },
        { dept: 'HR & Administration', actual: '3.8M', budget: '4.2M', pct: 90 },
        { dept: 'Procurement & Supply Chain', actual: '74.1M', budget: '90.3M', pct: 82 }
      ],
      exceptions: [
        { title: 'Credit limit exceeded', desc: 'Swat Valley Egg Dealers · SO-2026-0418 on hold', type: 'danger' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 2. Approvals & Tasks Inbox
 * Enforces least-privilege inbox visibility and atomic, transaction-safe workflow task decisions (SEC-03).
 */
const getApprovals = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Access denied: Authentication required.' });
  }

  try {
    const trustedUser = req.trustedUser || (await getTrustedUser(userId));
    if (!trustedUser || trustedUser.status !== 'active') {
      return res.status(403).json({ error: 'Access denied: User account is inactive or not found.' });
    }

    const userRole = (typeof trustedUser.role === 'string') ? trustedUser.role.trim() : '';
    const userName = (typeof trustedUser.name === 'string') ? trustedUser.name.trim() : '';
    const callerId = Number(trustedUser.id);
    const validCallerId = Number.isInteger(callerId) && callerId > 0 ? callerId : -1;

    // DEC-02: A: ERP Admin is barred from operational & financial approvals; receive empty inbox
    if (userRole === 'ERP Admin') {
      return res.json([]);
    }

    // DEC-06: A: Least-privilege approval-inbox visibility
    // 1. Enterprise-wide Executive Oversight: Chairman & CEO and General Manager see all tasks
    if (userRole === 'Chairman & CEO' || userRole === 'General Manager') {
      const [tasks] = await db.query('SELECT * FROM workflow_tasks ORDER BY id ASC');
      return res.json(tasks);
    }

    // 2. Departmental Executive Oversight
    if (userRole === 'Director Operations') {
      const [tasks] = await db.query(
        `SELECT * FROM workflow_tasks
         WHERE doc_type IN ('Production order', 'Gate pass — inward', 'Goods receipt (GRN)', 'Raw material requirement')
            OR assigned_user_id = ?
            OR LOWER(assigned_role) = LOWER(?)
         ORDER BY id ASC`,
        [validCallerId, userRole]
      );
      return res.json(tasks);
    }

    if (userRole === 'Director Finance') {
      const [tasks] = await db.query(
        `SELECT * FROM workflow_tasks
         WHERE doc_type = 'Purchase order'
            OR assigned_user_id = ?
            OR LOWER(assigned_role) = LOWER(?)
         ORDER BY id ASC`,
        [validCallerId, userRole]
      );
      return res.json(tasks);
    }

    if (userRole === 'HR Manager') {
      const [tasks] = await db.query(
        `SELECT * FROM workflow_tasks
         WHERE doc_type = 'Payroll run'
            OR assigned_user_id = ?
            OR LOWER(assigned_role) = LOWER(?)
         ORDER BY id ASC`,
        [validCallerId, userRole]
      );
      return res.json(tasks);
    }

    // 3. Operational Assignees (Plant Manager, Production Manager, QC Cell, Raw Material Store, Procurement, Sales Manager, etc.)
    // Only see tasks explicitly assigned to their exact stable user ID or exact canonical role
    const [tasks] = await db.query(
      `SELECT * FROM workflow_tasks
       WHERE assigned_user_id = ?
          OR LOWER(assigned_role) = LOWER(?)
       ORDER BY id ASC`,
      [validCallerId, userRole]
    );

    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve workflow tasks' });
  }
};

const CANONICAL_DOC_TYPES = {
  PURCHASE_ORDER: 'purchase_order',
  GATE_PASS: 'gate_pass',
  PRODUCTION_ORDER: 'production_order',
  GOODS_RECEIPT: 'goods_receipt',
  RAW_MATERIAL_REQUIREMENT: 'raw_material_requirement',
  PAYROLL_RUN: 'payroll_run',
  UNKNOWN: 'unknown'
};

/**
 * Normalizes document type strings from workflow_tasks into canonical identifiers.
 * Trims leading/trailing whitespace, normalizes case, normalizes Unicode dash variants
 * (em dash \u2014, en dash \u2013, horizontal bar \u2015, figure dash \u2012) to standard ASCII hyphen (-),
 * and maps known aliases strictly to canonical types without broad substring matching.
 */
function normalizeWorkflowDocType(rawDocType) {
  if (typeof rawDocType !== 'string') return CANONICAL_DOC_TYPES.UNKNOWN;
  let s = rawDocType.trim().toLowerCase();
  if (!s) return CANONICAL_DOC_TYPES.UNKNOWN;

  // Normalize Unicode dashes to standard ASCII hyphen
  s = s.replace(/[\u2012\u2013\u2014\u2015]/g, '-');
  // Condense internal whitespace runs
  s = s.replace(/\s+/g, ' ');

  // Exact alias matching against supported document types (no loose substring matching)
  if (s === 'purchase order' || s === 'po') {
    return CANONICAL_DOC_TYPES.PURCHASE_ORDER;
  }
  if (
    s === 'gate pass - inward' ||
    s === 'gate pass inward' ||
    s === 'gate pass - outward' ||
    s === 'gate pass outward' ||
    s === 'gate pass' ||
    s === 'gpi'
  ) {
    return CANONICAL_DOC_TYPES.GATE_PASS;
  }
  if (s === 'production order' || s === 'work order' || s === 'wo') {
    return CANONICAL_DOC_TYPES.PRODUCTION_ORDER;
  }
  if (s === 'goods receipt (grn)' || s === 'goods receipt grn' || s === 'goods receipt' || s === 'grn') {
    return CANONICAL_DOC_TYPES.GOODS_RECEIPT;
  }
  if (s === 'raw material requirement' || s === 'raw material' || s === 'rmr') {
    return CANONICAL_DOC_TYPES.RAW_MATERIAL_REQUIREMENT;
  }
  if (s === 'payroll run' || s === 'payroll') {
    return CANONICAL_DOC_TYPES.PAYROLL_RUN;
  }

  return CANONICAL_DOC_TYPES.UNKNOWN;
}

const actionApproval = async (req, res) => {
  const { id } = req.params;
  const taskId = Number(id);
  if (!id || isNaN(taskId) || !Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ error: 'Valid positive integer task ID is required' });
  }

  const { action, reason } = req.body;
  if (typeof action !== 'string' || !action.trim()) {
    return res.status(400).json({ error: 'Valid action is required' });
  }

  const validActions = ['approved', 'rejected', 'returned', 'completed'];
  const normalizedAction = action.trim().toLowerCase();
  if (!validActions.includes(normalizedAction)) {
    return res.status(400).json({
      error: `Invalid action "${action}". Allowed actions: ${validActions.join(', ')}`
    });
  }

  // Enforce mandatory non-empty reason for rejected and returned actions (DEC-07, Finding SEC-03.07)
  let cleanReason = null;
  if (normalizedAction === 'rejected' || normalizedAction === 'returned') {
    if (typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        error: `A non-empty reason is mandatory for "${normalizedAction}" action.`
      });
    }
    cleanReason = reason.trim();
  } else if (typeof reason === 'string' && reason.trim()) {
    cleanReason = reason.trim();
  }

  // Authenticated identity verification (fail-closed against DB record)
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Access denied: Authentication required.' });
  }

  let connection = null;
  try {
    const trustedUser = req.trustedUser || (await getTrustedUser(userId));
    if (!trustedUser || trustedUser.status !== 'active') {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Account is inactive or does not exist.'
      });
    }

    const callerId = Number(trustedUser.id);
    if (!Number.isInteger(callerId) || callerId <= 0) {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Invalid user ID.'
      });
    }

    const userName = (typeof trustedUser.name === 'string') ? trustedUser.name.trim() : '';
    const userRole = (typeof trustedUser.role === 'string') ? trustedUser.role.trim() : '';
    if (!userName || !userRole) {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Incomplete user profile.'
      });
    }

    // DEC-02: A: ERP Admin is barred from operational and financial workflow approvals
    if (userRole === 'ERP Admin') {
      return res.status(403).json({
        error: 'Access Denied: ERP Admin is barred from operational and financial workflow approvals.'
      });
    }

    // Acquire dedicated connection and begin atomic transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lock the task row with FOR UPDATE
    const [taskRows] = await connection.query(
      `SELECT * FROM workflow_tasks WHERE id = ? FOR UPDATE`,
      [taskId]
    );

    if (taskRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Workflow task #${taskId} not found.` });
    }

    const task = taskRows[0];

    // State transition guard: Only pending tasks can receive a decision
    if (typeof task.status !== 'string' || task.status.trim().toLowerCase() !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        error: `Cannot ${normalizedAction} task #${taskId}: task is already in "${task.status}" status. Only pending tasks can receive a decision.`
      });
    }

    const assignedTarget = (typeof task.assigned_role === 'string') ? task.assigned_role.trim() : '';
    const rawAssignedUserId = task.assigned_user_id != null ? Number(task.assigned_user_id) : null;
    const hasValidAssignedUserId = rawAssignedUserId != null && Number.isInteger(rawAssignedUserId) && rawAssignedUserId > 0;

    // Check whether assigned_role represents a canonical ERP functional role
    const isCanonicalRole = VALID_ERP_ROLES.some(r => r.toLowerCase() === assignedTarget.toLowerCase());

    // Strict individual assignment requirement (Phase D2.30):
    // If a task is not assigned to a canonical functional role, it represents an individual task.
    // Individual tasks MUST have a verified, non-null assigned_user_id; display-name fallback is strictly prohibited.
    if (!isCanonicalRole && !hasValidAssignedUserId) {
      await connection.rollback();
      return res.status(403).json({
        error: `Access Denied: Task #${taskId} has an unverified individual assignee identity. Approval is blocked pending assignment migration.`
      });
    }

    const isUserMatch = hasValidAssignedUserId && rawAssignedUserId === callerId;
    const isRoleMatch = isCanonicalRole && assignedTarget.toLowerCase() === userRole.toLowerCase();
    const isCEO = userRole.toLowerCase() === 'chairman & ceo';
    const isGM = userRole.toLowerCase() === 'general manager';

    // Domain / Departmental Head check
    const canonicalDocType = normalizeWorkflowDocType(task.doc_type);
    const isOperationsDomain = [
      CANONICAL_DOC_TYPES.GATE_PASS,
      CANONICAL_DOC_TYPES.PRODUCTION_ORDER,
      CANONICAL_DOC_TYPES.GOODS_RECEIPT,
      CANONICAL_DOC_TYPES.RAW_MATERIAL_REQUIREMENT
    ].includes(canonicalDocType);
    const isFinanceDomain = canonicalDocType === CANONICAL_DOC_TYPES.PURCHASE_ORDER;
    const isHRDomain = canonicalDocType === CANONICAL_DOC_TYPES.PAYROLL_RUN;

    const isAuthorizedDeptHead =
      (userRole === 'Director Operations' && isOperationsDomain) ||
      (userRole === 'Director Finance' && isFinanceDomain) ||
      (userRole === 'HR Manager' && isHRDomain);

    // Initial authorization check: caller must match stable user ID, assigned functional role, departmental head, or executive override (CEO/GM)
    const isAssigneeAuthorized = isUserMatch || isRoleMatch || isAuthorizedDeptHead || isCEO || isGM;
    if (!isAssigneeAuthorized) {
      await connection.rollback();
      return res.status(403).json({
        error: `Access Denied: Task #${taskId} is assigned to ${hasValidAssignedUserId ? `user #${rawAssignedUserId}` : `"${assignedTarget || 'Unassigned'}"`}. Current user #${callerId} (${userRole}) is not authorized to act on this task.`
      });
    }

    let authoritativeAmount = Number(task.amount) || 0;
    let sodStatus = 'NOT_APPLICABLE';

    // Specific rules for Purchase Orders (Monetary delegation DEC-04: A, CEO-exclusive Band 3 DEC-01: B, SOD DEC-05: A & D2.21 & D2.30)
    if (isFinanceDomain) {
      const [poRows] = await connection.query(
        `SELECT * FROM purchase_orders WHERE po_number = ? FOR UPDATE`,
        [task.doc_number]
      );

      if (poRows.length === 0) {
        // Document reference missing: fail-closed for financial approvals
        await connection.rollback();
        return res.status(403).json({
          error: `Access Denied: Underlying purchase order record "${task.doc_number}" not found in trusted store.`
        });
      }

      const poRecord = poRows[0];
      const parsedPoAmount = Number(poRecord.amount);
      if (isNaN(parsedPoAmount) || parsedPoAmount < 0) {
        await connection.rollback();
        return res.status(403).json({
          error: `Access Denied: Underlying purchase order "${task.doc_number}" contains invalid amount.`
        });
      }
      authoritativeAmount = parsedPoAmount;

      // DEC-05: A & Phase D2.30: Purchase-order SOD must fail closed
      const rawPoCreatorId = poRecord.created_by_user_id != null ? Number(poRecord.created_by_user_id) : null;
      const isVerifiedPoCreator = rawPoCreatorId != null && Number.isInteger(rawPoCreatorId) && rawPoCreatorId > 0;

      if (!isVerifiedPoCreator) {
        await connection.rollback();
        return res.status(403).json({
          error: `Access Denied: Creator identity is unverified on purchase order "${task.doc_number}". Approval is blocked pending an approved resolution process.`
        });
      }

      if (rawPoCreatorId === callerId || Number(poRecord.created_by_user_id) === Number(trustedUser.id)) {
        await connection.rollback();
        return res.status(403).json({
          error: 'Separation of duties violation: Document creator cannot approve their own purchase order.'
        });
      }

      sodStatus = 'VERIFIED_INDEPENDENT';

      // Monetary Delegation of Authority (DEC-04: A & DEC-01: B)
      // Only applies to positive transitions (approved / completed)
      if (normalizedAction === 'approved' || normalizedAction === 'completed') {
        if (authoritativeAmount > 2500000) {
          // Band 3 (> PKR 2,500,000): Strictly Chairman & CEO exclusively (GM override barred by DEC-01: B)
          if (!isCEO) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Purchase order ${task.doc_number} (PKR ${authoritativeAmount.toLocaleString()}) exceeds PKR 2,500,000 and requires Chairman & CEO authorization exclusively.`
            });
          }
        } else if (authoritativeAmount > 500000) {
          // Band 2 (PKR 500,001 to 2,500,000): Authorized: GM, Director Finance, CEO, or assigned Department Head
          const isBand2Authorized = isCEO || isGM || userRole === 'Director Finance' || (isUserMatch && isAuthorizedDeptHead);
          if (!isBand2Authorized) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Purchase order ${task.doc_number} (PKR ${authoritativeAmount.toLocaleString()}) requires Director Finance, General Manager, or CEO authorization.`
            });
          }
        } else {
          // Band 1 (Up to PKR 500,000): Authorized: assigned recipient, Director Finance, GM, CEO
          const isBand1Authorized = isCEO || isGM || userRole === 'Director Finance' || isUserMatch || isRoleMatch;
          if (!isBand1Authorized) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Current user role "${userRole}" is not authorized for Band 1 purchase order approvals.`
            });
          }
        }
      }

      // Keep underlying purchase_orders.status synchronized
      if (normalizedAction === 'approved') {
        await connection.query('UPDATE purchase_orders SET status = "Approved" WHERE po_number = ?', [task.doc_number]);
      } else if (normalizedAction === 'rejected') {
        await connection.query('UPDATE purchase_orders SET status = "Rejected" WHERE po_number = ?', [task.doc_number]);
      } else if (normalizedAction === 'returned') {
        await connection.query('UPDATE purchase_orders SET status = "Returned" WHERE po_number = ?', [task.doc_number]);
      }
    } else {
      // Non-financial operational workflows (Gate pass, Production order, GRN, RMR)
      // Enforce DEC-01: B: GM operational override permitted.
      // Fix F-03: Strict creator/approver separation with fail-closed enforcement for unverified or missing records.
      if (canonicalDocType === CANONICAL_DOC_TYPES.GATE_PASS) {
        const [gpRows] = await connection.query(
          `SELECT * FROM gate_passes WHERE pass_number = ? FOR UPDATE`,
          [task.doc_number]
        );
        if (gpRows.length === 0) {
          await connection.rollback();
          return res.status(403).json({
            error: `Access Denied: Underlying gate pass record "${task.doc_number}" not found in trusted store.`
          });
        }
        const gpRecord = gpRows[0];
        if (gpRecord.created_by_user_id == null) {
          await connection.rollback();
          return res.status(403).json({
            error: `Access Denied: Creator identity is unverified on gate pass "${task.doc_number}". Approval is blocked pending an approved resolution process.`
          });
        }
        if (Number(gpRecord.created_by_user_id) === Number(trustedUser.id)) {
          await connection.rollback();
          return res.status(403).json({
            error: `Separation of duties violation: Gate pass creator cannot approve their own gate pass.`
          });
        }
        sodStatus = 'VERIFIED_INDEPENDENT';
      } else if (canonicalDocType === CANONICAL_DOC_TYPES.PRODUCTION_ORDER) {
        const [prodRows] = await connection.query(
          `SELECT * FROM production_orders WHERE wo_number = ? FOR UPDATE`,
          [task.doc_number]
        );
        if (prodRows.length === 0) {
          await connection.rollback();
          return res.status(403).json({
            error: `Access Denied: Underlying production order record "${task.doc_number}" not found in trusted store.`
          });
        }
        const prodRecord = prodRows[0];
        if (prodRecord.created_by_user_id == null) {
          await connection.rollback();
          return res.status(403).json({
            error: `Access Denied: Creator identity is unverified on production order "${task.doc_number}". Approval is blocked pending an approved resolution process.`
          });
        }
        if (Number(prodRecord.created_by_user_id) === Number(trustedUser.id)) {
          await connection.rollback();
          return res.status(403).json({
            error: `Separation of duties violation: Production order creator cannot approve their own work order.`
          });
        }
        sodStatus = 'VERIFIED_INDEPENDENT';
      } else if (canonicalDocType === CANONICAL_DOC_TYPES.GOODS_RECEIPT) {
        try {
          const [grnRows] = await connection.query(
            `SELECT * FROM goods_receipts WHERE grn_number = ? FOR UPDATE`,
            [task.doc_number]
          );
          if (grnRows.length === 0) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Underlying goods receipt record "${task.doc_number}" not found in trusted store.`
            });
          }
          const grnRecord = grnRows[0];
          if (grnRecord.created_by_user_id != null && trustedUser.id != null) {
            if (Number(grnRecord.created_by_user_id) === Number(trustedUser.id)) {
              await connection.rollback();
              return res.status(403).json({
                error: `Separation of duties violation: Goods receipt creator cannot approve their own goods receipt.`
              });
            }
            sodStatus = 'VERIFIED_INDEPENDENT';
          } else {
            sodStatus = 'CREATOR_UNRECORDED';
          }
        } catch (tableErr) {
          // If table does not exist in unmigrated database, fail closed for GRN approval
          if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.message?.includes("doesn't exist")) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Goods receipt schema not migrated in trusted store. Approvals are blocked pending database migration.`
            });
          }
          throw tableErr;
        }
      } else if (canonicalDocType === CANONICAL_DOC_TYPES.RAW_MATERIAL_REQUIREMENT) {
        try {
          const [rmrRows] = await connection.query(
            `SELECT * FROM raw_material_requirements WHERE rmr_number = ? FOR UPDATE`,
            [task.doc_number]
          );
          if (rmrRows.length === 0) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Underlying raw material requirement record "${task.doc_number}" not found in trusted store.`
            });
          }
          const rmrRecord = rmrRows[0];
          if (rmrRecord.created_by_user_id != null && trustedUser.id != null) {
            if (Number(rmrRecord.created_by_user_id) === Number(trustedUser.id)) {
              await connection.rollback();
              return res.status(403).json({
                error: `Separation of duties violation: Raw material requirement creator cannot approve their own requisition.`
              });
            }
            sodStatus = 'VERIFIED_INDEPENDENT';
          } else {
            sodStatus = 'CREATOR_UNRECORDED';
          }
        } catch (tableErr) {
          // If table does not exist in unmigrated database, fail closed for RMR approval
          if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.message?.includes("doesn't exist")) {
            await connection.rollback();
            return res.status(403).json({
              error: `Access Denied: Raw material requirement schema not migrated in trusted store. Approvals are blocked pending database migration.`
            });
          }
          throw tableErr;
        }
      } else {
        // Any recognized operational task type without a fully implemented, explicitly supported document handler,
        // or unsupported/unknown document type fails closed. It must not reach a generic approval fallback.
        await connection.rollback();
        return res.status(403).json({
          error: `Access Denied: Document type "${task.doc_type || 'Unknown'}" is not supported for workflow approval decisions. Approval is blocked pending an approved resolution process.`
        });
      }
    }

    // Execute state mutation in workflow_tasks
    await connection.query(
      'UPDATE workflow_tasks SET status = ? WHERE id = ?',
      [normalizedAction, taskId]
    );

    // Prepare structured audit details
    const auditDetails = {
      task_id: taskId,
      doc_number: task.doc_number,
      doc_type: task.doc_type,
      previous_status: task.status,
      new_status: normalizedAction,
      amount: authoritativeAmount,
      assigned_role: assignedTarget,
      reason: cleanReason,
      actor: { id: trustedUser.id, name: userName, role: userRole },
      sod_status: sodStatus
    };

    // Atomic audit log insertion (re-throws on failure, triggering rollback)
    await auditLogger.logAudit({
      req,
      userId: trustedUser.id,
      userName,
      role: userRole,
      action: `WORKFLOW_${normalizedAction.toUpperCase()}`,
      entityType: 'WORKFLOW',
      entityId: String(taskId),
      details: JSON.stringify(auditDetails),
      connection
    });

    await connection.commit();

    return res.json({
      success: true,
      message: `Workflow task #${taskId} (${task.doc_number}) marked as ${normalizedAction} by ${userName} (${userRole})`,
      task: {
        id: taskId,
        doc_number: task.doc_number,
        status: normalizedAction
      }
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('❌ Transaction rollback failure:', rbErr.message);
      }
    }
    console.error(`❌ actionApproval error for task #${taskId}:`, err.message);
    return res.status(500).json({ error: 'Internal server error processing approval decision' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * 3. Live Operations Control Room
 */
const getLiveOperations = (req, res) => {
  res.json({
    metrics: {
      eggsTraded7Days: '572K',
      gateToStoreTime: '1 h 53 m',
      workInProgress: 'PKR 836K',
      lastBatchYield: '98.6%',
      bottleneck: 'Breaking',
      bottleneckWait: '1 d 14 h waiting'
    },
    receivingFlow: [
      { step: 1, name: 'Suppliers', activeCount: 2, status: 'clear' },
      { step: 2, name: 'Gate in', activeCount: 1, time: '35 min', status: 'active' },
      { step: 3, name: 'QC cell', activeCount: 0, status: 'clear' },
      { step: 4, name: 'Store', activeCount: 1, time: '1 h 35 m', status: 'waiting' },
      { step: 5, name: 'Inventory', activeCount: 0, status: 'clear' },
      { step: 6, name: 'Gate out', activeCount: 0, status: 'clear' }
    ],
    liquidEggFlow: [
      { step: 1, name: 'Sales', count: 1, status: 'done' },
      { step: 2, name: 'GM', count: 1, status: 'done' },
      { step: 3, name: 'Plant', count: 1, time: '5 h', status: 'waiting' },
      { step: 4, name: 'Planning', count: 1, status: 'done' },
      { step: 5, name: 'Raw store', count: 1, status: 'done' },
      { step: 6, name: 'Breaking', count: 1, time: '1 d 14 h', status: 'bottleneck' },
      { step: 7, name: 'Finish store', count: 1, status: 'done' },
      { step: 8, name: 'Dispatch', count: 0, status: 'clear' },
      { step: 9, name: 'Customers', count: 1, status: 'done' }
    ]
  });
};

/**
 * 4. Gate & Security
 */
const getGatePasses = async (req, res) => {
  try {
    const [passes] = await db.query('SELECT * FROM gate_passes ORDER BY id DESC');
    res.json(passes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createGatePass = async (req, res) => {
  const { pass_number, vehicle_number, supplier_customer, pass_type } = req.body;
  const passNo = pass_number || `GPI-2026-000${Math.floor(Math.random() * 90 + 10)}`;
  const officerName = req.user?.name || req.trustedUser?.name || 'Gate Officer';
  const officerRole = req.user?.role || req.trustedUser?.role || 'Security';
  const creatorUserId = req.trustedUser?.id || req.user?.id || null;
  try {
    let result;
    try {
      [result] = await db.query(
        'INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status, created_by_user_id) VALUES (?, ?, ?, ?, "Just now", "At gate — waiting for QC", ?)',
        [passNo, vehicle_number, supplier_customer, pass_type || 'inward', creatorUserId]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_BAD_FIELD_ERROR' || insertErr.message?.includes('Unknown column')) {
        [result] = await db.query(
          'INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, "Just now", "At gate — waiting for QC")',
          [passNo, vehicle_number, supplier_customer, pass_type || 'inward']
        );
      } else {
        throw insertErr;
      }
    }
    await logAudit({
      req,
      userId: creatorUserId,
      userName: officerName,
      role: officerRole,
      action: 'CREATE_GATE_PASS',
      entityType: 'GATE_PASS',
      entityId: passNo,
      details: `${officerRole} (${officerName}) issued ${pass_type || 'inward'} gate pass for vehicle ${vehicle_number} (${supplier_customer || 'General'})`
    });
    res.json({ success: true, id: result.insertId, pass_number: passNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 5. Procurement & Purchase Orders
 */
const getProcurementPOs = async (req, res) => {
  try {
    const [pos] = await db.query('SELECT * FROM purchase_orders ORDER BY id DESC');
    res.json(pos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDocumentDate(d = new Date()) {
  const dateObj = d instanceof Date && !isNaN(d) ? d : new Date();
  return `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

const createProcurementPO = async (req, res) => {
  const { supplier, amount, items_count } = req.body;

  // 1. Validate Supplier
  if (typeof supplier !== 'string' || !supplier.trim()) {
    return res.status(400).json({ error: 'Valid supplier name is required' });
  }
  const cleanSupplier = supplier.trim();

  // 2. Validate Amount
  const numAmount = Number(amount);
  if (
    amount === undefined ||
    amount === null ||
    typeof amount === 'boolean' ||
    isNaN(numAmount) ||
    !Number.isFinite(numAmount) ||
    numAmount <= 0
  ) {
    return res.status(400).json({ error: 'Valid positive purchase order amount is required' });
  }
  const cleanAmount = Math.round(numAmount * 100) / 100;
  if (cleanAmount <= 0) {
    return res.status(400).json({ error: 'Purchase order amount must be greater than zero' });
  }

  // 3. Validate items_count (positive integer >= 1)
  let cleanItemsCount = 1;
  if (items_count !== undefined) {
    if (typeof items_count === 'boolean' || items_count === null) {
      return res.status(400).json({ error: 'items_count must be a positive integer' });
    }
    const parsedCount = Number(items_count);
    if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
      return res.status(400).json({ error: 'items_count must be a positive integer' });
    }
    cleanItemsCount = parsedCount;
  }

  // 4. Authenticated identity attribution (fail-closed if profile incomplete)
  const authenticatedUserId = req.user?.id || req.trustedUser?.id;
  const creatorName = req.trustedUser?.name || req.user?.name;
  const creatorRole = req.trustedUser?.role || req.user?.role;

  if (!creatorName || typeof creatorName !== 'string' || !creatorName.trim()) {
    return res.status(403).json({ error: 'Authenticated user profile is incomplete' });
  }
  const cleanCreator = creatorName.trim();
  const cleanRole = typeof creatorRole === 'string' && creatorRole.trim() ? creatorRole.trim() : 'Procurement';

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const po_number = await getNextDocNumber('purchase_order', 'PO-2026', connection);
    const po_date = formatDocumentDate(new Date());

    try {
      await connection.query(
        `INSERT INTO purchase_orders
         (po_number, po_date, supplier, status, created_by, amount, items_count, created_by_user_id)
         VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?)`,
        [po_number, po_date, cleanSupplier, cleanCreator, cleanAmount, cleanItemsCount, authenticatedUserId]
      );
    } catch (poInsertErr) {
      if (poInsertErr.code === 'ER_BAD_FIELD_ERROR' || poInsertErr.message?.includes('Unknown column')) {
        await connection.query(
          `INSERT INTO purchase_orders
           (po_number, po_date, supplier, status, created_by, amount, items_count)
           VALUES (?, ?, ?, 'Draft', ?, ?, ?)`,
          [po_number, po_date, cleanSupplier, cleanCreator, cleanAmount, cleanItemsCount]
        );
      } else {
        throw poInsertErr;
      }
    }

    await logAudit({
      req,
      userId: authenticatedUserId,
      userName: cleanCreator,
      role: cleanRole,
      action: 'CREATE_PO',
      entityType: 'PURCHASE_ORDER',
      entityId: po_number,
      details: `${cleanRole} (${cleanCreator}) generated purchase order ${po_number} for supplier: ${cleanSupplier} (PKR ${cleanAmount.toLocaleString()})`,
      connection
    });

    await connection.commit();
    res.status(201).json({ success: true, po_number });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('❌ Transaction rollback failure:', rbErr.message);
    }
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/**
 * 6. Production Board & Work Orders
 */
const getProductionBoard = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM production_orders ORDER BY id ASC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const PRODUCTION_STAGES = [
  'With GM',
  'With Plant Manager',
  'With Production Manager',
  'Materials requested',
  'In production',
  'Completed'
];

const moveProduction = async (req, res) => {
  const { id, stage } = req.body;

  // 1. Validate ID
  const orderId = Number(id);
  if (
    id === undefined ||
    id === null ||
    typeof id === 'boolean' ||
    isNaN(orderId) ||
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    return res.status(400).json({ error: 'Valid production order ID is required' });
  }

  // 2. Validate Target Stage
  if (typeof stage !== 'string' || !stage.trim()) {
    return res.status(400).json({ error: 'Valid target production stage is required' });
  }
  const cleanTargetStage = stage.trim();
  const targetIdx = PRODUCTION_STAGES.indexOf(cleanTargetStage);
  if (targetIdx === -1) {
    return res.status(400).json({
      error: `Invalid production stage: "${cleanTargetStage}". Allowed stages: ${PRODUCTION_STAGES.join(', ')}`
    });
  }

  // 3. Concurrency-Safe Transaction with Row Lock
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      'SELECT id, wo_number, stage, status FROM production_orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Production order #${orderId} not found` });
    }

    const order = orders[0];
    const currentStage = order.stage;
    const currentIdx = PRODUCTION_STAGES.indexOf(currentStage);

    if (currentIdx === -1) {
      await connection.rollback();
      return res.status(400).json({
        error: `Current order stage "${currentStage}" is not a recognized production stage`
      });
    }

    // Redundant transition check
    if (currentIdx === targetIdx) {
      await connection.rollback();
      return res.status(400).json({
        error: `Order #${orderId} is already in "${currentStage}" stage. Cannot transition to the same stage.`
      });
    }

    // Permitted transition: strict sequential forward advancement (+1 only)
    if (targetIdx !== currentIdx + 1) {
      await connection.rollback();
      return res.status(400).json({
        error: `Invalid stage transition from "${currentStage}" to "${cleanTargetStage}". Only sequential forward advancement to the immediate next stage is permitted.`
      });
    }

    // Update authoritative stage
    await connection.query(
      'UPDATE production_orders SET stage = ? WHERE id = ?',
      [cleanTargetStage, orderId]
    );

    // Resolve authenticated identity for transactional audit log
    const authenticatedUserId = req.user?.id || req.trustedUser?.id;
    const actorName = req.trustedUser?.name || req.user?.name || 'Staff';
    const actorRole = req.trustedUser?.role || req.user?.role || 'Staff';

    await logAudit({
      req,
      userId: authenticatedUserId,
      userName: actorName,
      role: actorRole,
      action: 'MOVE_PRODUCTION',
      entityType: 'PRODUCTION',
      entityId: orderId,
      details: `${actorRole} (${actorName}) moved production work order #${orderId} (${order.wo_number}) from "${currentStage}" to "${cleanTargetStage}"`,
      connection
    });

    await connection.commit();
    res.json({
      success: true,
      id: orderId,
      wo_number: order.wo_number,
      previousStage: currentStage,
      stage: cleanTargetStage
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('❌ Transaction rollback failure:', rbErr.message);
    }
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/**
 * 7. Sales Orders & Order-to-Cash Lifecycle (Order -> Approval -> Invoice -> Payment)
 */
const APPROVER_ROLES = [
  'Chairman & CEO',
  'General Manager',
  'Director Finance',
  'Sales Manager',
  'ERP Admin'
];

const INVOICE_ROLES = [
  'Accounts Officer',
  'Director Finance',
  'Sales Manager',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

const PAYMENT_ROLES = [
  'Accounts Officer',
  'Director Finance',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

const SALES_CREATE_ROLES = [
  'Sales Officer',
  'Sales Manager',
  'Director Operations',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

// Returns ALL sales orders
const getSalesOrders = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM sales_orders ORDER BY id DESC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Returns single sales order with items, invoice, and payment history
const getSalesOrderDetails = async (req, res) => {
  const so_number = req.params.so_number || req.query.so_number;
  try {
    const [orders] = await db.query('SELECT * FROM sales_orders WHERE so_number = ?', [so_number]);
    if (orders.length === 0) {
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];
    const [items] = await db.query('SELECT * FROM sales_order_items WHERE so_number = ?', [so_number]);
    const [invoices] = await db.query('SELECT * FROM sales_invoices WHERE so_number = ?', [so_number]);
    const [payments] = await db.query('SELECT * FROM sales_payments WHERE so_number = ?', [so_number]);

    res.json({
      ...order,
      items,
      invoice: invoices[0] || null,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Provisional Corporate Customer Credit Directory (derived from ERP dossier specification)
// NOTE FOR EXECUTIVE MANAGEMENT: Formal credit committee sign-off required for updates.
const CORPORATE_CUSTOMER_PROFILES = {
  'Swat Valley Egg Dealers': { credit_limit: 4500000.00, vetted: true },
  'Khyber Confectioners Ltd': { credit_limit: 3000000.00, vetted: true },
  'Charsadda Poultry Services': { credit_limit: 5000000.00, vetted: true },
  'Khyber Feed & Egg Traders': { credit_limit: 2500000.00, vetted: true },
  'Mardan Retail Mart': { credit_limit: 1000000.00, vetted: true },
  'Peek Freans': { credit_limit: 10000000.00, vetted: true },
  'Dawn Foods': { credit_limit: 5000000.00, vetted: true },
  'Barkat Frisian': { credit_limit: 7500000.00, vetted: true },
  'Karachi Egg Wholesalers': { credit_limit: 15000000.00, vetted: true }
};

// Fail-closed default for unvetted dealers: PKR 0.00 (Cash/Advance Only / CEO approval mandatory for any credit)
// Configurable via process.env.ERP_DEFAULT_UNVETTED_CREDIT_LIMIT if management authorizes an introductory credit line.
function getDefaultUnvettedCreditLimit() {
  const envVal = process.env.ERP_DEFAULT_UNVETTED_CREDIT_LIMIT;
  if (envVal !== undefined && !isNaN(Number(envVal))) {
    return Math.max(0, Number(envVal));
  }
  return 0.00; // Fail-closed default
}

function resolveCustomerCreditPolicy(customerName) {
  if (!customerName || typeof customerName !== 'string') {
    return { credit_limit: 0.00, source: 'FAIL_CLOSED_EMPTY', isVetted: false };
  }
  const clean = customerName.trim();
  const normalized = clean.toLowerCase().replace(/\s+/g, ' ');

  for (const [name, profile] of Object.entries(CORPORATE_CUSTOMER_PROFILES)) {
    if (name.toLowerCase().replace(/\s+/g, ' ') === normalized) {
      return {
        credit_limit: Number(profile.credit_limit),
        source: 'CORPORATE_DIRECTORY',
        isVetted: true,
        canonicalName: name
      };
    }
  }

  const defaultLimit = getDefaultUnvettedCreditLimit();
  return {
    credit_limit: defaultLimit,
    source: defaultLimit > 0 ? 'CONFIGURED_DEFAULT_ENV' : 'FAIL_CLOSED_ZERO_UNVETTED',
    isVetted: false,
    canonicalName: clean.replace(/\s+/g, ' ')
  };
}

// Creates a new sales order with authoritative server-side credit validation, per-customer locking, and ACID transaction
const createSalesOrder = async (req, res) => {
  const {
    customer,
    delivery_date,
    warehouse = 'Mardan sales point & store',
    items = []
  } = req.body;

  if (!customer || typeof customer !== 'string' || !customer.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  // 1. Fail-closed Role & Identity verification
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const userRole = (typeof req.user?.role === 'string') ? req.user.role.trim() : '';
  if (!userRole || !SALES_CREATE_ROLES.includes(userRole)) {
    return res.status(403).json({
      error: `Access Denied: Role "${userRole || 'Unassigned'}" is not authorized to create sales orders. Allowed roles: ${SALES_CREATE_ROLES.join(', ')}.`
    });
  }

  const cleanCustomer = customer.trim();
  const normalizedCustomer = cleanCustomer.toLowerCase().replace(/\s+/g, ' ');
  const lockKey = 'yaf_cust_' + crypto.createHash('sha256').update(normalizedCustomer).digest('hex').slice(0, 40);
  const lockTimeout = Number(process.env.ERP_CREDIT_LOCK_TIMEOUT_SECONDS || 10);

  let connection = null;
  let hasLock = false;

  try {
    connection = await db.getConnection();

    // 2. Concurrency Control: Acquire scoped MySQL advisory lock for customer
    // Fails closed if lock cannot be acquired within timeout.
    const [lockRows] = await connection.query(
      'SELECT GET_LOCK(?, ?) as lock_result',
      [lockKey, lockTimeout]
    );
    const lockAcquired = lockRows[0]?.lock_result === 1;
    if (!lockAcquired) {
      return res.status(409).json({
        error: `Unable to acquire credit validation lock for customer "${cleanCustomer}". A concurrent transaction is currently processing; please retry shortly.`
      });
    }
    hasLock = true;

    // Begin ACID transaction on the same dedicated connection
    await connection.beginTransaction();

    // 3. Authoritative Customer Credit Limit (Never inferred from historical sales_orders)
    const creditPolicy = resolveCustomerCreditPolicy(cleanCustomer);
    const credit_limit = creditPolicy.credit_limit;
    const canonicalCustomer = creditPolicy.canonicalName || cleanCustomer.replace(/\s+/g, ' ');

    // 4. Compute Ground-Truth Current Exposure from Database without double-counting liabilities:
    // Dynamic matching matches exact names and internal/external whitespace variations without modifying historical records
    // a) Unpaid commercial invoices
    const [unpaidInvoices] = await connection.query(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0) as unpaid_total 
       FROM sales_invoices 
       WHERE (customer = ? OR TRIM(REGEXP_REPLACE(customer, '[[:space:]]+', ' ')) = ?)
         AND status != 'Paid'`,
      [canonicalCustomer, canonicalCustomer]
    );
    const unpaidInvoiceBalance = Number(unpaidInvoices[0]?.unpaid_total || 0);

    // b) Approved/Pending orders that have NOT yet been converted into invoices
    const [uninvoicedOrders] = await connection.query(
      `SELECT COALESCE(SUM(so.total_amount), 0) as uninvoiced_total
       FROM sales_orders so
       LEFT JOIN sales_invoices si ON so.so_number = si.so_number
       WHERE (so.customer = ? OR TRIM(REGEXP_REPLACE(so.customer, '[[:space:]]+', ' ')) = ?)
         AND so.status IN ('Draft', 'Pending approval', 'Approved')
         AND si.id IS NULL`,
      [canonicalCustomer, canonicalCustomer]
    );
    const uninvoicedOrderBalance = Number(uninvoicedOrders[0]?.uninvoiced_total || 0);

    const priorExposure = unpaidInvoiceBalance + uninvoicedOrderBalance;

    // 5. Compute New Order Total server-side (never trust client line item totals)
    let total_amount = 0;
    const validatedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const qty = Math.max(0, Number(it.quantity) || 0);
        const rate = Math.max(0, Number(it.rate) || 0);
        const disc = Math.min(100, Math.max(0, Number(it.discount_percent) || 0));
        const lineTotal = Math.round(qty * rate * (1 - disc / 100) * 100) / 100;
        total_amount += lineTotal;
        validatedItems.push({
          item_code: it.item_code || 'SE-01-01-02',
          item_name: it.item_name || 'Liquid/Shell Eggs',
          quantity: qty,
          rate,
          discount_percent: disc,
          total_amount: lineTotal
        });
      }
    } else {
      total_amount = Math.max(0, Number(req.body.total_amount) || 0);
    }

    if (total_amount <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Order total amount must be greater than zero' });
    }

    // 6. Server-Side Credit Breach & Status Determination (Strictly ignores any client-supplied status or credit fields)
    const totalExposure = priorExposure + total_amount;
    const creditBreach = totalExposure > credit_limit ? (totalExposure - credit_limit) : 0;
    const status = creditBreach > 0 ? 'Pending approval' : 'Draft';
    const approval_step = creditBreach > 0 ? 'CEO Waiting' : 'Not required';

    const officerName = req.user?.name || req.trustedUser?.name || 'Sales Officer';
    const created_by = `${officerName} (${userRole})`;

    // 7. Concurrency-safe sequence number on same transaction connection
    const so_number = await getNextDocNumber('sales_order', 'SO-2026', connection);
    const order_date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const del_date = delivery_date || order_date;

    // 8. Insert sales order header atomically using canonical customer identity
    await connection.query(
      `INSERT INTO sales_orders 
       (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [so_number, order_date, del_date, canonicalCustomer, warehouse, total_amount, credit_limit, totalExposure, creditBreach, status, approval_step, created_by]
    );

    // 9. Insert line items atomically
    for (const it of validatedItems) {
      await connection.query(
        `INSERT INTO sales_order_items (so_number, item_code, item_name, quantity, rate, discount_percent, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [so_number, it.item_code, it.item_name, it.quantity, it.rate, it.discount_percent, it.total_amount]
      );
    }

    // 10. Write audit record atomically using the transaction connection
    await logAudit({
      req,
      userId: authenticatedUserId,
      userName: officerName,
      role: userRole,
      action: 'CREATE_SALES_ORDER',
      entityType: 'SALES_ORDER',
      entityId: so_number,
      details: `Created sales order ${so_number} for "${canonicalCustomer}" (PKR ${total_amount.toLocaleString()}) [Credit limit: PKR ${credit_limit.toLocaleString()} (${creditPolicy.source}), Exposure: PKR ${totalExposure.toLocaleString()}, Breach: PKR ${creditBreach.toLocaleString()}]`,
      connection
    });

    await connection.commit();

    const [created] = await connection.query('SELECT * FROM sales_orders WHERE so_number = ?', [so_number]);
    res.status(201).json(created[0]);
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error on sales order creation:', rbErr.message);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (hasLock && connection) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?)', [lockKey]);
      } catch (relErr) {
        console.error('Error releasing advisory lock:', relErr.message);
      }
    }
    if (connection) {
      connection.release();
    }
  }
};

// Stage 2: Approve Sales Order (enforces database role check, active status, atomic transaction)
const approveSalesOrder = async (req, res) => {
  const so_number = req.params.so_number || req.body.so_number;
  if (!so_number) {
    return res.status(400).json({ error: 'so_number is required' });
  }

  // 1. Authenticated User Identity Context (client-supplied identity strictly ignored)
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    return res.status(401).json({
      error: 'Authentication failed: Missing or invalid user identity in authentication context.'
    });
  }

  let connection = null;
  try {
    // 2. Fetch current trusted user record from database
    const [userRows] = await db.query(
      'SELECT id, name, role, status FROM users WHERE id = ?',
      [authenticatedUserId]
    );

    if (userRows.length === 0) {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Authenticated user record does not exist.'
      });
    }

    const trustedUser = userRows[0];

    // F-02: Require database account status to be valid, non-empty, exactly 'active'
    const normalizedStatus = (typeof trustedUser.status === 'string') ? trustedUser.status.trim().toLowerCase() : '';
    if (normalizedStatus !== 'active') {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Approver account is not active.'
      });
    }

    // F-01: Check current database role against APPROVER_ROLES (not merely JWT claim)
    const currentDbRole = (typeof trustedUser.role === 'string') ? trustedUser.role.trim() : '';
    if (!currentDbRole || !APPROVER_ROLES.includes(currentDbRole)) {
      return res.status(403).json({
        error: `Access Denied: Current user role "${currentDbRole || 'Unassigned'}" is not authorized to approve sales orders. Allowed roles: ${APPROVER_ROLES.join(', ')}.`
      });
    }

    // Resolve verified name: prioritize trusted database user record, then verified JWT claim
    let approverName = null;
    if (typeof trustedUser.name === 'string' && trustedUser.name.trim() !== '') {
      approverName = trustedUser.name.trim();
    } else if (typeof req.user?.name === 'string' && req.user.name.trim() !== '') {
      approverName = req.user.name.trim();
    }

    // Fail-closed: Never fabricate generic placeholder, never fall back to email
    if (!approverName) {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Approver has no verified name on record.'
      });
    }

    req.user.name = approverName;

    // F-03: Atomic sales order approval and audit logging using dedicated connection & transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Fetch and lock order for update
    const [orders] = await connection.query(
      'SELECT * FROM sales_orders WHERE so_number = ? FOR UPDATE',
      [so_number]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];

    // Status check: must be Pending approval or Draft
    if (order.status !== 'Pending approval' && order.status !== 'Draft') {
      await connection.rollback();
      return res.status(400).json({
        error: `Cannot approve order ${so_number}: order is already in "${order.status}" status. Allowed transition to Approved only from "Pending approval" or "Draft".`
      });
    }

    // Update sales order within transaction
    const approverText = `Approved by ${approverName} (${currentDbRole})`;
    await connection.query(
      'UPDATE sales_orders SET status = "Approved", approval_step = ? WHERE so_number = ?',
      [approverText, so_number]
    );

    // Insert audit log within transaction (fails transaction if audit write fails)
    await auditLogger.logAudit({
      req,
      userId: trustedUser.id,
      userName: approverName,
      role: currentDbRole,
      action: 'APPROVE_SALES_ORDER',
      entityType: 'SALES_ORDER',
      entityId: so_number,
      details: `${currentDbRole} (${approverName}) approved sales order ${so_number}`,
      connection
    });

    await connection.commit();

    const [updated] = await connection.query(
      'SELECT * FROM sales_orders WHERE so_number = ?',
      [so_number]
    );

    res.json({
      success: true,
      message: `Sales order ${so_number} approved successfully by ${currentDbRole}`,
      order: updated[0]
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Error during transaction rollback:', rbErr.message);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Stage 3: Generate Commercial Invoice (ACID transaction + row locking + sequence safety)
const invoiceSalesOrder = async (req, res) => {
  const so_number = req.params.so_number || req.body.so_number;
  if (!so_number) {
    return res.status(400).json({ error: 'so_number is required' });
  }

  // 1. Fail-closed Role & Identity verification
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const userRole = (typeof req.user?.role === 'string') ? req.user.role.trim() : '';
  if (!userRole || !INVOICE_ROLES.includes(userRole)) {
    return res.status(403).json({
      error: `Access Denied: Role "${userRole || 'Unassigned'}" is not authorized to generate invoices. Allowed roles: ${INVOICE_ROLES.join(', ')}.`
    });
  }

  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 2. Fetch and lock sales order
    const [orders] = await connection.query(
      'SELECT * FROM sales_orders WHERE so_number = ? FOR UPDATE',
      [so_number]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];

    // 3. Status check: MUST be 'Approved'
    if (order.status !== 'Approved') {
      await connection.rollback();
      return res.status(400).json({
        error: `Cannot generate invoice: sales order must be in "Approved" status (current status: "${order.status}"). Follow allowed order-to-cash flow: Order -> Approval -> Invoice -> Payment.`
      });
    }

    // 4. Check if invoice already exists (locked)
    const [existing] = await connection.query(
      'SELECT * FROM sales_invoices WHERE so_number = ? FOR UPDATE',
      [so_number]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        error: `Invoice already exists for sales order ${so_number} (${existing[0].invoice_no})`
      });
    }

    // 5. Generate invoice number on same transaction connection (no Math.random, no separate connection)
    const invoice_no = await getNextDocNumber('sales_invoice', 'INV-2026', connection);
    const invoice_date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const officerName = req.user?.name || req.trustedUser?.name || 'Accounts Officer';
    const created_by = `${officerName} (${userRole})`;

    // 6. Insert invoice atomically
    await connection.query(
      `INSERT INTO sales_invoices 
       (invoice_no, so_number, customer, invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'Unpaid', ?)`,
      [invoice_no, so_number, order.customer, invoice_date, order.delivery_date, order.total_amount, 0.00, order.total_amount, created_by]
    );

    // 7. Update sales order status to 'Invoiced' atomically
    await connection.query(
      'UPDATE sales_orders SET status = "Invoiced" WHERE so_number = ?',
      [so_number]
    );

    // 8. Write audit record atomically using the transaction connection
    await logAudit({
      req,
      userId: authenticatedUserId,
      userName: officerName,
      role: userRole,
      action: 'CREATE_SALES_INVOICE',
      entityType: 'SALES_INVOICE',
      entityId: invoice_no,
      details: `${userRole} (${officerName}) generated invoice ${invoice_no} for order ${so_number} (PKR ${Number(order.total_amount).toLocaleString()})`,
      connection
    });

    await connection.commit();

    const [invRows] = await connection.query('SELECT * FROM sales_invoices WHERE invoice_no = ?', [invoice_no]);
    res.status(201).json({
      success: true,
      message: `Commercial invoice ${invoice_no} generated for sales order ${so_number}`,
      invoice: invRows[0]
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error on invoice generation:', rbErr.message);
      }
    }
    // Handle concurrent duplicate key race condition gracefully
    if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('Duplicate entry')) {
      return res.status(409).json({
        error: `Conflict: Invoice already exists or is currently being created for sales order ${so_number}.`
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Stage 4: Record Payment (ACID transaction + consistent row locking + partial payment support)
const recordSalesPayment = async (req, res) => {
  const so_number = req.params.so_number || req.body.so_number;
  if (!so_number) {
    return res.status(400).json({ error: 'so_number is required' });
  }

  // 1. Fail-closed Role & Identity verification
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const userRole = (typeof req.user?.role === 'string') ? req.user.role.trim() : '';
  if (!userRole || !PAYMENT_ROLES.includes(userRole)) {
    return res.status(403).json({
      error: `Access Denied: Role "${userRole || 'Unassigned'}" is not authorized to record payments. Allowed roles: ${PAYMENT_ROLES.join(', ')}.`
    });
  }

  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 2. Consistent lock hierarchy: sales_orders first, then sales_invoices
    const [orders] = await connection.query(
      'SELECT * FROM sales_orders WHERE so_number = ? FOR UPDATE',
      [so_number]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];

    // Status check: must be Invoiced or already partially paid
    if (order.status !== 'Invoiced' && order.status !== 'Partially Paid') {
      await connection.rollback();
      return res.status(400).json({
        error: `Cannot record payment: order must be in "Invoiced" or "Partially Paid" status (current status: "${order.status}"). Follow allowed order-to-cash flow: Order -> Approval -> Invoice -> Payment.`
      });
    }

    // 3. Lock associated invoice
    const [invoices] = await connection.query(
      'SELECT * FROM sales_invoices WHERE so_number = ? FOR UPDATE',
      [so_number]
    );
    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `No commercial invoice found for sales order ${so_number}` });
    }
    const invoice = invoices[0];

    // 4. Authoritative calculation of payments & remaining balance
    const [paymentAgg] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM sales_payments WHERE invoice_no = ? FOR UPDATE',
      [invoice.invoice_no]
    );
    const totalPaidSoFar = Number(paymentAgg[0].total_paid);
    const invoiceTotal = Number(invoice.total_amount);
    const remainingBalance = Math.max(0, invoiceTotal - totalPaidSoFar);

    if (remainingBalance <= 0 || invoice.status === 'Paid') {
      await connection.rollback();
      return res.status(400).json({
        error: `Cannot record payment: invoice ${invoice.invoice_no} is already fully paid.`
      });
    }

    // 5. Validate payment amount
    const rawAmount = req.body.amount;
    const paymentAmount = rawAmount !== undefined ? Number(rawAmount) : remainingBalance;
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Valid positive payment amount is required.' });
    }
    if (paymentAmount > remainingBalance) {
      await connection.rollback();
      return res.status(400).json({
        error: `Payment amount (${paymentAmount.toLocaleString()}) exceeds outstanding invoice balance (${remainingBalance.toLocaleString()}).`
      });
    }

    // 6. Generate payment document sequence on same transaction connection
    const payment_no = await getNextDocNumber('sales_payment', 'PAY-2026', connection);
    const payment_date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const payment_method = req.body.payment_method || 'Bank Transfer';
    const reference_no = req.body.reference_no || `TRX-${Date.now().toString().slice(-6)}`;
    const officerName = req.user?.name || req.trustedUser?.name || 'Accounts Officer';
    const received_by = `${officerName} (${userRole})`;

    // 7. Insert payment record atomically
    await connection.query(
      `INSERT INTO sales_payments 
       (payment_no, invoice_no, so_number, customer, payment_date, amount, payment_method, reference_no, received_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment_no, invoice.invoice_no, so_number, order.customer, payment_date, paymentAmount, payment_method, reference_no, received_by]
    );

    // 8. Update invoice paid amount and status
    const newTotalPaid = totalPaidSoFar + paymentAmount;
    const isFullyPaid = newTotalPaid >= invoiceTotal;
    const invoiceStatus = isFullyPaid ? 'Paid' : 'Partially Paid';
    const orderStatus = isFullyPaid ? 'Paid' : 'Partially Paid';

    await connection.query(
      'UPDATE sales_invoices SET paid_amount = ?, status = ? WHERE invoice_no = ?',
      [newTotalPaid, invoiceStatus, invoice.invoice_no]
    );

    // 9. Update sales order status
    await connection.query(
      'UPDATE sales_orders SET status = ? WHERE so_number = ?',
      [orderStatus, so_number]
    );

    // 10. Audit log atomically
    await logAudit({
      req,
      userId: authenticatedUserId,
      userName: officerName,
      role: userRole,
      action: 'RECORD_SALES_PAYMENT',
      entityType: 'SALES_PAYMENT',
      entityId: payment_no,
      details: `Recorded ${isFullyPaid ? 'full' : 'partial'} payment ${payment_no} of PKR ${paymentAmount.toLocaleString()} for order ${so_number} (Outstanding balance: PKR ${(remainingBalance - paymentAmount).toLocaleString()})`,
      connection
    });

    await connection.commit();

    const [payRows] = await connection.query('SELECT * FROM sales_payments WHERE payment_no = ?', [payment_no]);
    res.status(201).json({
      success: true,
      message: `Payment ${payment_no} recorded successfully for sales order ${so_number}`,
      payment: payRows[0],
      outstanding_balance: remainingBalance - paymentAmount,
      invoice_status: invoiceStatus,
      order_status: orderStatus
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error on payment recording:', rbErr.message);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


/**
 * 8. Marketing Campaigns
 */
const getMarketing = async (req, res) => {
  try {
    const [campaigns] = await db.query('SELECT * FROM marketing_campaigns ORDER BY id ASC');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 9. Payroll Runs
 */
const getPayroll = async (req, res) => {
  try {
    const [runs] = await db.query('SELECT * FROM payroll_runs ORDER BY id DESC');
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generatePayroll = async (req, res) => {
  const { month } = req.body;
  const preparerName = req.user?.name || req.trustedUser?.name || 'HR Officer';
  const preparerRole = req.user?.role || req.trustedUser?.role || 'HR';
  const run_number = `PAY-2026-00${Math.floor(Math.random() * 89 + 10)}`;
  try {
    await db.query(
      'INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, "29 Sep 2026", ?, "Pending approval", ?, 4868088.00)',
      [run_number, month || '2026-10', preparerName]
    );
    await logAudit({
      req,
      userId: req.user?.id,
      userName: preparerName,
      role: preparerRole,
      action: 'GENERATE_PAYROLL',
      entityType: 'PAYROLL',
      entityId: run_number,
      details: `${preparerRole} (${preparerName}) generated payroll batch ${run_number} for period ${month || '2026-10'}`
    });
    res.json({ success: true, run_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 10. Accounts & Finance Overview
 */
const getFinanceOverview = (req, res) => {
  res.json({
    cashAndBank: [
      { name: 'Cash in hand', balance: '800,000', account: 'Cash' },
      { name: 'Bank — Current A/C ••4410', balance: '14,905,300', account: 'Meezan Bank' },
      { name: 'Bank — Current A/C ••2231', balance: '10,713,825', account: 'HBL Mardan' },
      { name: 'Bank — Payroll A/C ••7702', balance: '3,000,000', account: 'MCB' }
    ],
    receivables: {
      total: 'PKR 45,660,034',
      current: '31.0M',
      d1_30: '11.4M',
      d31_60: '3.2M',
      topDebtors: [
        { customer: 'Karachi Egg Wholesalers', amount: '12,386,999' },
        { customer: 'Peek Freans', amount: '7,093,583' },
        { customer: 'Barkat Frisian (value-added)', amount: '5,486,933' },
        { customer: 'Dawn Foods', amount: '3,942,893' },
        { customer: 'Swat Valley Egg Dealers', amount: '3,877,654' }
      ]
    },
    payables: {
      total: 'PKR 27,122,966',
      current: '23.2M',
      d1_30: '4.0M',
      topCreditors: [
        { supplier: 'Frontier Poultry Feeds', amount: '11,119,140' },
        { supplier: 'Swabi Layer Farms', amount: '2,646,840' },
        { supplier: 'Haripur Egg Farm', amount: '2,646,330' },
        { supplier: 'Khyber Cold Chain Logistics', amount: '2,062,160' },
        { supplier: 'Charsadda Poultry Farm', amount: '1,940,905' }
      ]
    }
  });
};

/**
 * 11. Reports: Profit & Loss Statement
 */
const getPnlReport = (req, res) => {
  res.json({
    period: '1 Jul 2026 to 29 Sep 2026',
    revenue: 'PKR 137M',
    grossProfit: 'PKR 29.9M (21.8%)',
    operatingExpenses: 'PKR 28.4M (20.8%)',
    netProfit: 'PKR 1.4M (1.1%)',
    breakdown: [
      { code: '4000', name: 'Sales revenue', amount: '136,824,763', type: 'revenue' },
      { code: '5000', name: 'Cost of eggs sold', amount: '106,954,414', type: 'cogs' },
      { code: '6000', name: 'Salaries & wages', amount: '11,391,970', type: 'expense' },
      { code: '6100', name: 'Rent & utilities', amount: '2,250,000', type: 'expense' },
      { code: '6200', name: 'Admin & office expenses', amount: '7,615,068', type: 'expense' },
      { code: '6300', name: 'Cold-chain transport & fuel', amount: '4,572,895', type: 'expense' },
      { code: '6400', name: 'Marketing & advertising', amount: '2,367,707', type: 'expense' },
      { code: '6500', name: 'Lab testing & quality', amount: '231,753', type: 'expense' }
    ]
  });
};

/**
 * 12. Approval Matrix Settings
 */
const getSettingsMatrix = (req, res) => {
  res.json({
    rules: [
      { doc: 'Purchase requisition', range: '0 to No limit', approvers: ['Department head'] },
      { doc: 'Purchase order Band 1', range: '0 to 500,000', approvers: ['Department head', 'Accounts & Finance', 'Director Finance'] },
      { doc: 'Purchase order Band 2', range: '500,000 to 2,500,000', approvers: ['Department head', 'Director Finance', 'General Manager'] },
      { doc: 'Purchase order Band 3', range: '2,500,000 to No limit', approvers: ['Chairman & CEO'] }
    ]
  });
};

module.exports = {
  getChairmanDashboard,
  getApprovals,
  actionApproval,
  getLiveOperations,
  getGatePasses,
  createGatePass,
  getProcurementPOs,
  createProcurementPO,
  getProductionBoard,
  moveProduction,
  getSalesOrders,
  getSalesOrderDetails,
  createSalesOrder,
  approveSalesOrder,
  invoiceSalesOrder,
  recordSalesPayment,
  getMarketing,
  getPayroll,
  generatePayroll,
  getFinanceOverview,
  getPnlReport,
  getSettingsMatrix,
  CORPORATE_CUSTOMER_PROFILES,
  resolveCustomerCreditPolicy,
  getDefaultUnvettedCreditLimit,
  formatDocumentDate,
  PRODUCTION_STAGES,
  CANONICAL_DOC_TYPES,
  normalizeWorkflowDocType
};
