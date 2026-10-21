import React, { useState } from 'react';
import { Sliders, Plus, Check, ShieldCheck, X } from 'lucide-react';

export default function SettingsMatrix() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings · Approval matrix</h2>
          <p className="text-xs text-gray-500 mt-1">
            Company profile, who-approves what, and who can sign in. Changed from settings by your own admin without a developer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaved(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>{saved ? 'Saved Successfully ✓' : 'Save all changes'}</span>
          </button>
        </div>
      </div>

      {/* Explainer callout */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
        <span className="font-bold text-gray-900">How routing works:</span>
        <p className="text-gray-600">
          Each document goes through the approvers in order. The amount band decides the route. Nobody can approve their own document, and department heads approve only for their own department. Sales orders need approval only when customer is over credit limit or discount is above policy.
        </p>
      </div>

      {/* Purchase Requisition Matrix (Page 20) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Purchase requisition approval route</h3>
          <span className="text-xs text-gray-400">All amounts</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
          <span className="text-gray-500">From PKR:</span>
          <input type="text" readOnly value="0" className="w-16 px-2 py-1 bg-white border border-gray-300 rounded font-mono text-center" />
          <span className="text-gray-500">Up to:</span>
          <input type="text" readOnly value="No limit" className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-center" />
          <span className="text-gray-400">→</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-300 rounded-md font-bold text-gray-800">
            <span>Department head</span>
          </div>
        </div>
      </div>

      {/* Purchase Order Multi-Tier Matrix (Page 20) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Purchase order multi-tier approval bands</h3>
          <span className="text-xs text-gray-400">3 Thresholds</span>
        </div>

        {/* Band 1: 0 to 500,000 */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex flex-wrap items-center gap-3">
          <span className="text-gray-500">Band 1: From 0</span>
          <span className="text-gray-500">Up to:</span>
          <span className="font-mono font-bold text-gray-900">500,000 PKR</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-700">Department head</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-700">Accounts & Finance</span>
        </div>

        {/* Band 2: 500,000 to 2,500,000 */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex flex-wrap items-center gap-3">
          <span className="text-gray-500">Band 2: From 500,000</span>
          <span className="text-gray-500">Up to:</span>
          <span className="font-mono font-bold text-gray-900">2,500,000 PKR</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-700">Department head</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-700">Accounts & Finance</span>
        </div>

        {/* Band 3: 2,500,000 to No limit */}
        <div className="p-3 bg-gray-50 rounded-xl border border-amber-300 text-xs flex flex-wrap items-center gap-3 bg-amber-50/30">
          <span className="text-amber-800 font-bold">Band 3: Above 2.5M</span>
          <span className="text-gray-500">Up to:</span>
          <span className="font-mono font-bold text-gray-900">No limit</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-700">Department head</span>
          <span className="text-gray-400">→</span>
          <span className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-700">Accounts & Finance</span>
          <span className="text-gray-400">→</span>
          <span className="px-2.5 py-1 bg-black text-white font-bold rounded">Chairman & CEO</span>
        </div>
      </div>

      {/* Structured Approval Matrix Policy Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Approval Routing Matrix & Delegation of Authority Table
          </h3>
          <span className="text-xs text-gray-500 font-medium">Configured by Admin (Kamran Ali)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                <th className="py-3.5 px-4">MODULE / DOCUMENT TYPE</th>
                <th className="py-3.5 px-4">AMOUNT THRESHOLD</th>
                <th className="py-3.5 px-4">1ST APPROVER</th>
                <th className="py-3.5 px-4">2ND APPROVER</th>
                <th className="py-3.5 px-4">FINAL SIGN-OFF</th>
                <th className="py-3.5 px-4 text-right">POLICY STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {[
                { doc: 'Purchase Order (Band 1)', threshold: 'Up to PKR 500,000', first: 'Department Head', second: 'Finance Officer', final: 'Director Finance', status: 'Active' },
                { doc: 'Purchase Order (Band 2)', threshold: 'PKR 500K – 2,500,000', first: 'Department Head', second: 'Director Finance', final: 'General Manager', status: 'Active' },
                { doc: 'Purchase Order (Band 3)', threshold: 'Above PKR 2,500,000', first: 'Department Head', second: 'Director Finance', final: 'Chairman & CEO', status: 'Active' },
                { doc: 'Sales Credit Limit Breach', threshold: 'Any limit breach > 0', first: 'Sales Manager', second: 'Director Finance', final: 'Chairman & CEO', status: 'Active' },
                { doc: 'Monthly Payroll Run', threshold: 'Total net salary run', first: 'HR Manager', second: 'Director Finance', final: 'Chairman & CEO', status: 'Active' },
                { doc: 'Inventory Stock Adjustment', threshold: '> 50 units or PKR 50K', first: 'Store Incharge', second: 'Operations Director', final: 'Director Finance', status: 'Active' }
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{row.doc}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-700">{row.threshold}</td>
                  <td className="py-3.5 px-4 text-gray-600">{row.first}</td>
                  <td className="py-3.5 px-4 text-gray-600">{row.second}</td>
                  <td className="py-3.5 px-4 font-bold text-gray-900">{row.final}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
