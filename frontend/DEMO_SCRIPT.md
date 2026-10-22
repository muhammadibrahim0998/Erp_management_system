# Yousafzai Agri Foods ERP — Demonstration Script

This document details the three core operational cycles for demonstration and user acceptance testing of the Yousafzai Agri Foods (YAF) ERP. Every step documents the sequence of screens, the recommended user credentials and role, the expected audience observation, and verification status against the backend API.

---

## Verified User Logins

The following accounts are pre-seeded in the database (demo accounts use the seed password configured in backend/initDb.js; ask the project owner):

| Role | Name | Email | Department |
|---|---|---|---|
| **Chairman & CEO** | Sana Ullah | `ceo@yaf.com` | Executive |
| **General Manager** | Khalid Mehmood | `gm@yaf.com` | Executive |
| **Director Operations** | Saeed ur Rehman | `operations@yaf.com` | Operations |
| **Director Finance** | Mujeeb Ullah | `finance@yaf.com` | Finance |
| **Plant Manager** | Usama Tariq | `plant@yaf.com` | Plant |
| **Production Manager** | Farhan Ali | `production@yaf.com` | Production |
| **Gate Officer** | Gul Rehman | `gate@yaf.com` | Security |
| **QC Cell** | Dr. Asma Noor | `qc@yaf.com` | Quality |
| **Raw Material Store** | Usman Ali | `usman.ali@yaf.com` | Inventory |
| **Finish Store & Delivery**| Waqas Ahmed | `waqas.ahmed@yaf.com` | Logistics |
| **Procurement** | Waqar Ahmad | `procurement@yaf.com` | Purchasing |
| **Sales Manager** | Imran Khattak | `sales@yaf.com` | Sales |
| **Sales Officer** | Bilal Yousafzai | `bilal.yousafzai@yaf.com` | Sales |
| **Accounts Officer** | Hamza Khan | `hamza.khan@yaf.com` | Finance |
| **HR Manager** | Nadia Shah | `hr@yaf.com` | HR |
| **ERP Admin** | Kamran Ali | `admin@yaf.com` | IT |

---

## Cycle 1: Buy to Stock (Procurement → Gate → QC → Store)

### 1.1 Create Purchase Order
- **Role to Log In**: Procurement (`procurement@yaf.com`) or Admin (`admin@yaf.com`)
- **Screen**: **Procurement** (Sidebar → *Procurement*)
- **Audience Sees**:
  - The list of active purchase orders with columns: Number, Date, Supplier, Status, Created By, Amount (PKR).
  - If no orders exist, an empty state: `"No purchase orders yet"`.
- **Action**:
  1. Click **"New purchase order"**.
  2. Enter Supplier name (e.g. `Peshawar Pulp Trays`).
  3. Enter Item description (e.g. `Molded Egg Trays 30-Egg`).
  4. Enter Quantity (e.g. `1000`) and Unit Price (e.g. `25`).
  5. Note that Total Amount computes automatically (`PKR 25,000.00`).
  6. Click **"Save as Draft"**.
- **Backend Verification**:
  - `POST /api/procurement/pos` — **VERIFIED** (HTTP 201, creates record in MySQL `purchase_orders`).
  - `GET /api/procurement/pos` — **VERIFIED** (HTTP 200, refreshed into table).

### 1.2 Executive Approval
- **Role to Log In**: General Manager (`gm@yaf.com`) or CEO (`ceo@yaf.com`)
- **Screen**: **Approvals** (Sidebar → *Approvals*)
- **Audience Sees**:
  - Pending approval task card in "Waiting for me" tab.
  - Action buttons: "Approve", "Return", "Reject".
- **Action**:
  1. Click **"Reject"** to test validation: verify modal enforces a non-empty rejection reason before submission.
  2. Alternatively, click **"Approve"**: verify double-submit protection disables buttons with a loading spinner while the request runs.
- **Backend Verification**:
  - `GET /api/approvals` — **VERIFIED** (HTTP 200, reads `workflow_tasks`).
  - `POST /api/approvals/:id/action` — **VERIFIED** (HTTP 200, updates task status).
  - *Rejection Reason persistence*: **NOT VERIFIED** (client enforces reason validation; backend controller currently ignores rejection reason payload).

### 1.3 Inward Vehicle Arrival
- **Role to Log In**: Gate Officer (`gate@yaf.com`)
- **Screen**: **Gate & Security** (Sidebar → *Gate & Security*)
- **Audience Sees**:
  - "Inbound vehicles on site" table or `"No gate passes yet"` empty state.
