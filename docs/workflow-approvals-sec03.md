# Workflow Approval Security & Authority Specification (SEC-03)

This document formalizes the server-side approval authorization, delegation of authority, state machine, segregation of duties (SOD), and audit guarantees implemented under Phase D2.16 for Yousafzai Agri Foods ERP.

---

## 1. Resolved Three-Tier Approval Matrix (DEC-04 & DEC-01)

Financial approvals for Purchase Orders follow a three-tier delegation model evaluated against the trusted document store (`purchase_orders.amount`):

| Monetary Band | Range (PKR) | Permitted Approvers | Notes |
|---|---|---|---|
| **Band 1** | Up to PKR 500,000 | Assigned Recipient, `Director Finance`, `General Manager`, `Chairman & CEO` | Low-value operational procurement. Department heads and Finance Officers may approve when assigned. |
| **Band 2** | PKR 500,001 to PKR 2,500,000 | `Director Finance`, `General Manager`, `Chairman & CEO`, or Assigned Department Head | Mid-value procurement. Requires departmental executive or financial sign-off. |
| **Band 3** | Above PKR 2,500,000 | **`Chairman & CEO` Exclusively** | High-value capital commitments. **GM operational override is strictly prohibited** (DEC-01: B). |

---

## 2. Role & Assignee Matching Precedence (DEC-03 & Phase D2.30)

To resolve the security vulnerability of display-name matching, Phase D2.30 eliminates display-name string comparisons and establishes a strict dual-assignment model distinguishing between canonical functional roles (`assigned_role`) and durable user IDs (`assigned_user_id`). Task authorization in `actionApproval` applies the following strict precedence:

1. **Rule 0 — Administrative Exclusion (DEC-02: A)**:
   - If the caller's verified database role is `ERP Admin`, access is **strictly denied (`HTTP 403 Forbidden`)**. Technical system administrators possess no commercial or operational spending authority.
2. **Rule 1 — Direct Stable-ID Individual Assignee**:
   - If `task.assigned_user_id` contains a valid positive integer matching `trustedUser.id`, individual authorization is **granted** (`isUserMatch`). Display-name string matching (`isNameMatch`) has been **completely eliminated**.
3. **Rule 2 — Direct Role Assignee**:
   - If `task.assigned_role` matches `trustedUser.role` (case-insensitive exact string equality), role-based authorization is **granted** (`isRoleMatch`).
4. **Rule 3 — Fail-Closed Non-Canonical Assignee (Historical Record Guard)**:
   - If `task.assigned_role` is not one of the recognized canonical functional ERP roles (`VALID_ERP_ROLES`) and `task.assigned_user_id` is `null` or unverified, access is **strictly denied (`HTTP 403 Forbidden`)**:
     `Access Denied: Task #... has an unverified individual assignee identity. Approval is blocked pending assignment migration.`
   - Substring, fuzzy, or display-name fallbacks are strictly prohibited.
5. **Rule 4 — Executive / Operational Override**:
   - `Chairman & CEO`: Universal executive authority across all workflows (subject to SOD).
   - `General Manager`: Operational override across operational workflows (Production orders, Gate passes, GRN, RMR, and Band 1/2 POs). **Strictly barred from Band 3 POs (> PKR 2.5M)**.
   - `Director Operations`: Departmental authority for operational domain tasks (`Production order`, `Gate pass — inward`, `Goods receipt`, `Raw material requirement`).
   - `Director Finance`: Departmental authority for financial domain tasks (`Purchase order`).
   - `HR Manager`: Departmental authority for HR domain tasks (`Payroll run`).
6. **Rule 5 — Fallback**:
   - All other callers are **denied (`HTTP 403 Forbidden`)**.

---

## 3. Least-Privilege Inbox & Dashboard Visibility (DEC-06 & F3)

Approval visibility is filtered server-side based on the caller's verified identity across all endpoints:

