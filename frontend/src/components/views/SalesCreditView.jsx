import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Printer,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function SalesCreditView({ salesOrder, onApproveOrder }) {
  const [isApproved, setIsApproved] = useState(salesOrder?.status === 'Approved');

  const handleApprove = async () => {
    await onApproveOrder(salesOrder?.so_number || 'SO-2026-0418');
    setIsApproved(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-gray-500">
              {salesOrder?.so_number || 'SO-2026-0418'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isApproved ? 'Approved by CEO' : 'Pending approval'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-1">
            Sales order with credit control · Swat Valley Egg Dealers
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
                <div className="font-bold text-gray-900 mt-0.5">28 Sep 2026</div>
              </div>
              <div>
                <span className="text-gray-400">Customer</span>
                <div className="font-bold text-gray-900 mt-0.5">Swat Valley Egg Dealers</div>
              </div>
              <div>
                <span className="text-gray-400">Warehouse</span>
                <div className="font-bold text-gray-900 mt-0.5">Mardan sales point & store</div>
              </div>
              <div>
                <span className="text-gray-400">Delivery Date</span>
                <div className="font-bold text-gray-900 mt-0.5">1 Oct 2026</div>
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
                <tr>
                  <td className="py-3.5">
                    <div className="font-bold text-gray-900">White eggs Grade A – Large</div>
                    <div className="text-[10px] text-gray-400 font-mono">SE-01-01-02</div>
                  </td>
                  <td className="py-3.5 text-right font-mono">1,800 tray</td>
                  <td className="py-3.5 text-right font-mono">700.00</td>
                  <td className="py-3.5 text-right text-rose-600 font-bold font-mono">8.0%</td>
                  <td className="py-3.5 text-right font-bold font-mono text-gray-900">1,159,200</td>
                </tr>
                <tr>
                  <td className="py-3.5">
                    <div className="font-bold text-gray-900">White eggs Grade A – Extra large</div>
                    <div className="text-[10px] text-gray-400 font-mono">SE-01-01-01</div>
                  </td>
                  <td className="py-3.5 text-right font-mono">600 tray</td>
                  <td className="py-3.5 text-right font-mono">745.00</td>
                  <td className="py-3.5 text-right font-mono text-gray-600">5.0%</td>
                  <td className="py-3.5 text-right font-bold font-mono text-gray-900">424,650</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <div className="text-right">
                <span className="text-xs text-gray-500">Sales tax: Exempt items</span>
                <div className="text-xl font-black text-gray-900 mt-1">
                  Total: PKR 1,583,850
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
                <span>Credit limit exceeded by PKR 961,504</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Discount above 5% on White eggs Grade A – Large</span>
              </div>
            </div>

            {/* Approvers Timeline */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <div className="font-bold text-gray-900">Department head</div>
                  <div className="text-gray-500 text-[11px]">Imran Khattak · approved 1 d ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <div className="font-bold text-gray-900">Accounts & Finance</div>
                  <div className="text-gray-500 text-[11px]">Mujeeb Ullah · approved 11 h ago</div>
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
                    {isApproved ? 'Sana Ullah · Approved' : 'Waiting now for Chairman sign-off'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Credit Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900">Customer Credit Summary</h3>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 font-bold text-center">
              121% of credit limit used including this order
            </div>
            <div className="space-y-2 pt-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Credit limit:</span>
                <span className="font-bold text-gray-900">4,500,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Outstanding invoices:</span>
                <span className="font-bold text-gray-900">3,877,654</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1">
                <span className="text-gray-500">Total exposure:</span>
                <span className="font-bold text-rose-600">5,461,504</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Overdue:</span>
                <span className="font-bold">3,088,838</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
