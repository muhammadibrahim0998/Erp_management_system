Written by Developer B from checkpoints T2 and T3; each item names the file and line where it was observed.

# Backend Request List for Developer A

1. **CRITICAL — Auth on operations routes**:
   - `backend/routes/operations.routes.js:28-36` has no `authenticateToken` middleware attached to any route (reads or writes).
   - `authenticateToken` exists in `backend/middlewares/auth.js:26-45` and is used in `backend/routes/audit.routes.js:6-7` and `backend/routes/user.routes.js:11-14`.
   - `backend/controllers/operations.controller.js:371-374` (`approveSalesOrder`) explicitly checks `req.user?.role`. Because no auth middleware is mounted on `operations.routes.js`, `req.user` is always undefined and every call to approve a sales order returns HTTP 401 Unauthorized.
   - **Request**: Mount `authenticateToken` across operations routes in `backend/routes/operations.routes.js` and enforce server-side role validation on write operations.

2. **HIGH — Client dictates credit limit and exposure**:
   - `backend/controllers/operations.controller.js:288-331` (`createSalesOrder`), specifically lines 295-296:
     ```javascript
     const { customer, delivery_date, warehouse = 'Mardan sales point & store', items = [], credit_limit = 4500000.00, current_exposure = 0.00 } = req.body;
     ```
   - The server accepts `credit_limit` and `current_exposure` from `req.body` and inserts them directly into `sales_orders` (lines 327-331) without customer master lookup or open receivables calculation.
   - **Request**: Look up the customer's real approved credit limit from database records and calculate open exposure from outstanding invoices/orders, ignoring any credit parameters sent by the client.

3. **HIGH — Approval rejection reason not captured**:
   - `backend/controllers/operations.controller.js:77-90` (`actionApproval`) only reads `action` from `req.body` (`const { action } = req.body; // 'approved' | 'rejected' | 'completed'`).
   - When a task is rejected with a mandatory explanation, the reason is ignored and dropped.
   - **Request**: Add a `reason` column to `workflow_tasks`, accept `reason` in `POST /api/approvals/:id/action`, record `reason` in `audit_logs` via `logAudit`, validate against permitted actions, and verify caller permissions.

4. **HIGH — Purchase order total computed client-side**:
   - `backend/controllers/operations.controller.js:175-194` (`createProcurementPO`), specifically line 176 (`const { supplier, amount, items_count } = req.body;`), inserts the client-provided `amount` directly into `purchase_orders` (line 180).
   - **Request**: Receive line items, recompute `quantity * unit_price` on the server, calculate taxes, and select the approval tier based on the verified server-computed total.

5. **MEDIUM — Sales approval columns and reason requirement**:
   - `backend/initDb.js:113-128` (`sales_orders` schema) contains no `approved_by` or `approved_at` columns.
   - `backend/controllers/operations.controller.js:396-400` formats a string (`Approved by ${req.user.name} (${userRole})`) and overwrites `approval_step`, leaving `status = "Approved"` without separate approver metadata.
   - `backend/controllers/operations.controller.js:363-419` does not require a written justification when approving orders that breach dealer credit limits.
   - **Request**: Add `approved_by` (user ID / name), `approved_role`, and `approved_at` columns to `sales_orders`, and require a written justification (`reason`) when approving an order with `credit_breach > 0`.

6. **MEDIUM — Missing endpoints**:
   - `GET /api/customers`: Customer directory endpoint with credit limit, terms, and current balance (needed for autocomplete in Sales Order modal).
   - `GET /api/gate?type=outward`: Outward gate pass queue (currently only inward passes are supported).
   - `POST /api/qc/receive`: QC goods receipt endpoint to accept inspected shipments and transfer to inventory.

7. **LOW — Static mock responses in operational controllers**:
   - `backend/controllers/operations.controller.js:8-75` (`getChairmanDashboard`) returns fixed hardcoded JSON for metrics and aging.
   - `backend/controllers/operations.controller.js:105-132` (`getLiveOperations`) returns hardcoded facility sensor states.
   - `backend/controllers/operations.controller.js:602-675` (`getFinanceOverview`) returns static financials.
   - `backend/controllers/operations.controller.js:692-703` (`getSettingsMatrix`) returns static approval limits.
   - **Request**: Transition these read controllers from static JSON payloads to live database queries as tables are created.

