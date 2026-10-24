import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  ShieldCheck,
  Package,
  Printer,
  ArrowRight,
  FileText
} from 'lucide-react';

export default function QcGoodsReceipt({ onReceiveStore }) {
  const [received, setReceived] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-gray-500">GRN-2026-0611</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {received ? 'Received in Store' : 'GRN issued — awaiting store'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mt-1">
            Goods receipt (GRN) · Charsadda Supply Partners
          </h2>
          <p className="text-xs text-gray-500">
            Product quality, weight, defect rate, packaging integrity, temperature, and vehicle hygiene — checked against limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReceived(true)}
            disabled={received}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm ${
              received ? 'bg-emerald-600 text-white' : 'bg-black text-white hover:bg-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{received ? 'Received into Store ✓' : 'Receive into store'}</span>
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5-Step Process Stepper (Page 9) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              ✓ 1. Gate
            </span>
            <div className="text-[11px] text-gray-500 mt-1">Gate pass number issued</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              ✓ 2. QC cell
            </span>
            <div className="text-[11px] text-emerald-700 mt-1">Measures & issues GRN</div>
          </div>
          <div className={`p-3 rounded-xl border text-xs ${received ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40'}`}>
            <span className={`font-bold flex items-center gap-1 ${received ? 'text-emerald-800' : 'text-amber-800'}`}>
              {received ? '✓' : '●'} 3. Store
            </span>
            <div className="text-[11px] text-gray-600 mt-1">Unloads & records in inventory</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs opacity-70">
            <span className="font-bold text-gray-500">4. In store</span>
            <div className="text-[11px] text-gray-400 mt-1">Stock available for sale</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs opacity-70">
            <span className="font-bold text-gray-500">5. Gate</span>
            <div className="text-[11px] text-gray-400 mt-1">Empty vehicle out</div>
          </div>
        </div>
      </div>

      {/* QC Deductions Callout (Page 9) */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">QC result: Passed with deductions</span>
          <p className="text-amber-800 mt-0.5">
            Inspected by <strong>Dr. Asma Noor</strong> · 29 Sept, 22:41 · vehicle CSD-2298 (GPI-2026-0003) — <strong>10 units of damaged goods rejected</strong> and returned with the driver.
          </p>
        </div>
      </div>

      {/* Vehicle Inspection Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
          <span className="text-gray-400 uppercase font-medium text-[10px]">Vehicle</span>
          <div className="font-bold text-gray-900 text-sm mt-1">General — ventilated</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
          <span className="text-gray-400 uppercase font-medium text-[10px]">Vehicle temperature</span>
          <div className="font-bold text-gray-900 text-sm mt-1">24 °C</div>
          <span className="text-[10px] text-emerald-600 font-semibold">spec ≤ 30 °C (general)</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
          <span className="text-gray-400 uppercase font-medium text-[10px]">Hygiene</span>
          <div className="font-bold text-emerald-600 text-sm mt-1">Clean</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
          <span className="text-gray-400 uppercase font-medium text-[10px]">Pests</span>
          <div className="font-bold text-emerald-600 text-sm mt-1">None</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Inspection & Receipt Quantities</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-400 font-medium">
              <th className="pb-3">ITEM</th>
              <th className="pb-3">ORDERED</th>
              <th className="pb-3">RECEIVED</th>
              <th className="pb-3">ACCEPTED</th>
              <th className="pb-3">REJECTED</th>
              <th className="pb-3 text-right">AMOUNT (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            <tr>
              <td className="py-4">
                <div className="font-bold text-gray-900">Standard Product Item – Medium</div>
                <div className="text-[11px] text-gray-500 font-mono">PRD-01-02-01 · Finished Goods · Standard Medium Pack</div>
              </td>
              <td className="py-4 text-gray-600">800 units</td>
              <td className="py-4 text-gray-600">800 units</td>
              <td className="py-4 font-bold text-emerald-700">790 units</td>
              <td className="py-4 font-bold text-rose-600">10 units</td>
              <td className="py-4 font-black text-gray-900 font-mono text-right">426,600</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Complete QC Inspection Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            QC Inspection & Goods Receipt Logs (GRN History)
          </h3>
          <span className="text-xs text-gray-500 font-medium">Verified by Dr. Asma Noor (QC Cell)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                <th className="py-3.5 px-4">GRN NUMBER</th>
                <th className="py-3.5 px-4">SUPPLIER</th>
                <th className="py-3.5 px-4">VEHICLE #</th>
                <th className="py-3.5 px-4">TEMP</th>
                <th className="py-3.5 px-4">HYGIENE</th>
                <th className="py-3.5 px-4">ACCEPTED</th>
                <th className="py-3.5 px-4">REJECTED</th>
                <th className="py-3.5 px-4">QC STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {[
                { grn: 'GRN-2026-0611', supplier: 'Charsadda Supply Partners', vehicle: 'CSD-2298', temp: '24 °C', hygiene: 'Clean', accepted: '790 units', rejected: '10 units', status: received ? 'In Store' : 'Awaiting Store', isCurrent: true },
                { grn: 'GRN-2026-0610', supplier: 'Swabi Manufacturing & Logistics', vehicle: 'MRD-4471', temp: '22 °C', hygiene: 'Clean', accepted: '1,200 units', rejected: '0 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0609', supplier: 'Frontier Raw Materials', vehicle: 'PSW-9912', temp: '25 °C', hygiene: 'Acceptable', accepted: '500 units', rejected: '5 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0608', supplier: 'Khyber Cold Chain Logistics', vehicle: 'KHY-8829', temp: '21 °C', hygiene: 'Optimal', accepted: '1,500 units', rejected: '0 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0607', supplier: 'Premier Packaging Co.', vehicle: 'ISB-3341', temp: '26 °C', hygiene: 'Clean', accepted: '800 cartons', rejected: '0 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0606', supplier: 'Haripur Production Partners', vehicle: 'HRP-1102', temp: '23 °C', hygiene: 'Clean', accepted: '950 units', rejected: '8 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0605', supplier: 'Attock Layer Farms Consortium', vehicle: 'ATK-9018', temp: '24 °C', hygiene: 'Clean', accepted: '1,100 units', rejected: '12 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0604', supplier: 'Rashakai Farm Supplies', vehicle: 'RSK-7711', temp: '22 °C', hygiene: 'Optimal', accepted: '650 units', rejected: '0 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0603', supplier: 'Mardan Layer Cooperative', vehicle: 'MRD-3320', temp: '23 °C', hygiene: 'Clean', accepted: '850 units', rejected: '6 units', status: 'In Store', isCurrent: false },
                { grn: 'GRN-2026-0602', supplier: 'Swat Valley Poultry Partners', vehicle: 'SWT-5541', temp: '20 °C', hygiene: 'Optimal', accepted: '1,350 units', rejected: '4 units', status: 'In Store', isCurrent: false }
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{row.grn}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800">{row.supplier}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-600">{row.vehicle}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-700">{row.temp}</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">{row.hygiene}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">{row.accepted}</td>
                  <td className="py-3.5 px-4 font-bold text-rose-600">{row.rejected}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      row.status === 'In Store'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {row.isCurrent && !received ? (
                      <button
                        onClick={() => { setReceived(true); if (onReceiveStore) onReceiveStore(); }}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-black hover:bg-zinc-800 rounded-md transition shadow-xs"
                      >
                        Receive →
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-[11px]">✓ Verified</span>
                    )}
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
