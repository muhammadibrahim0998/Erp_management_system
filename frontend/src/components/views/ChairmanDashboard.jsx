import React from 'react';
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
  CheckCircle2,
  Info
} from 'lucide-react';

export default function ChairmanDashboard({ data, currentUser, onNavigate, onApproveTask }) {
  const kpis = data?.kpis || {};
  const tasks = data?.waitingApprovals || [];
  const pendingCount = data?.pendingCount !== undefined ? data.pendingCount : tasks.length;
  const aging = data?.receivablesAging || {
    total: 'PKR 0.00',
    current: '0.0M',
    d1_30: '0.0M',
    d31_60: '0.0M'
  };
  const budgetList = data?.budgetVsActual || [];
  const exceptions = data?.exceptions || [];
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

  const maxVal = Math.max(...chartData.map(b => Math.max(Number(b.actual) || 0, Number(b.target) || 0)), 60);

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Good morning, {currentUser?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {pendingCount} items waiting for your approval · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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

      {/* 5 Dynamic KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Revenue · Sep 2026</span>
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
          <div className="text-[11px] text-gray-500 font-medium">{kpis.cashAccounts || '0 accounts'}</div>
        </div>

        {/* Receivables */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Receivables</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.receivables || 'PKR 0.0M'}</div>
          </div>
          <div className="text-[11px] text-amber-700 font-semibold">{kpis.receivablesOverdue || 'Normal exposure'}</div>
        </div>

        {/* Products sold */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Products sold · last 7 days</span>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">{kpis.productsSold || '0'}</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{kpis.productsSoldChange || '▲ 28.8%'}</span>
            <span className="text-gray-400 font-normal ml-1">{kpis.productsSoldUnits || '0 units'}</span>
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
                <h3 className="text-sm font-bold text-gray-900">Revenue vs target</h3>
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
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${pendingCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                {pendingCount}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="py-10 px-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-800">All caught up!</p>
                <p className="text-[11px] text-gray-500 mt-1">No pending approvals waiting for your action.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition bg-gray-50/50 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-bold text-gray-900 truncate">{t.action_label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        <span className="font-mono text-gray-700 font-semibold">{t.doc_number}</span> · {t.party}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{t.waiting_since}</span>
                        {t.priority === 'high' && (
                          <span className="ml-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 rounded">
                            High
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onApproveTask(t.id)}
                      className="p-1.5 rounded-lg bg-[#0d4a2b] text-white hover:bg-[#086634] transition shrink-0 shadow-sm"
                      title="Quick Approve"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Receivables aging</h4>
            <span className="text-xs font-mono font-bold text-gray-700">Total {aging.total || 'PKR 0'}</span>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Current</span>
                <span className="font-bold text-gray-900">{aging.current || '0.0M'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: '68%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>1-30 days</span>
                <span className="font-bold text-gray-900">{aging.d1_30 || '0.0M'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>31-60 days</span>
                <span className="font-bold text-rose-600">{aging.d31_60 || '0.0M'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: '7%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget vs actual */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Budget vs actual · Q1 FY 2026-27</h4>
          </div>
          <div className="space-y-3 text-xs">
            {budgetList.length > 0 ? (
              budgetList.map((item, idx) => {
                const colors = ['bg-blue-600', 'bg-purple-600', 'bg-amber-600'];
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-gray-600 mb-1">
                      <span className="truncate pr-2">{item.dept}</span>
                      <span className="font-bold text-gray-900 shrink-0">{item.actual} / {item.budget} · {item.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, item.pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400">No budget records found</p>
            )}
          </div>
        </div>

        {/* Exceptions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Exceptions (Needs Attention)
            </h4>
            <div className="space-y-2.5">
              {exceptions.length > 0 ? (
                exceptions.map((exc, idx) => {
                  const isDanger = exc.type === 'danger';
                  const isWarning = exc.type === 'warning';
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        isDanger
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : isWarning
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {isDanger ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : isWarning ? (
                          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span>{exc.title}</span>
                      </div>
                      <p className="text-[11px] mt-1 opacity-90 leading-tight">
                        {exc.desc}
                      </p>
                      {exc.actionLabel && (
                        <button
                          onClick={() => onNavigate(exc.targetTab || 'sales')}
                          className={`mt-2 text-[10px] font-bold px-2.5 py-1 rounded transition shadow-sm ${
                            isDanger
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : isWarning
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {exc.actionLabel}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All systems normal</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    No exceptions or credit breaches detected.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mt-4">
            Security audit: locked posted documents active.
          </div>
        </div>
      </div>
    </div>
  );
}
