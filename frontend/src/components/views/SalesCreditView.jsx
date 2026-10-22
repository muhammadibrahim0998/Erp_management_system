import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Printer,
  ShieldAlert,
  ArrowRight,
  ShoppingCart
} from 'lucide-react';

export default function SalesCreditView({ salesOrder, onApproveOrder }) {
  const [isApproved, setIsApproved] = useState(salesOrder?.status === 'Approved');

  if (!salesOrder) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto" />
        <h3 className="text-base font-bold text-gray-900">No sales orders yet</h3>
        <p className="text-xs text-gray-500">
          Sales orders created in the system will appear here for credit check and approvals.
        </p>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!salesOrder.so_number) return;
    await onApproveOrder(salesOrder.so_number);
    setIsApproved(true);
  };

  const items = Array.isArray(salesOrder.items) ? salesOrder.items : [];
  const totalAmount = Number(salesOrder.total_amount || salesOrder.amount || 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-gray-500">
              {salesOrder.so_number}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isApproved ? 'Approved by CEO' : 'Pending approval'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-1">
            Sales order with credit control · {salesOrder.customer || salesOrder.customer_name || 'Customer'}
          </h2>
          <p className="text-xs text-gray-500">
            Dealer credit limits, partner-tier discounts and sales tax rules are checked as the order is typed. Breaches route to approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isApproved ? (
            <>
              <button className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100">
                Reject
              </button>
              <button className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
                Return
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Exception</span>
              </button>
            </>
          ) : (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Approved & Cleared for Dispatch</span>
            </span>
          )}
          <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Printer className="w-4 h-4" />
          </button>
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
                <div className="font-bold text-gray-900 mt-0.5">{salesOrder.date || '—'}</div>
              </div>
              <div>
                <span className="text-gray-400">Customer</span>
                <div className="font-bold text-gray-900 mt-0.5">{salesOrder.customer || salesOrder.customer_name || '—'}</div>
              </div>
              <div>
                <span className="text-gray-400">Warehouse</span>
                <div className="font-bold text-gray-900 mt-0.5">{salesOrder.warehouse || 'Mardan sales point & store'}</div>
              </div>
              <div>
                <span className="text-gray-400">Delivery Date</span>
                <div className="font-bold text-gray-900 mt-0.5">{salesOrder.delivery_date || '—'}</div>
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
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-gray-400">No line items</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5">
                        <div className="font-bold text-gray-900">{item.name || item.item_name || 'Item'}</div>
                        {(item.code || item.item_code) && (
                          <div className="text-[10px] text-gray-400 font-mono">{item.code || item.item_code}</div>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-mono">{item.qty || item.quantity || 0} {item.unit || 'tray'}</td>
                      <td className="py-3.5 text-right font-mono">{Number(item.rate || item.unit_price || 0).toFixed(2)}</td>
                      <td className="py-3.5 text-right text-rose-600 font-bold font-mono">{item.discount || '0%'}</td>
                      <td className="py-3.5 text-right font-bold font-mono text-gray-900">
                        {Number(item.amount || item.total || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <div className="text-right">
                <span className="text-xs text-gray-500">Sales tax: Exempt items</span>
                <div className="text-xl font-black text-gray-900 mt-1">
                  Total: PKR {totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
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
                <span>Credit limit check active</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Standard partner discount policy applied</span>
              </div>
            </div>

            {/* Approvers Timeline */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <div className="font-bold text-gray-900">Department head</div>
                  <div className="text-gray-500 text-[11px]">Approved</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <div className="font-bold text-gray-900">Accounts & Finance</div>
                  <div className="text-gray-500 text-[11px]">Approved</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                  isApproved ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                }`}>
                  {isApproved ? '✓' : '●'}
                </span>
                <div>
                  <div className="font-bold text-gray-900">CEO Final Approval</div>
                  <div className="text-gray-500 text-[11px]">
                    {isApproved ? 'Approved by CEO' : 'Waiting now for Chairman sign-off'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Credit Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900">Customer Credit Summary</h3>
            <div className="p-2.5 rounded-lg bg-gray-50 text-gray-700 font-bold text-center">
              Credit control active
            </div>
            <div className="space-y-2 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Amount:</span>
                <span className="font-bold text-gray-900">{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-gray-900">{salesOrder.status || 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