### A. Approvals Inbox (`GET /api/approvals`)
- **Executive Roles (`Chairman & CEO`, `General Manager`)**: Full visibility over all pending and historical workflow tasks for enterprise oversight.
- **Departmental Executives**:
  - `Director Operations`: Views operational domain tasks and individually assigned tasks.
  - `Director Finance`: Views financial domain tasks (`Purchase order`) and individually assigned tasks.
  - `HR Manager`: Views HR domain tasks (`Payroll run`) and individually assigned tasks.
- **Operational Roles (`Production Manager`, `Plant Manager`, `QC Cell`, `Raw Material Store`, etc.)**: Strictly view tasks where `assigned_role` matches their exact name or exact role.
- **General Staff & `ERP Admin`**: Receive an empty list (`[]`).

### B. Chairman Executive Dashboard (`GET /api/dashboard/chairman` — F3 Remediation)
The `waitingApprovals` field in the executive dashboard response applies strict least-privilege scoping:
- **`ERP Admin`**: Receives `waitingApprovals: []` (empty array). Technical administrators are completely excluded from viewing pending operational and financial decision items, eliminating data leakage.
- **`Chairman & CEO` & `General Manager`**: Receive up to 6 pending workflow tasks enterprise-wide (`ORDER BY id ASC LIMIT 6`).
- **`Director Operations`**: Receives up to 6 pending operational tasks (`Production order`, `Gate pass — inward`, `Goods receipt (GRN)`, `Raw material requirement`, or assigned to them).
- **`Director Finance`**: Receives up to 6 pending financial tasks (`Purchase order` or assigned to them).
- **All other KPI and analytical fields** (`kpis`, `revenueChart`, `receivablesAging`, `budgetVsActual`, `exceptions`) remain intact for authorized executive overview.

---

## 4. Action State Machine & Reason Semantics (DEC-07)

Workflow tasks operate under a strict, terminal state machine:

```
[ pending ] ──( approved )──> [ approved ] (Terminal)
            ──( completed )─> [ completed ] (Terminal)
            ──( rejected )──> [ rejected ] (Terminal, reason mandatory)
            ──( returned )──> [ returned ] (Terminal, reason mandatory)
```

- **Pending-State Guard**: Decisions are accepted **only** when `task.status === 'pending'`. Any attempt to act on already decided tasks returns `HTTP 400 Bad Request`.
- **Reason Requirement**: Submitting `action: 'rejected'` or `action: 'returned'` mandates a non-empty `reason` string in the request body. If missing or whitespace-only, the request is rejected with `HTTP 400 Bad Request`.
- **Action 'completed'**: Retained for authorized operational workflows (e.g. manufacturing job completion), enforcing identical authorization checks as `approved`.

---

## 5. Segregation of Duties (SOD) Enforcement (DEC-05, F2, Phase D2.21, & Phase D2.30)

- **Verified Creator Identity & Fail-Closed Enforcement (`Purchase order`)**:
  - The creator identity must be verified via `purchase_orders.created_by_user_id`.
  - **Fail-Closed Verification**: If `created_by_user_id` is `null`, missing, NaN, zero, or negative (`!isVerifiedPoCreator`), approval is strictly blocked with `HTTP 403 Forbidden: Access Denied: Creator identity is unverified on purchase order ... Approval is blocked pending an approved resolution process.` and the transaction is rolled back.
  - **Self-Approval Block**: If `created_by_user_id` matches `trustedUser.id`, the request is rejected with `HTTP 403 Forbidden: Separation of duties violation: Document creator cannot approve their own purchase order.` and rolled back.
  - **Elimination of Display-Name Fallback**: String comparison of `purchase_orders.created_by` against `trustedUser.name` has been completely eliminated.
  - The audit log records `sod_status: "VERIFIED_INDEPENDENT"` only when `created_by_user_id` is positive, valid, and distinct from the approver.
- **Strict SOD for Operational Workflows (`Gate pass` & `Production order` — Decision A1)**:
  - When `gate_passes.created_by_user_id` matches `trustedUser.id`, approval is rejected with `HTTP 403 Forbidden: Separation of duties violation: Gate pass creator cannot approve their own gate pass.`
  - When `production_orders.created_by_user_id` matches `trustedUser.id`, approval is rejected with `HTTP 403 Forbidden: Separation of duties violation: Production order creator cannot approve their own work order.`
  - When `created_by_user_id` is verified independent, the audit log records `sod_status: "VERIFIED_INDEPENDENT"`.