- **Action**:
  1. Click **"Vehicle arrived"**.
  2. Enter Vehicle Registration Number (e.g. `CSD-4412`).
  3. Enter Supplier / Party Name (e.g. `Peshawar Pulp Trays`).
  4. Select Pass Type: `Inward (Receiving / Goods Arrival)`.
  5. Click **"Confirm & Print Pass"**.
- **Backend Verification**:
  - `POST /api/gate` — **VERIFIED** (HTTP 201, generates sequence `GPI-2026-XXXX`).
  - `GET /api/gate` — **VERIFIED** (HTTP 200, reloads inbound vehicle queue).

### 1.4 Quality Inspection & Goods Receipt (GRN)
- **Role to Log In**: QC Cell (`qc@yaf.com`)
- **Screen**: **QC & Goods Receipt** (Sidebar → *QC Goods Receipt*)
- **Audience Sees**:
  - Quality parameters table (Egg weight, cracked %, dirty %, temperature, hygiene checklist).
  - Screen displays `<DemoBadge />` indicating demo/fixed baseline data.
- **Action**: Click "Accept & Receive in Store".
- **Backend Verification**:
  - **NOT VERIFIED** (No `/api/qc` backend endpoint exists; screen operates on mock state).

### 1.5 Inventory & Warehouse Verification
- **Role to Log In**: Raw Material Store (`usman.ali@yaf.com`) or Admin (`admin@yaf.com`)
- **Screen**: **Inventory** (Sidebar → *Inventory*)
- **Audience Sees**:
  - Multi-warehouse stock balances: Mardan (MRD), Attock (ATK), Charsadda (CCF), Peshawar (PHF), Risalpur Raw Materials (RSK RM).
- **Backend Verification**:
  - `GET /api/inventory` — **VERIFIED** (HTTP 200, reads `inventory_items`).
  - `POST /api/inventory/adjust` — **VERIFIED** (HTTP 200, posts stock adjustment and writes to `inventory_transactions`).

---

## Cycle 2: Order to Cash (Sales → Credit Release → POS Checkout → Finance)

### 2.1 Sales Order & Credit Exposure
- **Role to Log In**: Sales Manager (`sales@yaf.com`)
- **Screen**: **Sales & Credit** (Sidebar → *Sales & Credit*)
- **Audience Sees**:
  - Sales order details, customer exposure, credit limit bar, payment terms.
- **Action**: Click "Approve Order" to trigger approval workflow.
- **Backend Verification**:
  - `GET /api/sales/orders` — **VERIFIED** (HTTP 200, returns orders).
  - `POST /api/sales/approve` — **VERIFIED** (HTTP 200).

### 2.2 Finance Credit Release
- **Role to Log In**: Director Finance (`finance@yaf.com`)
- **Screen**: **Approvals** (Sidebar → *Approvals*)
- **Audience Sees**:
  - High-priority task for credit limit release or invoice clearing.
- **Action**: Review details and approve.
- **Backend Verification**:
  - `POST /api/approvals/:id/action` — **VERIFIED** (HTTP 200).

### 2.3 POS Cash / Credit Counter Sale
- **Role to Log In**: Sales Officer (`bilal.yousafzai@yaf.com`)
- **Screen**: **POS & Retail** (Sidebar → *POS / Retail*)
- **Audience Sees**:
  - Product catalog (Eggs, Liquid Eggs, Pulp Trays).
  - Customer selection banner (marked with `<DemoBadge />` for demo dealer list).
- **Action**:
  1. Add items to cart (e.g. `2x Table Eggs (30-Egg Tray)`).
  2. Select Customer (`Walk-in Retail Cash` or dealer).
  3. Enter Payment Amount.
  4. Click **"Complete Sale & Print Receipt"**.
- **Backend Verification**:
  - `POST /api/pos/checkout` — **VERIFIED** (HTTP 200, atomically writes to `pos_orders`, `pos_order_items`, and updates `inventory_transactions`).
  - `GET /api/pos/orders` — **VERIFIED** (HTTP 200).
  - *Customer API list*: **NOT VERIFIED** (No `/api/customers` route exists; dealers loaded from demo array).

### 2.4 Finance Overview
- **Role to Log In**: Accounts Officer (`hamza.khan@yaf.com`) or Director Finance (`finance@yaf.com`)
- **Screen**: **Finance** (Sidebar → *Finance*)
- **Audience Sees**:
  - Revenue, receivables, debtor balances, cash positions.
- **Backend Verification**:
  - `GET /api/finance/overview` — **VERIFIED** (HTTP 200).

