import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileText,
  CreditCard,
  Plus,
  Layers
} from 'lucide-react';
import operationsService from '../../services/operationsService';

const APPROVER_ROLES = [
  'Chairman & CEO',
  'General Manager',
  'Director Finance',
  'Sales Manager',
  'ERP Admin'
];

const APPROVED_OR_LATER_STATUSES = ['Approved', 'Invoiced', 'Paid'];

function getApprovalSteps(order) {
  if (!order) return [];
  const creditBreach = Number(order.credit_breach) || 0;
  const status = order.status || 'Draft';
  const approvalStepText = order.approval_step || 'Not required';

  const creditCheckStep = {
    label: 'Credit check',
    state: creditBreach > 0 ? 'breach' : 'ok',
    detail: creditBreach > 0
      ? `Credit breach: PKR ${creditBreach.toLocaleString()}`
      : 'Within limit (PKR 0 breach)'
  };

  let ceoState = 'not required';
  if (creditBreach > 0) {
    ceoState = APPROVED_OR_LATER_STATUSES.includes(status) ? 'done' : 'waiting';
  } else if (APPROVED_OR_LATER_STATUSES.includes(status)) {
    ceoState = 'done';
  }

  const ceoApprovalStep = {
    label: 'CEO approval',
    state: ceoState,
    detail: approvalStepText
  };

  return [creditCheckStep, ceoApprovalStep];
}