- **Unrecorded Creator Identity (Operational Workflows — F2 Remediation)**:
  - For operational tasks (`Gate pass — inward`, `Production order`, `Goods receipt (GRN)`, `Raw material requirement`) where legacy schemas do not track creator IDs, creator/approver separation cannot be verified.
  - The audit log explicitly records `sod_status: "CREATOR_UNRECORDED"`.
  - The deprecated label `"OPERATIONAL_STEP_VERIFIED"` has been **completely removed**, ensuring the audit trail never falsely asserts that SOD was verified when it was not.
- **Missing Underlying Records & Unmigrated Schemas (Workstream C)**:
  - If a purchase order, goods receipt, or raw material requisition workflow task references a non-existent record or unmigrated table, the approval fails closed with `HTTP 403 Forbidden`.

---

## 6. Concurrency Control & Audit Atomicity (ARCH-01)

- **Row Locking**: Every decision transaction acquires a pessimistic lock (`SELECT ... FOR UPDATE`) on the target task row before evaluating state or authorization, serializing concurrent decisions.
- **Atomic Rollback**: State mutations in `workflow_tasks` and `purchase_orders` execute inside a MySQL transaction (`connection.beginTransaction()`). The audit record is written using the transaction's connection (`connection`). If the audit write fails or deadlocks, the entire transaction is rolled back, preventing audit suppression.

---

## 7. Known Residual Limitations & Architecture Roadmap

The following architectural limitations remain open following Phase D2.18 and Phase D2.21, and are documented for future scheduled phases:

### Limitation 1 (F1): Operational Workflow Creator SOD Gap & DDL Execution Blocker
- **Description**: `gate_passes` and `production_orders` lack `created_by` or `creator_id` columns in the live operational MySQL database schema. Furthermore, `Goods receipt (GRN)` and `Raw material requirement` do not have underlying database tables in the live database.
- **Phase D2.21 Remediation Completed**: Reviewable idempotent DDL has been implemented in `backend/initDb.js` for `goods_receipts`, `goods_receipt_items`, `raw_material_requirements`, and `created_by_user_id` on `gate_passes`, `production_orders`, and `purchase_orders`. Runtime controllers fail closed if unmigrated.
- **Residual Blocker**: Live database execution of the DDL is blocked until explicit owner authorization is granted. Until migrations run, legacy operational rows remain evaluated with `sod_status: "CREATOR_UNRECORDED"`.

### Limitation 2 (F4): Purchase Order Creator String Display Name vs. Durable Foreign Key
- **Description**: `purchase_orders.created_by` is defined as `VARCHAR(100)` storing the employee's display name string (e.g. `'Waqar Ahmad'`) rather than an immutable integer foreign key `created_by_user_id`.
- **Phase D2.21 Remediation Completed**: Added `created_by_user_id` tracking to `createProcurementPO`, added column definition and idempotent alter in `backend/initDb.js`, and updated `actionApproval` to check `created_by_user_id` with fallback to `created_by`.
- **Residual Blocker**: Backfill script for legacy historical purchase order rows is deferred until database authorization is granted.

---

## 8. Single-Stage Monetary Ceiling Governance (Decision B1 & Workstream B)

- **Architecture Principle**: Approvals operate under a single-stage monetary ceiling authority model rather than sequential multi-signature chains. An approver possessing authority equal to or greater than the document's monetary band can grant terminal authorization in a single decision step.
- **UI Alignment (`SettingsMatrix.jsx`)**: Sequential transition arrows (`→`) and sequential approval wording have been removed. The matrix displays clear monetary ceiling bands, explainer callouts, and explicit authorized role badges.
- **Completed Action Retention (DEC-07)**: The `completed` action is retained across operational callers (`ApprovalsInbox.jsx`, `ProductionBoard.jsx`) and server-side state machines, subject to the same strict authorization guards as `approved`.

---

## 9. Phase D2.23 Critical Defect Corrections

