import React, { useState } from 'react';
import { Download, Printer, Calendar, TrendingUp } from 'lucide-react';

export default function ReportsView() {
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-09-29');

  const pnlData = {
    revenue: 'PKR 137M',
    grossProfit: 'PKR 29.9M',
    operatingExpenses: 'PKR 28.4M',
    netProfit: 'PKR 1.4M',
    items: [
      { code: '4000', name: 'Sales revenue', amount: '136,824,763', isHeader: false, bold: true },
      { code: '5000', name: 'Cost of eggs sold', amount: '106,954,414', isHeader: false },
      { code: '', name: 'Gross profit', amount: '29,870,348', isHeader: true, highlight: true },
      { code: '6000', name: 'Salaries & wages', amount: '11,391,970', isHeader: false },
      { code: '6100', name: 'Rent & utilities', amount: '2,250,000', isHeader: false },
      { code: '6200', name: 'Admin & office expenses', amount: '7,615,068', isHeader: false },
      { code: '6300', name: 'Cold-chain transport & fuel', amount: '4,572,895', isHeader: false },
      { code: '6400', name: 'Marketing & advertising', amount: '2,367,707', isHeader: false },
      { code: '6500', name: 'Lab testing & quality', amount: '231,753', isHeader: false },
      { code: '', name: 'Net profit before tax', amount: '1,440,955', isHeader: true, highlight: true }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Profit & loss statement</h2>
          <p className="text-xs text-gray-500 mt-1">
            Period: 1 Jul 2026 to 29 Sep 2026 · Yousafzai Agri Foods (Pvt) Ltd · Head office Mardan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100">
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700">This month</button>
          <button className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700">This quarter</button>
          <button className="px-3 py-1 rounded-lg bg-black text-white font-semibold">Financial year</button>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Page 19) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Revenue</span>
          <div className="text-xl font-black text-gray-900 mt-1">{pnlData.revenue}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Gross profit</span>
          <div className="text-xl font-black text-gray-900 mt-1">{pnlData.grossProfit}</div>
          <span className="text-[10px] text-gray-500">21.8% margin</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Operating expenses</span>
          <div className="text-xl font-black text-gray-900 mt-1">{pnlData.operatingExpenses}</div>
          <span className="text-[10px] text-gray-500">20.8% of revenue</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Net profit</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{pnlData.netProfit}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">1.1% net margin</span>
        </div>
      </div>

      {/* Statement Table (Page 19) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
              <th className="py-3 px-6">ACCOUNT CODE</th>
              <th className="py-3 px-6">DESCRIPTION</th>
              <th className="py-3 px-6 text-right">AMOUNT (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {pnlData.items.map((row, idx) => (
              <tr
                key={idx}
                className={row.highlight ? 'bg-gray-50 font-bold text-gray-900' : 'hover:bg-gray-50/50'}
              >
                <td className="py-3 px-6 font-mono text-gray-500">{row.code}</td>
                <td className={`py-3 px-6 ${row.highlight ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                  {row.name}
                </td>
                <td className={`py-3 px-6 text-right font-mono ${row.highlight ? 'font-black text-gray-900 text-sm' : 'text-gray-900'}`}>
                  {row.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
