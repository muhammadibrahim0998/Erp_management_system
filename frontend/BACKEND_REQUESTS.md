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