Under Phase D2.23, the critical defects identified during the independent review of SEC-03 (Phase D2.22) were remediated:

### A. Decoupled DDL Migrations from Server Boot (Fix F-01)
- **Problem**: In Phase D2.21, DDL migrations (`ALTER TABLE` and `CREATE TABLE` for `goods_receipts`, `goods_receipt_items`, `raw_material_requirements`) were executed inside `initSchema()` during `server.js` startup. This created an uncontrolled risk of unexpected schema changes on boot and violated no-db phase constraints.
- **Remediation**:
  - The additive DDL has been extracted from `initSchema()` into a dedicated, exported function `runSec03Migrations(connection = db)` in `backend/initDb.js`.
  - Normal server boot (`startServer` -> `initDatabase()` -> `initSchema()`) never executes SEC-03 additive DDL.
  - A dedicated CLI migration runner has been introduced at `backend/scripts/migrateSec03.js`.
  - The script requires explicit affirmative confirmation via an environment guard: `CONFIRM_MIGRATE=true node backend/scripts/migrateSec03.js`.
  - Executing without `CONFIRM_MIGRATE=true` exits immediately with code 1 and descriptive guidance.
  - In Phase D2.23 and audit phases, zero DDL is executed against live databases.

### B. Corrected Legacy Purchase Order SOD Audit Label (Fix F-02)
- **Problem**: In Phase D2.21, if `poRecord.created_by_user_id` was `null` on legacy POs, `actionApproval` compared string display names (`poCreator !== userName`) and erroneously recorded `sod_status: "VERIFIED_INDEPENDENT"`. Mutable, unverified string names cannot prove independence.
- **Remediation**:
  - In `backend/controllers/operations.controller.js`, `sodStatus` is marked `VERIFIED_INDEPENDENT` **only** if `poRecord.created_by_user_id != null` AND `Number(poRecord.created_by_user_id) !== Number(trustedUser.id)`.
  - If `created_by_user_id` is null or unverified, `sodStatus` is strictly set to `"CREATOR_UNRECORDED"`.
  - False assertions of independence are eliminated from the audit log.

### C. Fail-Closed Enforcement for Operational SOD (Fix F-03)
- **Problem**: In Phase D2.21, legacy Gate Passes and Production Orders without `created_by_user_id` were allowed to proceed through approval and logged with `sod_status: "CREATOR_UNRECORDED"`. This allowed potential self-approvals of unverified operational records.
- **Remediation**:
  - In `backend/controllers/operations.controller.js`, Gate Pass and Production Order approvals now **fail closed**:
    - If the underlying record is missing from the database, the approval is rejected with `HTTP 403 Forbidden` (`Operational document record not found in trusted store. Approval cannot proceed.`).
    - If `created_by_user_id` is `null` or unverified, approval is blocked with `HTTP 403 Forbidden` (`Creator identity is unverified on this operational record. Approval is blocked pending an approved resolution process.`).
    - If `created_by_user_id` matches the approver's ID, approval is rejected with `HTTP 403 Forbidden` (Separation of duties violation).
  - No unauthorized executive override exists to bypass SOD. Any rejection rolls back the database transaction with zero state modification.

### D. Existing-Table Index Consistency (Fix F-05)
- **Problem**: Phase D2.21 DDL scripts only created indexes on newly created tables, omitting indexes on existing tables (`gate_passes`, `purchase_orders`, `production_orders`) when adding `created_by_user_id`.
- **Remediation**:
  - `runSec03Migrations` in `backend/initDb.js` now idempotently creates indexes on existing tables using `information_schema.STATISTICS` queries:
    - `idx_gp_created_by` on `gate_passes(created_by_user_id)`
    - `idx_po_created_by` on `purchase_orders(created_by_user_id)`
    - `idx_prod_created_by` on `production_orders(created_by_user_id)`

---

## 10. Operational Workflow Lifecycle & Integration Gaps (Fix F-04 / Architecture Roadmap)

An exhaustive code audit confirmed the following workflow lifecycle gaps between business document creation, workflow tasks, and document status updates:

