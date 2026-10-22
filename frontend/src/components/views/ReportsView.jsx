import React, { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Package,
  Users,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';
import operationsService from '../../services/operationsService';
import DemoBadge from '../DemoBadge';

export default function ReportsView() {
  const [selectedReport, setSelectedReport] = useState('pnl');
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-09-29');
  const [exportNotice, setExportNotice] = useState(null);
  const [livePnl, setLivePnl] = useState(null);
  const [isPnlLoading, setIsPnlLoading] = useState(false);
  const [pnlError, setPnlError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchPnl = async () => {
      setIsPnlLoading(true);
      setPnlError(null);
      try {
        const data = await operationsService.getPnlReport();
        if (mounted && data) {
          setLivePnl(data);
        }
      } catch (err) {
        if (mounted) {
          setPnlError(err.message || 'Could not load P&L report from server');
        }
      } finally {
        if (mounted) {
          setIsPnlLoading(false);
        }
      }
    };
    fetchPnl();
    return () => { mounted = false; };
  }, []);

  const notify = (msg) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // 1. Profit & Loss Data
  const pnlData = {
    title: 'Profit & Loss Statement',
    revenue: 'PKR 136.8M',
    grossProfit: 'PKR 29.87M',
    operatingExpenses: 'PKR 28.43M',
    netProfit: 'PKR 1.44M',
    items: [
      { code: '4000', name: 'Sales Revenue (B2B & Retail Eggs)', amount: '136,824,763', highlight: false },
      { code: '5000', name: 'Cost of Eggs Sold (Direct Farm Cost)', amount: '106,954,414', highlight: false },
      { code: '—', name: 'Gross Profit', amount: '29,870,348', highlight: true },
      { code: '6000', name: 'Salaries & Staff Compensation', amount: '11,391,970', highlight: false },
      { code: '6100', name: 'Rent, Facilities & Utilities', amount: '2,250,000', highlight: false },
      { code: '6200', name: 'Administrative & Office Overhead', amount: '7,615,068', highlight: false },
      { code: '6300', name: 'Cold-Chain Transport, Fleet & Fuel', amount: '4,572,895', highlight: false },
      { code: '6400', name: 'Marketing, Branding & Media Spend', amount: '2,367,707', highlight: false },
      { code: '6500', name: 'Lab Quality Testing & Food Safety', amount: '231,753', highlight: false },
      { code: '—', name: 'Net Operating Profit (Before Tax)', amount: '1,440,955', highlight: true }
    ]
  };

  // 2. Receivables Aging Data
  const receivablesData = {
    title: 'Trade Receivables Aging Analysis',
    totalReceivables: 'PKR 45.66M',
    overdue30: 'PKR 3.20M',
    items: [
      { customer: 'Peek Freans (English Biscuit Mfrs)', invoice: 'INV-2026-0812', amount: '18,450,000', current: '18,450,000', d1_30: '0', d31_60: '0', status: 'Current' },
      { customer: 'Dawn Foods (Bread & Confectionery)', invoice: 'INV-2026-0818', amount: '8,200,000', current: '8,200,000', d1_30: '0', d31_60: '0', status: 'Current' },
      { customer: 'Swat Valley Egg Dealers', invoice: 'INV-2026-0741', amount: '6,410,034', current: '0', d1_30: '3,210,034', d31_60: '3,200,000', status: 'Overdue (On Hold)' },
      { customer: 'Master Baker (Lahore Branch)', invoice: 'INV-2026-0825', amount: '5,100,000', current: '4,350,000', d1_30: '750,000', d31_60: '0', status: 'Normal' },
      { customer: 'Salman Sweets & Bakers (Mardan)', invoice: 'INV-2026-0830', amount: '4,500,000', current: '0', d1_30: '4,500,000', d31_60: '0', status: 'Due This Week' },
      { customer: 'Tehzeeb Bakers (Rawalpindi)', invoice: 'INV-2026-0834', amount: '3,000,000', current: '0', d1_30: '2,940,000', d31_60: '60,000', status: 'Normal' }
    ]
  };

  // 3. Inventory Valuation Data
  const inventoryData = {
    title: 'Warehouse Inventory Stock Valuation',
    totalStockValue: 'PKR 14.88M',
    totalUnits: '73,640 Trays',
    items: [
      { code: 'RM-EGG-M', name: 'Fresh Shell Eggs — Medium Grade', warehouse: 'Mardan Central', qty: '22,400', avgCost: '180.00', totalValue: '4,032,000', status: 'Optimal' },
      { code: 'RM-EGG-L', name: 'Fresh Shell Eggs — Large Grade', warehouse: 'Rashakai Plant', qty: '18,500', avgCost: '195.00', totalValue: '3,607,500', status: 'Optimal' },
      { code: 'FG-LIQ-WHOLE', name: 'Pasteurized Liquid Whole Egg (Kg)', warehouse: 'Rashakai Plant Tankers', qty: '12,000', avgCost: '363.00', totalValue: '4,356,000', status: 'Optimal' },
      { code: 'PKG-TRAY-3P', name: 'Pulp Trays (3-Ply Packaging)', warehouse: 'Charsadda Store', qty: '15,000', avgCost: '18.50', totalValue: '277,500', status: 'Reorder' },
      { code: 'VET-SUP-01', name: 'Poultry Feed & Vitamin Supplements', warehouse: 'Swabi Layer Farm', qty: '5,740', avgCost: '455.00', totalValue: '2,611,700', status: 'Watch' }
    ]
  };

  // Export Handlers
  const handleExportPDF = () => {
    if (selectedReport === 'pnl') {
      exportToPDF({
        filename: `YAF_Profit_Loss_${fromDate}_${toDate}`,
        title: 'Profit & Loss Statement (P&L)',
        subtitle: 'Yousafzai Agri Foods (Pvt) Ltd · Head Office Mardan',
        period: `${fromDate} to ${toDate}`,
        kpis: [
          { label: 'Total Revenue', value: pnlData.revenue, note: '99% of target' },
          { label: 'Gross Profit', value: pnlData.grossProfit, note: '21.8% margin' },
          { label: 'Operating Costs', value: pnlData.operatingExpenses, note: '20.8% ratio' },
          { label: 'Net Profit', value: pnlData.netProfit, note: '1.1% net' }
        ],
        headers: ['Account Code', 'Description', 'Amount (PKR)'],
        rows: pnlData.items.map(i => [i.code, i.name, i.amount])
      });
      notify('Profit & Loss statement exported to PDF!');
    } else if (selectedReport === 'receivables') {
      exportToPDF({
        filename: `YAF_Receivables_Aging_${toDate}`,
        title: 'Trade Receivables Aging Report',
        subtitle: 'Yousafzai Agri Foods (Pvt) Ltd · Accounts & Credit Control',
        period: `As of ${toDate}`,
        kpis: [
          { label: 'Total Receivables', value: receivablesData.totalReceivables },
          { label: 'Overdue >30 Days', value: receivablesData.overdue30, note: 'Action required' },
          { label: 'Credit Limit Breaches', value: '1 Customer', note: 'Swat Valley' }
        ],
        headers: ['Customer Name', 'Invoice #', 'Total (PKR)', 'Current (0-30d)', 'Overdue (31-60d)', 'Status'],
        rows: receivablesData.items.map(i => [i.customer, i.invoice, i.amount, i.current, i.d31_60, i.status])
      });
      notify('Receivables Aging report exported to PDF!');
    } else if (selectedReport === 'inventory') {
      exportToPDF({
        filename: `YAF_Inventory_Valuation_${toDate}`,
        title: 'Warehouse Stock Valuation Report',
        subtitle: 'Yousafzai Agri Foods (Pvt) Ltd · Supply Chain & Stores',
        period: `As of ${toDate}`,
        kpis: [
          { label: 'Total Stock Value', value: inventoryData.totalStockValue },
          { label: 'Total Trays/Units', value: inventoryData.totalUnits },
          { label: 'Active Warehouses', value: '5 Locations' }
        ],
        headers: ['Item Code', 'Item Description', 'Warehouse', 'Quantity', 'Avg Cost (PKR)', 'Total Value (PKR)', 'Status'],
        rows: inventoryData.items.map(i => [i.code, i.name, i.warehouse, i.qty, i.avgCost, i.totalValue, i.status])
      });
      notify('Inventory valuation report exported to PDF!');
    }
  };

  const handleExportExcel = () => {
    if (selectedReport === 'pnl') {
      exportToExcel({
        filename: `YAF_Profit_Loss_${fromDate}_${toDate}`,
        sheetName: 'Profit & Loss',
        headers: ['Account Code', 'Description', 'Amount (PKR)'],
        data: pnlData.items.map(i => [i.code, i.name, i.amount])
      });
      notify('Profit & Loss exported to Excel (.xlsx)!');
    } else if (selectedReport === 'receivables') {
      exportToExcel({
        filename: `YAF_Receivables_Aging_${toDate}`,
        sheetName: 'Receivables Aging',
        headers: ['Customer Name', 'Invoice #', 'Total (PKR)', 'Current (0-30d)', 'Overdue (31-60d)', 'Status'],
        data: receivablesData.items.map(i => [i.customer, i.invoice, i.amount, i.current, i.d31_60, i.status])
      });
      notify('Receivables Aging exported to Excel (.xlsx)!');
    } else if (selectedReport === 'inventory') {
      exportToExcel({
        filename: `YAF_Inventory_Valuation_${toDate}`,
        sheetName: 'Inventory Valuation',
        headers: ['Item Code', 'Item Description', 'Warehouse', 'Quantity', 'Avg Cost (PKR)', 'Total Value (PKR)', 'Status'],
        data: inventoryData.items.map(i => [i.code, i.name, i.warehouse, i.qty, i.avgCost, i.totalValue, i.status])
      });
      notify('Inventory Valuation exported to Excel (.xlsx)!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <DemoBadge />
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Executive & Financial Reports</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Yousafzai Agri Foods (Pvt) Ltd · Head Office Mardan · Export official statements to PDF & Excel.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Report"
            className="p-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setSelectedReport('pnl')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedReport === 'pnl'
              ? 'bg-black text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Profit & Loss Statement</span>
        </button>

        <button
          onClick={() => setSelectedReport('receivables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedReport === 'receivables'
              ? 'bg-black text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Receivables Aging Report</span>
        </button>

        <button
          onClick={() => setSelectedReport('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedReport === 'inventory'
              ? 'bg-black text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventory Valuation</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => { setFromDate('2026-09-01'); setToDate('2026-09-30'); }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700"
          >
            This month
          </button>
          <button
            onClick={() => { setFromDate('2026-07-01'); setToDate('2026-09-30'); }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700"
          >
            This quarter
          </button>
          <button
            onClick={() => { setFromDate('2026-07-01'); setToDate('2027-06-30'); }}
            className="px-3 py-1.5 rounded-lg bg-[#0E2118] text-white font-semibold"
          >
            FY 2026-27
          </button>
        </div>
      </div>

      {/* REPORT CONTENT: 1. Profit & Loss */}
      {selectedReport === 'pnl' && (
        <div className="space-y-4">
          {pnlError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-sm">
              <span>Could not load live statement ({pnlError}); displaying baseline P&L.</span>
              <DemoBadge />
            </div>
          )}

          {isPnlLoading ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center gap-2 text-gray-500 text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
              <span>Loading Profit & Loss statement from server...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Revenue</span>
                  <div className="text-xl font-black text-gray-900 mt-1">{livePnl?.revenue || pnlData.revenue}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">+10.1% vs target</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Profit</span>
                  <div className="text-xl font-black text-gray-900 mt-1">{livePnl?.grossProfit || pnlData.grossProfit}</div>
                  <span className="text-[10px] text-gray-500">21.8% gross margin</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Operating Expenses</span>
                  <div className="text-xl font-black text-gray-900 mt-1">{livePnl?.operatingExpenses || pnlData.operatingExpenses}</div>
                  <span className="text-[10px] text-gray-500">20.8% of revenue</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Net Profit</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">{livePnl?.netProfit || pnlData.netProfit}</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">1.1% net margin</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Statement of Comprehensive Income (PKR)</h3>
                    {!livePnl && <DemoBadge />}
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">Period: {livePnl?.period || `${fromDate} to ${toDate}`}</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
                      <th className="py-3 px-6">ACCOUNT CODE</th>
                      <th className="py-3 px-6">DESCRIPTION</th>
                      <th className="py-3 px-6 text-right">AMOUNT (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {(livePnl?.breakdown ? (
                      livePnl.breakdown.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-400">
                            No P&L breakdown items recorded
                          </td>
                        </tr>
                      ) : (
                        livePnl.breakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-3 px-6 font-mono text-gray-500">{row.code}</td>
                            <td className="py-3 px-6 text-gray-700">{row.name}</td>
                            <td className="py-3 px-6 text-right font-mono text-gray-900">{row.amount}</td>
                          </tr>
                        ))
                      )
                    ) : (
                      pnlData.items.map((row, idx) => (
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
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* REPORT CONTENT: 2. Receivables Aging */}
      {selectedReport === 'receivables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Receivables</span>
              <div className="text-xl font-black text-gray-900 mt-1">{receivablesData.totalReceivables}</div>
              <span className="text-[10px] text-gray-500">6 major accounts</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Overdue 31-60 Days</span>
              <div className="text-xl font-black text-rose-700 mt-1">{receivablesData.overdue30}</div>
              <span className="text-[10px] text-rose-600 font-semibold">Swat Valley Dealers</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Average Collection Period</span>
              <div className="text-xl font-black text-gray-900 mt-1">24 Days</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Within 30-day policy</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
                  <th className="py-3 px-4">CUSTOMER NAME</th>
                  <th className="py-3 px-4">INVOICE #</th>
                  <th className="py-3 px-4 text-right">TOTAL (PKR)</th>
                  <th className="py-3 px-4 text-right">CURRENT (0-30D)</th>
                  <th className="py-3 px-4 text-right">OVERDUE (31-60D)</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {receivablesData.items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-bold text-gray-900">{row.customer}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{row.invoice}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">{row.amount}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-600">{row.current}</td>
                    <td className={`py-3 px-4 text-right font-mono ${row.d31_60 !== '0' ? 'font-bold text-rose-600' : 'text-gray-400'}`}>
                      {row.d31_60}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status.includes('Hold')
                          ? 'bg-rose-100 text-rose-800'
                          : row.status.includes('Due')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 3. Inventory Valuation */}
      {selectedReport === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Inventory Value</span>
              <div className="text-xl font-black text-gray-900 mt-1">{inventoryData.totalStockValue}</div>
              <span className="text-[10px] text-gray-500">Weighted Average Costing</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Stock Count</span>
              <div className="text-xl font-black text-gray-900 mt-1">{inventoryData.totalUnits}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Across all warehouses</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Cold Store Temperature</span>
              <div className="text-xl font-black text-blue-700 mt-1">4.2°C</div>
              <span className="text-[10px] text-blue-600 font-semibold">Within HACCP Standard</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
                  <th className="py-3 px-4">ITEM CODE</th>
                  <th className="py-3 px-4">DESCRIPTION</th>
                  <th className="py-3 px-4">WAREHOUSE</th>
                  <th className="py-3 px-4 text-right">QUANTITY</th>
                  <th className="py-3 px-4 text-right">AVG COST (PKR)</th>
                  <th className="py-3 px-4 text-right">TOTAL VALUE (PKR)</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {inventoryData.items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono text-gray-500">{row.code}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{row.name}</td>
                    <td className="py-3 px-4 text-gray-600">{row.warehouse}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">{row.qty}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-600">{row.avgCost}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{row.totalValue}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'Optimal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.status === 'Reorder'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
