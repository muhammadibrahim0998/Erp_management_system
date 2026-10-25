import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import DemoBadge from '../DemoBadge';

export default function ChairmanDashboard({ data, onNavigate, onApproveTask, currentUser }) {
  const [processingId, setProcessingId] = useState(null);
  const kpis = data?.kpis || {};
  const tasks = data?.waitingApprovals || [];
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : '';
  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedToday = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  const revenueMonthYear = `${months[today.getMonth()]} ${today.getFullYear()}`;
  const currentYear = today.getFullYear();
  const startFiscalYear = today.getMonth() >= 6 ? currentYear : currentYear - 1;
  const currentFiscalQuarter = Math.floor(((today.getMonth() + 6) % 12) / 3) + 1;
  const budgetPeriod = `Q${currentFiscalQuarter} FY ${startFiscalYear}-${String(startFiscalYear + 1).slice(-2)}`;

  const handleApprove = async (taskId) => {
    if (!onApproveTask) return;
    setProcessingId(taskId);
    try {
      await onApproveTask(taskId);
    } catch {
      // Error notification is already handled by App.jsx handleApproveTask
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = tasks.length;
  const chartData = data?.revenueChart || [
    { month: 'Oct', actual: 44, target: 46 },
    { month: 'Nov', actual: 48, target: 49 },
    { month: 'Dec', actual: 52, target: 51 },
    { month: 'Jan', actual: 55, target: 53 },
    { month: 'Feb', actual: 45, target: 47 },
    { month: 'Mar', actual: 42, target: 44 },
    { month: 'Apr', actual: 46, target: 45 },
    { month: 'May', actual: 49, target: 48 },
    { month: 'Jun', actual: 51, target: 50 },
    { month: 'Jul', actual: 54, target: 52 },
    { month: 'Aug', actual: 53, target: 51 },
    { month: 'Sep', actual: 50.3, target: 50.8 }
  ];

  const maxVal = Math.max(
    ...chartData.map(b => Math.max(Number(b.actual) || 0, Number(b.target) || 0)),
    60
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Good morning{firstName ? `, ${firstName}` : ''}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {tasks.length > 0 ? `${tasks.length} items waiting for your approval · ` : ''}{formattedToday}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('procurement')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Purchase requisition</span>
          </button>
          <button
            onClick={() => onNavigate('sales')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sales order</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Stock adjustment</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards (Page 5) */}
      <DemoBadge label="Sample data served by the API — not yet linked to live records" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Revenue · {revenueMonthYear}</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.revenue || 'PKR 0.0M'}</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{kpis.revenueTargetChange || '▲ 10.1%'}</span>
            <span className="text-gray-400 font-normal ml-1">{kpis.revenueTargetText || '99% of target'}</span>
          </div>
        </div>

        {/* Gross margin */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Gross margin</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.grossMargin || '0.0%'}</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{kpis.marginChange || '▼ 0.1 pts'}</span>
            <span className="text-gray-400 font-normal ml-1">{kpis.marginNote || 'vs last month'}</span>
          </div>
        </div>

        {/* Cash & bank */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Cash & bank</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.cashAndBank || 'PKR 0.0M'}</div>
          </div>
          <div className="text-[11px] text-gray-400">{kpis.cashAccounts || '4 accounts'}</div>
        </div>

        {/* Receivables */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Receivables</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.receivables || 'PKR 0.0M'}</div>
          </div>
          <div className="text-[11px] text-amber-700 font-semibold">{kpis.receivablesOverdue || 'PKR 3.2M over 30 days'}</div>
        </div>

        {/* Products sold */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Products sold · last 7 days</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.productsSold || '0'}</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{kpis.eggsSoldChange ? `▲ ${kpis.eggsSoldChange.replace(/^\+/, '')}` : '▲ 28.8%'}</span>
            <span className="text-gray-400 font-normal ml-1">{kpis.eggsSoldTrays || '19,077 trays'}</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Revenue vs Target & Waiting for you */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Target (12 months) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Revenue vs target</h3>
                  <DemoBadge label="Sample data served by the API — not yet linked to live records" className="mb-0" />
                </div>
                <p className="text-[11px] text-gray-400">Last 12 months, PKR millions (excluding sales tax)</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600"></span> Actual
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-3 h-0.5 bg-amber-400"></span> Target
                </span>
              </div>
            </div>

            {/* Custom SVG Bar & Trend Chart */}
            <div className="mt-6 h-56 w-full flex items-end justify-between gap-2 px-2 pt-4 border-b border-gray-200">
              {chartData.map((bar, i) => {
                const heightPct = Math.min(100, Math.max(5, (Number(bar.actual) / maxVal) * 100));
                const targetPct = Math.min(100, Math.max(5, (Number(bar.target) / maxVal) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition bg-black text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20">
                      Actual: {bar.actual}M | Target: {bar.target}M
                    </div>
                    {/* Target marker */}
                    <div
                      className="w-full h-0.5 bg-amber-400 absolute"
                      style={{ bottom: `${targetPct}%` }}
                    ></div>
                    {/* Actual bar */}
                    <div
                      className="w-full bg-emerald-700/80 hover:bg-emerald-600 rounded-t transition"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 mt-2">{bar.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
            <span>Overall fiscal performance: <strong>On Track (98.4%)</strong></span>
            <span>Audited & verified by Mujeeb Ullah (Finance)</span>
          </div>
        </div>

        {/* Waiting for you (Approvals list) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Waiting for you</h3>
              {tasks.length > 0 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {tasks.length}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 text-xs text-center">
                  No pending approvals waiting for your review
                </div>
              ) : (
                tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                  className="p-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition bg-gray-50/50 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-900">{t.action_label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      <span className="font-mono text-gray-700">{t.doc_number}</span> · {t.party}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{t.waiting_since}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(t.id)}
                    disabled={processingId === t.id}
                    className="p-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Process"
                  >
                    {processingId === t.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('approvals')}
            className="w-full mt-4 py-2 px-3 text-xs font-semibold text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Open approvals inbox ({pendingCount})
          </button>
        </div>
      </div>

      {/* Bottom Grid: Receivables Aging, Budget vs Actual, Exceptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Receivables aging */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <DemoBadge label="Sample data served by the API — not yet linked to live records" />
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Receivables aging</h4>
            <span className="text-xs font-mono font-bold text-gray-700">Total {data?.receivablesAging?.total || 'PKR 45.6M'}</span>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Current</span>
                <span className="font-bold text-gray-900">{data?.receivablesAging?.current || '31.0M'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: '68%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>1-30 days</span>
                <span className="font-bold text-gray-900">{data?.receivablesAging?.d1_30 || '11.4M'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>31-60 days</span>
                <span className="font-bold text-rose-600">{data?.receivablesAging?.d31_60 || '3.2M'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: '7%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget vs actual */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <DemoBadge label="Sample data served by the API — not yet linked to live records" />
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Budget vs actual · {budgetPeriod}</h4>
          </div>
          <div className="space-y-3 text-xs">
            {(data?.budgetVsActual || [
              { dept: 'Poultry Farms', actual: '28.3M', budget: '31.1M', pct: 91 },
              { dept: 'HR & Administration', actual: '3.8M', budget: '4.2M', pct: 90 },
              { dept: 'Procurement & Supply Chain', actual: '74.1M', budget: '90.3M', pct: 82 }
            ]).map((b, i) => {
              const barColor = i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-purple-600' : 'bg-amber-600';
              return (
                <div key={b.dept || i}>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>{b.dept}</span>
                    <span className="font-bold text-gray-900">{b.actual} / {b.budget} · {b.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(b.pct, 100)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exceptions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Exceptions (Needs Attention)
              </h4>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {data?.exceptions?.length || 1} on hold
              </span>
            </div>
            <DemoBadge label="Sample data served by the API — not yet linked to live records" />
            {data?.exceptions && data.exceptions.length > 0 ? (
              <div className="space-y-3">
                {data.exceptions.map((exc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-700">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{exc.title || 'Credit limit exceeded'}</span>
                    </div>
                    <p className="text-[11px] text-rose-800 mt-1">
                      {exc.desc || exc.description || `${exc.party || ''} · ${exc.doc_number || ''} ${exc.detail || ''}`}
                    </p>
                    <button
                      onClick={() => onNavigate(exc.route || 'sales')}
                      className="mt-3 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-md transition shadow-sm"
                    >
                      Review {exc.action_label || 'Sales Order & Credit'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 text-xs text-center">
                No active exceptions
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-400 mt-4">
            Security audit: locked posted documents active.
          </div>
        </div>
      </div>

      {/* Executive Quick Documents & Approvals Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Executive Documents & Workflow Queue Table
            </h3>
            <p className="text-[11px] text-gray-400">Live operational documents awaiting executive review</p>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="text-xs font-bold text-[#086634] hover:underline cursor-pointer"
          >
            View Full Approvals Inbox →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                <th className="py-3.5 px-4">DOCUMENT #</th>
                <th className="py-3.5 px-4">DOCUMENT TYPE</th>
                <th className="py-3.5 px-4">PARTY / SUMMARY</th>
                <th className="py-3.5 px-4">WAITING TIME</th>
                <th className="py-3.5 px-4">PRIORITY</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400">
                    All caught up! No pending documents requiring action.
                  </td>
                </tr>
              ) : (
                tasks.slice(0, 6).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{t.doc_number}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {t.doc_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      <div>{t.action_label}</div>
                      <div className="text-[11px] text-gray-400 font-normal">{t.party}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">{t.waiting_since}</td>
                    <td className="py-3.5 px-4">
                      {t.priority === 'high' ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          High
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        PENDING
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleApprove(t.id)}
                        disabled={processingId === t.id}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#0d4a2b] hover:bg-[#086634] rounded-md transition shadow-xs cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {processingId === t.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Quick Approve</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