1. **Decoupled Task Creation**:
   - `createGatePass` and `createProcurementPO` in `operations.controller.js` insert into `gate_passes` and `purchase_orders` respectively, but do **not** create a corresponding entry in `workflow_tasks`.
   - Workflow tasks currently originate exclusively from seed data (`initDb.js`) or external triggers.
2. **Asymmetric Document Status Updates**:
   - In `actionApproval`, approving or rejecting a purchase order updates `purchase_orders.status` (e.g. `'Approved'` / `'Rejected'`).
   - However, approving an operational task does not update the underlying operational status:
     - `gate_passes.status` remains unaffected.
     - `production_orders.stage` remains unaffected.
3. **GRN and RMR Endpoint Status**:
   - `goods_receipts` and `raw_material_requirements` tables are defined in DDL migrations but no operational creation endpoints (`POST /api/goods-receipts`, etc.) exist yet.
   - Tasks for GRN and RMR fail closed in `actionApproval` pending table migration and operational controller implementation.
4. **Resolution Path**:
   - Automated creation of `workflow_tasks` upon document submission and bidirectional synchronization of operational document statuses are deferred to a dedicated, owner-approved workflow lifecycle implementation phase. No speculative triggers were added in D2.23.

---

## 11. Phase D2.25 Document Normalization & Migration Recovery Architecture

### A. Document-Type Normalization & Fail-Closed Routing
- **Problem**: In Phase D2.24, an independent source audit revealed that `actionApproval` evaluated domain authorization with lowercase strings (`docTypeLower`), but evaluated document-specific handlers with exact case-sensitive comparisons (`task.doc_type === 'Gate pass — inward'`). Tasks inserted with non-canonical casing (`'production order'`) or ASCII hyphens (`'gate pass - inward'`) bypassed the operational SOD block and reached an unrestricted fallback that approved the task with `CREATOR_UNRECORDED`.
- **Remediation**:
  - Implemented `normalizeWorkflowDocType(rawDocType)` in `backend/controllers/operations.controller.js`.
  - Normalizes leading/trailing whitespace, converts case to lowercase, converts Unicode dash variants (em dash `\u2014`, en dash `\u2013`, horizontal bar `\u2015`, figure dash `\u2012`) to standard ASCII hyphen (`-`), and matches strictly against an explicit alias dictionary for `CANONICAL_DOC_TYPES`.
  - Both initial authorization checks (`isOperationsDomain`, `isFinanceDomain`, `isHRDomain`) and document-specific SOD evaluation evaluate the exact same `canonicalDocType`.
  - The fallback `else` branch in operational approvals fails closed: any document type lacking an implemented, explicitly supported document handler (including unknown types and `Payroll run`) rejects immediately with `HTTP 403 Forbidden` and rolls back the database transaction.

### B. MySQL DDL Persistence & Migration Recovery Architecture
- **Implicit DDL Commits**: In MySQL, DDL statements (`ALTER TABLE`, `CREATE TABLE`) trigger an implicit transaction commit. Schema mutations cannot be executed inside a rollbackable transaction.
- **Non-Atomic Migration Notice**: A failure mid-way through `runSec03Migrations()` leaves preceding schema modifications permanently committed in the database engine. A failed migration does **not** automatically roll back to the pre-migration state.
- **Idempotent Rerun Recovery**:
  - Every step in `runSec03Migrations()` is designed with defensive idempotency:
    - Column additions query `information_schema.COLUMNS` prior to altering tables.
    - Index additions query `information_schema.STATISTICS` prior to adding indexes and catch duplicate key errors.
    - New tables use `CREATE TABLE IF NOT EXISTS`.
  - In the event of a migration failure, operators must:
    1. Inspect the migration error output to identify the exact failing step.
    2. Query `information_schema` to verify which modifications persisted.
    3. Correct the underlying condition (e.g. locks, permissions, disk space).
    4. Re-run `CONFIRM_MIGRATE=true node backend/scripts/migrateSec03.js` to complete the remaining steps.