export default function SalesCreditView({
  salesOrders = [],
  salesOrder: initialOrder,
  currentUser,
  onApproveOrder,
  onRefresh,
  showNotification
}) {
  const [ordersList, setOrdersList] = useState(salesOrders.length > 0 ? salesOrders : (initialOrder ? [initialOrder] : []));
  const [selectedSoNumber, setSelectedSoNumber] = useState(initialOrder?.so_number || ordersList[0]?.so_number || '');
  const [orderDetails, setOrderDetails] = useState(null);
  const [_isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // New Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newWarehouse, setNewWarehouse] = useState('Mardan sales point & store');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newQty1, setNewQty1] = useState('');
  const [newRate1, setNewRate1] = useState('');
  const [newDisc1, setNewDisc1] = useState('0');
  const [modalError, setModalError] = useState('');

  // Sync orders list from props
  useEffect(() => {
    if (salesOrders && salesOrders.length > 0) {
      setOrdersList(salesOrders);
      if (!selectedSoNumber || !salesOrders.find(o => o.so_number === selectedSoNumber)) {
        setSelectedSoNumber(salesOrders[0].so_number);
      }
    }
  }, [salesOrders]);

  // Fetch full details of selected order (including sequence invoice & payment records)
  const fetchOrderDetails = async (soNumber) => {
    if (!soNumber) return;
    setIsLoadingDetails(true);
    setActionError(null);
    try {
      const details = await operationsService.getSalesOrderDetails(soNumber);
      setOrderDetails(details);
    } catch (err) {
      console.warn('Could not fetch deep details, using basic row:', err);
      const fallback = ordersList.find(o => o.so_number === soNumber) || null;
      setOrderDetails(fallback);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedSoNumber) {
      fetchOrderDetails(selectedSoNumber);
    }
  }, [selectedSoNumber]);

  // Active Order Object
  const currentOrder = orderDetails || ordersList.find(o => o.so_number === selectedSoNumber) || null;

  const status = currentOrder?.status || 'Draft';
  const isApproved = status === 'Approved' || status === 'Invoiced' || status === 'Paid';
  const isInvoiced = status === 'Invoiced' || status === 'Paid';
  const isPaid = status === 'Paid';

  const userRole = currentUser?.role || '';
  const canApprove = APPROVER_ROLES.includes(userRole);

  // 1. Approve Action
  const handleApprove = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (onApproveOrder) {
        await onApproveOrder(currentOrder.so_number);
      } else {
        await operationsService.approveSalesOrder(currentOrder.so_number);
      }
      if (showNotification) showNotification(`Sales order ${currentOrder.so_number} approved`);
      await fetchOrderDetails(currentOrder.so_number);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.message || 'Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Generate Commercial Invoice Action
  const handleGenerateInvoice = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await operationsService.invoiceSalesOrder(currentOrder.so_number);
      if (showNotification) showNotification(`Invoice ${res.invoice?.invoice_no || ''} generated`);
      await fetchOrderDetails(currentOrder.so_number);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.message || 'Invoice generation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Record Payment Action
  const handleRecordPayment = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await operationsService.recordSalesPayment(currentOrder.so_number, {
        amount: currentOrder.total_amount,
        payment_method: 'Bank Transfer'
      });
      if (showNotification) showNotification(`Payment ${res.payment?.payment_no || ''} recorded`);
      await fetchOrderDetails(currentOrder.so_number);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.message || 'Recording payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Create New Sales Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!newCustomer.trim()) {
      setModalError('Customer name is required');
      return;
    }
    if (!newDeliveryDate.trim()) {
      setModalError('Delivery date is required');
      return;
    }
    const qty = Number(newQty1);
    if (!qty || qty <= 0) {
      setModalError('Quantity must be greater than 0');
      return;
    }
    const rate = Number(newRate1);
    if (!rate || rate <= 0) {
      setModalError('Rate must be greater than 0');
      return;
    }
    const disc = Number(newDisc1);
    if (isNaN(disc) || disc < 0 || disc > 100) {
      setModalError('Discount must be between 0 and 100%');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const items = [
        {
          item_code: 'SE-01-01-02',
          item_name: 'White eggs Grade A – Large',
          quantity: qty,
          rate: rate,
          discount_percent: disc,
          total_amount: qty * rate * (1 - disc / 100)
        }
      ];

      // credit limit and exposure are decided by the server
      const res = await operationsService.createSalesOrder({
        customer: newCustomer.trim(),
        warehouse: newWarehouse,
        delivery_date: newDeliveryDate.trim(),
        items
      });

      setShowCreateModal(false);
      setNewCustomer('');
      setNewDeliveryDate('');
      setNewQty1('');
      setNewRate1('');
      setNewDisc1('0');
      setModalError('');
      const orderNumber = res?.so_number || res?.order?.so_number || '';
      if (showNotification) showNotification(`Created Sales Order ${orderNumber}`);
      if (onRefresh) await onRefresh();
      if (orderNumber) {
        setSelectedSoNumber(orderNumber);
      }
    } catch (err) {
      setModalError(err.message || 'Order creation failed');
      setActionError(err.message || 'Order creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Error Notification */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
        </div>
      )}

      {/* Orders Selector Bar & New Order Button */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Orders ({ordersList.length}):
          </span>
          <div className="flex items-center gap-2">
            {ordersList.map((ord) => (
              <button
                key={ord.so_number}
                onClick={() => setSelectedSoNumber(ord.so_number)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 shrink-0 ${
                  selectedSoNumber === ord.so_number
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{ord.so_number}</span>
                <span className={`w-2 h-2 rounded-full ${
                  ord.status === 'Paid' ? 'bg-emerald-400' :
                  ord.status === 'Invoiced' ? 'bg-blue-400' :
                  ord.status === 'Approved' ? 'bg-indigo-400' : 'bg-amber-400'
                }`} />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sales Order</span>
        </button>
      </div>

      {/* Top Banner & Header / Empty State */}
      {ordersList.length === 0 || !currentOrder ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
          <h3 className="text-base font-bold text-gray-900">No sales orders yet</h3>
          <p className="text-xs text-gray-500 mt-1">
            Sales orders created in the system will appear here for credit check and approvals.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-gray-500">
              {currentOrder.so_number}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              currentOrder.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              currentOrder.status === 'Invoiced' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              currentOrder.status === 'Approved' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
              'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {currentOrder.status}
            </span>
            {currentOrder.approval_step && (
              <span className="text-[11px] text-gray-500">
                · {currentOrder.approval_step}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-1">
            {currentOrder.customer}
          </h2>
          <p className="text-xs text-gray-500">
            Dealer credit limits, partner-tier discounts and sales tax rules are checked as the order is typed. Breaches route to approval.
          </p>
        </div>

        {/* Dynamic Action Buttons based on order-to-cash stage */}
        <div className="flex items-center gap-2 shrink-0">
          {currentOrder.status === 'Pending approval' && (
            <>
              <button
                disabled={isSubmitting || !canApprove}
                onClick={handleApprove}
                title={!canApprove ? 'Requires Approver Role (CEO, GM, Director Finance, Sales Manager)' : ''}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition shadow-sm flex items-center gap-1.5 ${
                  canApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed opacity-70'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{canApprove ? 'Approve Exception' : 'Approval Restricted'}</span>
              </button>
            </>
          )}

          {currentOrder.status === 'Approved' && (
            <button
              disabled={isSubmitting}
              onClick={handleGenerateInvoice}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Commercial Invoice</span>
            </button>
          )}

          {currentOrder.status === 'Invoiced' && (
            <button
              disabled={isSubmitting}
              onClick={handleRecordPayment}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment Received</span>
            </button>
          )}

          {currentOrder.status === 'Paid' && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ Fully Settled & Completed</span>
            </span>
          )}

          <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Order to Cash Process Tracker (Stage 1 -> Stage 2 -> Stage 3 -> Stage 4) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Order to Cash Lifecycle Progression
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Step 1: Sales Order */}
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <div className="font-bold text-emerald-900">1. Order Created</div>
              <div className="font-mono text-[10px] text-emerald-700">{currentOrder.so_number}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">{currentOrder.order_date}</div>
            </div>
          </div>

          {/* Step 2: Approval */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isApproved ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-white ${
              isApproved ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
            }`}>
              {isApproved ? '✓' : '2'}
            </div>
            <div>
              <div className={`font-bold ${isApproved ? 'text-emerald-900' : 'text-amber-900'}`}>
                2. Credit Approval
              </div>
              <div className={`text-[10px] ${isApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isApproved ? 'Approved by CEO' : 'Pending sign-off'}
              </div>
            </div>
          </div>

          {/* Step 3: Invoice */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isInvoiced ? 'border-emerald-200 bg-emerald-50' :
            isApproved ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-white ${
              isInvoiced ? 'bg-emerald-600' : isApproved ? 'bg-blue-600' : 'bg-gray-400'
            }`}>
              {isInvoiced ? '✓' : '3'}
            </div>
            <div>
              <div className={`font-bold ${isInvoiced ? 'text-emerald-900' : isApproved ? 'text-blue-900' : 'text-gray-600'}`}>
                3. Commercial Invoice
              </div>
              <div className={`text-[10px] font-mono ${isInvoiced ? 'text-emerald-700' : 'text-gray-500'}`}>
                {currentOrder.invoice?.invoice_no || (isInvoiced ? 'Generated' : 'Awaiting approval')}
              </div>
            </div>
          </div>

          {/* Step 4: Payment */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isPaid ? 'border-emerald-200 bg-emerald-50' :
            isInvoiced ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50 opacity-60'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 text-white ${
              isPaid ? 'bg-emerald-600' : isInvoiced ? 'bg-amber-500' : 'bg-gray-400'
            }`}>
              {isPaid ? '✓' : '4'}
            </div>
            <div>
              <div className={`font-bold ${isPaid ? 'text-emerald-900' : isInvoiced ? 'text-amber-900' : 'text-gray-600'}`}>
                4. Payment & Cash
              </div>
              <div className={`text-[10px] font-mono ${isPaid ? 'text-emerald-700' : 'text-gray-500'}`}>
                {currentOrder.payments && currentOrder.payments.length > 0
                  ? currentOrder.payments[0].payment_no
                  : (isPaid ? 'Paid' : 'Unpaid')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Order Details & Approval Route */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items in Order */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pb-4 border-b border-gray-100">
              <div>
                <span className="text-gray-400">Date</span>
                <div className="font-bold text-gray-900 mt-0.5">{currentOrder.order_date || '—'}</div>
              </div>
              <div>
                <span className="text-gray-400">Customer</span>
                <div className="font-bold text-gray-900 mt-0.5">{currentOrder.customer || '—'}</div>
              </div>
              <div>
                <span className="text-gray-400">Warehouse</span>
                <div className="font-bold text-gray-900 mt-0.5">{currentOrder.warehouse || 'Mardan sales point & store'}</div>
              </div>
              <div>
                <span className="text-gray-400">Delivery Date</span>
                <div className="font-bold text-gray-900 mt-0.5">{currentOrder.delivery_date || '—'}</div>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium">
                  <th className="pb-3">ITEM</th>
                  <th className="pb-3 text-right">QTY</th>
                  <th className="pb-3 text-right">RATE</th>
                  <th className="pb-3 text-right">DISC %</th>
                  <th className="pb-3 text-right">AMOUNT (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {currentOrder.items && currentOrder.items.length > 0 ? (
                  currentOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5">
                        <div className="font-bold text-gray-900">{it.item_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{it.item_code}</div>
                      </td>
                      <td className="py-3.5 text-right font-mono">{Number(it.quantity).toLocaleString()}</td>
                      <td className="py-3.5 text-right font-mono">{Number(it.rate).toFixed(2)}</td>
                      <td className="py-3.5 text-right font-mono text-gray-600">{Number(it.discount_percent || 0).toFixed(1)}%</td>
                      <td className="py-3.5 text-right font-bold font-mono text-gray-900">{Number(it.total_amount).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 italic">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-xs text-gray-500 font-mono">
                Sequence Ref: <span className="font-bold text-gray-800">{currentOrder.so_number}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Sales tax: Exempt items</span>
                <div className="text-xl font-black text-gray-900 mt-1">
                  Total: PKR {Number(currentOrder.total_amount).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Invoices and Payments Generated for this Order */}
          {(currentOrder.invoice || (currentOrder.payments && currentOrder.payments.length > 0)) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Generated Documents (Sequence Tracked)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {currentOrder.invoice && (
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-900">Commercial Invoice</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentOrder.invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {currentOrder.invoice.status}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-blue-950">{currentOrder.invoice.invoice_no}</div>
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>Amount: PKR {Number(currentOrder.invoice.total_amount).toLocaleString()}</span>
                      <span>{currentOrder.invoice.invoice_date}</span>
                    </div>
                  </div>
                )}

                {currentOrder.payments && currentOrder.payments.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-900">Payment Voucher</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Received
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-emerald-950">{currentOrder.payments[0].payment_no}</div>
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>Paid: PKR {Number(currentOrder.payments[0].amount).toLocaleString()}</span>
                      <span>{currentOrder.payments[0].payment_method}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Approval Route & Customer Credit Box (Page 14) */}
        <div className="space-y-6">
          {/* Approval Route with Breaches */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Approval route & Breaches
            </h3>

            {/* Breach tags */}
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Credit limit exceeded by PKR {Number(currentOrder.credit_breach || 0).toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Discount policy check applied</span>
              </div>
            </div>

            {/* Approvers Timeline */}
            <div className="space-y-3 pt-2 text-xs">
              {getApprovalSteps(currentOrder).map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 text-white ${
                    step.state === 'done' || step.state === 'ok'
                      ? 'bg-emerald-600'
                      : step.state === 'breach'
                      ? 'bg-rose-600'
                      : step.state === 'waiting'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}>
                    {step.state === 'done' || step.state === 'ok' ? '✓' : step.state === 'waiting' ? '●' : step.state === 'breach' ? '!' : '—'}
                  </span>
                  <div>
                    <div className="font-bold text-gray-900">{step.label}</div>
                    <div className="text-gray-500 text-[11px]">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Credit Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900">Customer Credit Summary</h3>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 font-bold text-center">
              {currentOrder.credit_limit && currentOrder.credit_limit > 0
                ? `${Math.round(((currentOrder.current_exposure || 0) / currentOrder.credit_limit) * 100)}% of credit limit used including this order`
                : 'Credit status calculated on order review'}
            </div>
            <div className="space-y-2 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Credit limit:</span>
                <span className="font-bold text-gray-900">PKR {Number(currentOrder.credit_limit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current exposure:</span>
                <span className="font-bold text-rose-600">PKR {Number(currentOrder.current_exposure || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 text-rose-700">
                <span>Credit Breach:</span>
                <span className="font-bold">PKR {Number(currentOrder.credit_breach || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modal: Create New Sales Order */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900">Create New Sales Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {modalError}
                </div>
              )}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Customer</label>
                <input
                  type="text"
                  required
                  placeholder="Enter customer name"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Warehouse</label>
                  <input
                    type="text"
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-700 block">Item: White eggs Grade A – Large (SE-01-01-02)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-500 mb-0.5">Quantity (trays)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="1800"
                      value={newQty1}
                      onChange={(e) => setNewQty1(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-0.5">Rate (PKR)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="700"
                      value={newRate1}
                      onChange={(e) => setNewRate1(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-0.5">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={newDisc1}
                      onChange={(e) => setNewDisc1(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white"
                    />
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-gray-800 pt-1">
                  Est. Total: PKR {((Number(newQty1) || 0) * (Number(newRate1) || 0) * (1 - (Number(newDisc1) || 0)/100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-[11px] text-gray-400">
                * Document number will be atomically assigned from the database sequence (SO-2026-XXXX).
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