8. **HIGH — Stage progression not enforced on server**:
   - `backend/controllers/operations.controller.js:208-223` (`moveProduction`) updates `stage` in `production_orders` directly using `UPDATE production_orders SET stage = ? WHERE id = ?`.
   - Today the server accepts ANY arbitrary string and does not verify the existing stage of the work order. An API caller can skip intermediate stages (e.g., jump from "With GM" directly to "Completed") or move backward without authorization.
   - **Request**: Define the permitted stage progression order (`['With GM', 'With Plant Manager', 'With Production Manager', 'Materials requested', 'In production', 'Completed']`), query the order's current stage with row locking, and enforce stage transition validation: allow moving strictly one stage forward (`index + 1`) or one stage back for rework (`index - 1`), while rejecting any stage jumps (skipping forward 2+ or jumping backward 2+) with HTTP 400. Note: This transition rule is a proposal matching the frontend UI flow and must be confirmed by the product owner.

9. **HIGH — Inventory deduction and finished goods generation on work order completion**:
   - `backend/controllers/operations.controller.js:208-223` (`moveProduction`) only updates the `stage` text column.
   - When a work order transitions to `"Completed"`, no inventory transactions are generated: breaking-grade eggs are not deducted from raw materials store (`RSK_RM`), and produced liquid egg product (`quantity_kg`) is not added to finished goods inventory (`RSK_FG`).
   - **Request**: When stage advances to `"Completed"`, wrap the transition in a database transaction that: (1) calculates bill-of-materials raw egg consumption, (2) decrements raw materials in `inventory_items` and logs `inventory_transactions` with proposed transaction type `'PRODUCTION_CONSUMPTION'` (or an alternative name chosen by Developer A; this string does not exist in `backend/` today), and (3) increments finished goods inventory in `RSK_FG` and logs `inventory_transactions` with proposed transaction type `'PRODUCTION_OUTPUT'` (proposed name; does not exist in `backend/` today). Note: `RSK_RM` and `RSK_FG` are verified active facility codes in `backend/controllers/inventory.controller.js:9-10, 18-19`.

10. **HIGH — Missing authentication and role checks on production and inventory endpoints**:
    - `backend/routes/operations.routes.js:25` (`POST /production/move`) and `backend/routes/inventory.routes.js:6-7` (`POST /adjust`, `POST /transfer`) have no `authenticateToken` middleware attached.
    - Any anonymous caller can move production order stages, adjust stock quantities, or execute warehouse transfers.
    - In `backend/controllers/operations.controller.js:208-223`, there is no role check verifying if the user has production management authority.
    - **Request**: Mount `authenticateToken` on `backend/routes/inventory.routes.js` and `operations.routes.js`. Enforce role-based access control: only `'Plant Manager'`, `'Production Manager'`, and `'ERP Admin'` should be permitted to advance production orders; only `'Raw Material Store'`, `'Finish Store & Delivery'`, `'Director Operations'`, and `'ERP Admin'` should be permitted to adjust or transfer stock.

11. **MEDIUM — Server-side validation of stock adjustments and warehouse transfer payload**:
    - `backend/controllers/inventory.controller.js:37-125` (`adjustStock`) and `130-253` (`transferStock`):
    - `adjustStock` accepts `adjustType` and defaults to addition for any unrecognized string; `reason` defaults to `"General Adjustment"` if omitted. If an invalid or zero quantity string bypasses the client or is negative, edge cases can cause erratic delta calculations.
    - In `transferStock`, vehicle number and driver fields are not sanitized or length-capped, and transfer between invalid facility codes must return standardized JSON errors with HTTP 400 rather than raw database or generic error messages.
    - **Request**: Add strict input validation using a validation schema or guard conditions: reject `adjust_qty <= 0` or NaN with HTTP 400 Bad Request, restrict `adjustType` strictly to `['add', 'subtract']`, require a non-empty `reason` string of at least 3 characters, and validate that `fromWarehouse` and `toWarehouse` exist in known facility registries and are not identical.