### 2.5 Outward Dispatch Gate Pass
- **Role to Log In**: Gate Officer (`gate@yaf.com`)
- **Screen**: **Gate & Security** (Sidebar → *Gate & Security*)
- **Audience Sees**:
  - "Outbound vehicles at the gate" section.
- **Backend Verification**:
  - Outward gate pass automated queue: **NOT VERIFIED** (displays `"No vehicles waiting to go out"` placeholder; inward passes only are fully wired to `/api/gate`).

---

## Cycle 3: Production Cycle (Production Board → Live Ops → Stock Ledger)

### 3.1 Production Kanban Board
- **Role to Log In**: Production Manager (`farhan.ali@yaf.com` / `production@yaf.com`)
- **Screen**: **Production Board** (Sidebar → *Production Board*)
- **Audience Sees**:
  - Kanban columns:
    1. *With GM*
    2. *Shell Egg Washing*
    3. *Breaking & Separation*
    4. *Pasteurization*
    5. *Finished Goods Packing*
    6. *Quality Cleared*
  - Work orders with calculated egg counts, tray counts, duration, and batch costs.
- **Action**:
  1. Click **"Move to Next Stage"** on a work order card.
  2. Verify that the order transitions forward to the next stage in sequence.
- **Backend Verification**:
  - `GET /api/production/board` — **VERIFIED** (HTTP 200, reads `production_orders`).
  - `POST /api/production/move` — **VERIFIED** (HTTP 200, updates stage in `production_orders`).

### 3.2 Live Operations Monitoring
- **Role to Log In**: Director Operations (`operations@yaf.com`) or Plant Manager (`plant@yaf.com`)
- **Screen**: **Live Operations** (Sidebar → *Live Operations*)
- **Audience Sees**:
  - Real-time plant telemetry: Pasteurizer Core Temp (64.5°C), Breaking Line Speed (18,000 eggs/hr), Cold Room Temperature (3.8°C), CIP Sanitization status.
- **Backend Verification**:
  - `GET /api/live-operations` — **VERIFIED** (HTTP 200).

### 3.3 Finished Stock & Ledger Verification
- **Role to Log In**: Finish Store & Delivery (`waqas.ahmed@yaf.com`) or Admin (`admin@yaf.com`)
- **Screen**: **Inventory** (Sidebar → *Inventory*)
- **Audience Sees**:
  - Finished goods inventory quantities: Whole Liquid Egg (kg), Liquid Egg Yolk (kg), Liquid Egg Albumin (kg).
- **Backend Verification**:
  - `GET /api/inventory` — **VERIFIED** (HTTP 200).
  - `GET /api/inventory/ledger` — **VERIFIED** (HTTP 200, returns complete audit trail from `inventory_transactions`).

---

## Summary of Screen Verification Status

| Screen | Primary API Endpoint | Status | Notes |
|---|---|---|---|
| **Chairman Dashboard** | `GET /api/dashboard/chairman` | **VERIFIED** | Connected to live DB; handles empty state. |
| **Approvals Inbox** | `GET /api/approvals`, `POST /api/approvals/:id/action` | **VERIFIED** | Reject reason validated on client; server doesn't store reason. |
| **Procurement** | `GET /api/procurement/pos`, `POST /api/procurement/pos` | **VERIFIED** | Live DB creation, auto-total, status display. |
| **Gate Security** | `GET /api/gate`, `POST /api/gate` | **VERIFIED** | Inward pass creation live; outward pass queue NOT VERIFIED. |
| **QC & Goods Receipt** | None (`/api/qc`) | **NOT VERIFIED** | Demo data screen marked with `<DemoBadge />`. |
| **Inventory** | `GET /api/inventory`, `POST /api/inventory/adjust` | **VERIFIED** | Multi-warehouse balances from DB. |
| **Production Board** | `GET /api/production/board`, `POST /api/production/move` | **VERIFIED** | Live Kanban moves across stages. |
| **POS & Retail** | `POST /api/pos/checkout`, `GET /api/pos/orders` | **VERIFIED** | Real checkout & stock deduction. Customer list NOT VERIFIED (demo). |
| **Sales & Credit** | `GET /api/sales/orders`, `POST /api/sales/approve` | **VERIFIED** | Live orders list. |
| **Finance** | `GET /api/finance/overview` | **VERIFIED** | Live finance summary. |
| **Live Operations** | `GET /api/live-operations` | **VERIFIED** | Plant sensor telemetry. |
| **Payroll** | `GET /api/payroll`, `POST /api/payroll/generate` | **VERIFIED** | Payroll run generation. |