- **Fresh Installation Schema Parity**:
  - Normal application startup (`startServer` -> `initDatabase` -> `initSchema`) creates the base pre-SEC-03 schema.
  - Fresh installations require a separately authorized execution of `migrateSec03.js` to achieve schema parity with existing hardened installations. Schema migrations are neither atomic nor automatically reversible.

---

## 12. Phase D2.30 Stable-ID Approval Authorization & Fail-Closed PO SOD Architecture

Under Phase D2.30, display-name-based authorization checks were audited and remediated, and purchase order segregation of duties was harmonized to fail-closed semantics:

### A. Stable User-ID Authorization (`workflow_tasks.assigned_user_id`)
- **Vulnerability Remediated**: `workflow_tasks.assigned_role` previously contained arbitrary display names (e.g. `'Farhan Ali'`) alongside functional roles. In `actionApproval`, `getApprovals`, and `getChairmanDashboard`, matching was performed against mutable display names (`user.name`), permitting potential privilege confusion and unauthorized decision access if display names overlapped or changed.
- **Remediation**:
  - Distinguishes canonical functional roles (`VALID_ERP_ROLES`) from individual user assignments.
  - Added integer column `workflow_tasks.assigned_user_id` and index `idx_wt_assigned_user`.
  - Replaced `isNameMatch` with `isUserMatch`: matching evaluates `task.assigned_user_id === callerId` (where `callerId` is a validated positive integer).
  - Complete elimination of string display-name comparisons in `actionApproval`.
  - Non-canonical role strings without a verified `assigned_user_id` strictly fail closed with `HTTP 403 Forbidden` (`Access Denied: Task #... has an unverified individual assignee identity. Approval is blocked pending assignment migration.`).

### B. Inbox & Dashboard Scoping Hardening
- In `getApprovals` and `getChairmanDashboard`, task queries no longer inspect `user.name`.
- Scoping now queries `(assigned_user_id = ? OR LOWER(assigned_role) = LOWER(?))` parameterized with `[validCallerId, userRole]`.
- Users with malformed or invalid caller identities receive an empty list (`[]`). Display names cannot be used to gain unauthorized visibility into workflow tasks.

### C. Fail-Closed Purchase Order Segregation of Duties (SOD)
- **Harmonization with Operational Workflows**: Harmonized PO SOD with Gate Passes and Production Orders.
- If `created_by_user_id` on a purchase order is `null`, missing, NaN, zero, or negative (`!isVerifiedPoCreator`), `actionApproval` rejects the request with `HTTP 403 Forbidden: Access Denied: Creator identity is unverified on purchase order ... Approval is blocked pending an approved resolution process.` and rolls back the database transaction.
- Self-approvals are strictly barred: if `created_by_user_id === callerId`, the request is rejected with `HTTP 403 Forbidden: Separation of duties violation: Document creator cannot approve their own purchase order.`
- Legacy string fallback (`poCreator.toLowerCase() === userName.toLowerCase()`) has been completely removed.
- Only independent, verified creators receive `sod_status: "VERIFIED_INDEPENDENT"`.

### D. Schema Migration & Safe Deployment Posture
- Additive, idempotent DDL has been defined in `backend/initDb.js` under `runSec03Migrations()` (Step 4):
  - `ALTER TABLE workflow_tasks ADD COLUMN assigned_user_id INT NULL AFTER assigned_role`
  - `ALTER TABLE workflow_tasks ADD INDEX idx_wt_assigned_user (assigned_user_id)`
- Base table definition in `initSchema()` also incorporates `assigned_user_id INT NULL` and `INDEX idx_wt_assigned_user (assigned_user_id)`.
- Demo data seeder (`seedDemoData()`) assigns canonical functional roles in `assigned_role` and assigns unambiguous positive integer IDs to `assigned_user_id`.
- **Safety Boundary Notice**: Live execution of DDL migrations and backfills remains paused. Zero database connections were made during Phase D2.30.

### E. Workflow Lifecycle & Integration Roadmap
- Task creation remains decoupled from document insertion (`createGatePass`, `createProcurementPO`), and document status updates remain asymmetric.
- Automatic task generation and bidirectional status synchronization remain deferred to an authorized future workflow lifecycle implementation phase.

