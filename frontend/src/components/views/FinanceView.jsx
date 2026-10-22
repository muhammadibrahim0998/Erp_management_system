import React, { useState } from 'react';
import { DollarSign, Landmark, ArrowUpRight, ArrowDownRight, FileText, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';

export default function FinanceView({ financeData, onNavigate }) {
  const [notice, setNotice] = useState(null);

  const cashAccounts = financeData?.cashAndBank || [
    { name: 'Cash in hand', balance: '800,000', account: 'Cash' },
    { name: 'Bank — Current A/C ••4410', balance: '14,905,300', account: 'Meezan Bank' },
    { name: 'Bank — Current A/C ••2231', balance: '10,713,825', account: 'HBL Mardan' },
    { name: 'Bank — Payroll A/C ••7702', balance: '3,000,000', account: 'MCB' }
  ];

  const handleExportPDF = () => {
    exportToPDF({
      filename: 'YAF_Treasury_Cash_Receivables_Summary',
      title: 'Cash, Bank & Treasury Summary',
      subtitle: 'Yousafzai Agri Foods (Pvt) Ltd · Head Office Mardan',
      period: 'FY 2026-27 (Current Position)',
      kpis: [
        { label: 'Total Cash & Bank', value: 'PKR 29.41M', note: '4 Accounts' },
        { label: 'Total Receivables', value: 'PKR 45.66M', note: 'Aging tracked' },
        { label: 'Overdue >30d', value: 'PKR 3.20M', note: 'Credit hold' }
      ],
      headers: ['Account / Facility Name', 'Institution / Bank', 'Current Balance (PKR)'],
      rows: cashAccounts.map(a => [a.name, a.account, a.balance])
    });
    setNotice('Treasury summary exported to PDF!');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: 'YAF_Treasury_Cash_Receivables_Summary',
      sheetName: 'Cash & Bank Accounts',
      headers: ['Account / Facility Name', 'Institution / Bank', 'Current Balance (PKR)'],
      data: cashAccounts.map(a => [a.name, a.account, a.balance])
    });
    setNotice('Treasury summary exported to Excel (.xlsx)!');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Accounts & Finance</h2>
          <p className="text-xs text-gray-500 mt-1">
            Cash and bank, receivables and payables ageing, supplier invoices, payments with withholding tax, receipts, journals and the chart of accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>P&L Statement</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* 4 Cash and Bank Cards (Page 18) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cashAccounts.map((acc, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{acc.name}</span>
            <div className="text-xl font-black text-gray-900 font-mono mt-1">
              PKR {acc.balance}
            </div>
            <span className="text-[11px] text-gray-400">{acc.account}</span>
          </div>
        ))}
      </div>

      {/* Receivables & Payables Grid (Page 18) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receivables */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receivables</h3>
              <div className="text-xl font-black text-gray-900 mt-0.5">PKR 45,660,034</div>
            </div>
            <span className="text-xs font-semibold text-gray-500">Aging breakdown</span>
          </div>

          <div className="space-y-2 text-xs border-y border-gray-100 py-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Current (0-30 d):</span>
              <span className="font-bold text-gray-900">31.0M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">1-30 days overdue:</span>
              <span className="font-bold text-amber-600">11.4M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">31-60 days overdue:</span>
              <span className="font-bold text-rose-600">3.2M</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-800 mb-2">Top Debtors</h4>
            <div className="space-y-2 text-xs font-medium">
              {[
                { customer: 'Karachi General Wholesalers', amount: '12,386,999' },
                { customer: 'Peek Freans', amount: '7,093,583' },
                { customer: 'Barkat Frisian (value-added)', amount: '5,486,933' },
                { customer: 'Dawn Foods', amount: '3,942,893' },
                { customer: 'Swat Valley Trading Co.', amount: '3,877,654' }
              ].map((d, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-700">{d.customer}</span>
                  <span className="font-mono font-bold text-gray-900">PKR {d.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payables */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Payables</h3>
              <div className="text-xl font-black text-gray-900 mt-0.5">PKR 27,122,966</div>
            </div>
            <span className="text-xs font-semibold text-gray-500">Aging breakdown</span>
          </div>

          <div className="space-y-2 text-xs border-y border-gray-100 py-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Current (0-30 d):</span>
              <span className="font-bold text-gray-900">23.2M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">1-30 days:</span>
              <span className="font-bold text-gray-800">4.0M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">31-60 days:</span>
              <span className="font-bold text-gray-800">0.0M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts & Finance Comprehensive Data Tables */}
      <div className="space-y-6">
        {/* Bank Accounts Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Bank Accounts & Cash Holdings Table
            </h3>
            <span className="text-xs text-gray-500 font-medium">Verified by Hamza Khan (Accounts)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                  <th className="py-3 px-4">ACCOUNT NAME</th>
                  <th className="py-3 px-4">BANK / INSTITUTION</th>
                  <th className="py-3 px-4">ACCOUNT #</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4 text-right">BALANCE (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {cashAccounts.map((acc, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 px-4 font-bold text-gray-900">{acc.name}</td>
                    <td className="py-3 px-4 text-gray-700">{acc.account}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{acc.name.includes('••') ? acc.name.split('••')[1] : 'Safe-01'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {acc.account === 'Cash' ? 'Cash Safe' : 'Commercial Bank'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      PKR {acc.balance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debtors vs Creditors Split Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Debtors Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Debtors & Customer Receivables Table
              </h3>
              <span className="text-xs text-rose-600 font-bold font-mono">Total PKR 45.6M</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                    <th className="py-3 px-4">CUSTOMER NAME</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4 text-right">OUTSTANDING (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {[
                    { customer: 'Karachi General Wholesalers', category: 'Distributor', amount: '12,386,999' },
                    { customer: 'Peek Freans Food Industries', category: 'B2B Client', amount: '7,093,583' },
                    { customer: 'Barkat Frisian (Value Added)', category: 'Industrial', amount: '5,486,933' },
                    { customer: 'Dawn Foods Karachi', category: 'Bakery Chain', amount: '3,942,893' },
                    { customer: 'Swat Valley Trading Co.', category: 'Dealer', amount: '3,877,654' }
                  ].map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-bold text-gray-800">{d.customer}</td>
                      <td className="py-3 px-4 text-gray-500">{d.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">{d.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Creditors Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Creditors & Supplier Payables Table
              </h3>
              <span className="text-xs text-gray-600 font-bold font-mono">Total PKR 27.1M</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                    <th className="py-3 px-4">SUPPLIER NAME</th>
                    <th className="py-3 px-4">SUPPLY TYPE</th>
                    <th className="py-3 px-4 text-right">PAYABLE (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {[
                    { supplier: 'Frontier Raw Materials & Supplies', category: 'Feed & Raw', amount: '11,119,140' },
                    { supplier: 'Swabi Manufacturing & Logistics', category: 'Layer Farm', amount: '2,646,840' },
                    { supplier: 'Haripur Production Partners', category: 'Egg Farm', amount: '2,646,330' },
                    { supplier: 'Khyber Cold Chain Logistics', category: 'Cold Transport', amount: '2,062,160' },
                    { supplier: 'Charsadda Supply Partners', category: 'Egg Farm', amount: '1,940,905' }
                  ].map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-bold text-gray-800">{c.supplier}</td>
                      <td className="py-3 px-4 text-gray-500">{c.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">{c.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
