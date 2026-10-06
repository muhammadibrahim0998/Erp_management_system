import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Truck,
  ShieldCheck,
  Package,
  Layers,
  ShoppingCart,
  Share2,
  DollarSign,
  Users,
  Building2,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  GitBranch
} from 'lucide-react';

const processes = [
  {
    id: 'receiving',
    title: 'Egg Receiving & QC',
    description: 'Supplier farm → Gate pass → QC cell inspection → Store receipt.',
    color: 'emerald',
    icon: Truck,
    steps: [
      { name: 'Supplier farm', role: 'Poultry Farms (Zahid Afridi)', desc: 'Eggs loaded at Charsadda / Swabi / Haripur farm.', status: 'done' },
      { name: 'Gate in', role: 'Gate Officer (Gul Rehman)', desc: 'Issues inward gate pass (GPI-YYYY-NNNN). Vehicle logged.', status: 'done' },
      { name: 'QC cell', role: 'QC Cell (Dr. Asma Noor)', desc: 'Checks weight, cracks %, Haugh unit, temperature, hygiene, pests. Issues GRN.', status: 'active' },
      { name: 'Raw material store', role: 'Raw Material Store (Usman Ali)', desc: 'Unloads accepted trays, records in inventory by grade. Returns rejected.', status: 'pending' },
      { name: 'Gate out', role: 'Gate Officer (Gul Rehman)', desc: 'Empty vehicle cleared out after store confirmation.', status: 'pending' },
    ]
  },
  {
    id: 'production',
    title: 'Liquid Egg Production',
    description: 'Sales order → GM approve → Plant plan → Breaking → Pasteurize → Dispatch.',
    color: 'blue',
    icon: Layers,
    steps: [
      { name: 'Sales order', role: 'Sales Officer (Bilal Yousafzai)', desc: 'Customer orders liquid egg (whole/yolk/white). SO created with credit check.', status: 'done' },
      { name: 'GM approval', role: 'General Manager (Khalid Mehmood)', desc: 'Confirms batch is commercially viable. Releases work order (WO-YYYY-NNNN).', status: 'done' },
      { name: 'Plant Manager', role: 'Plant Manager (Usama Tariq)', desc: 'Schedules plant time & labour. Calculates recipe — eggs, salt, pasteurization.', status: 'active' },
      { name: 'Production Manager', role: 'Production Manager (Farhan Ali)', desc: 'Requests raw materials from store. Assigns breaking shift supervisor.', status: 'active' },
      { name: 'Raw material issue', role: 'Raw Material Store (Usman Ali)', desc: 'Issues calculated trays to Breaking Supervisor (Sher Zaman).', status: 'pending' },
      { name: 'Breaking & processing', role: 'Breaking Supervisor (Sher Zaman)', desc: 'Shell eggs broken, liquid separated. Pasteurized & cooled at Rashakai plant.', status: 'bottleneck' },
      { name: 'Finish store', role: 'Finish Store & Delivery (Waqas Ahmed)', desc: 'Pasteurized liquid stored in insulated tanks. Quality sealed.', status: 'pending' },
      { name: 'Dispatch', role: 'Finish Store & Delivery (Waqas Ahmed)', desc: 'Loaded into refrigerated tankers with dispatch note & invoice.', status: 'pending' },
      { name: 'Customer', role: 'Customer (Peek Freans / Dawn Foods)', desc: 'Liquid egg delivered. Invoice posted. Receivable created.', status: 'pending' },
    ]
  },
  {
    id: 'procurement',
    title: 'Procurement',
    description: 'Department need → Requisition → Quotations → Purchase Order → Approval → GRN.',
    color: 'amber',
    icon: Package,
    steps: [
      { name: 'Department need', role: 'Any Department Head', desc: 'Identifies requirement — eggs, feed, vet supplies, packing, equipment.', status: 'done' },
      { name: 'Purchase requisition', role: 'Department Head', desc: 'Raises PR. System routes to Procurement.', status: 'done' },
      { name: 'Quotation & comparison', role: 'Procurement (Waqar Ahmad)', desc: 'Gets at least 3 quotes. Attaches comparison to PO draft.', status: 'done' },
      { name: 'PO approval (Band 1–3)', role: 'Finance + CEO (based on amount)', desc: 'Band 1: ≤500K → Finance. Band 2: ≤2.5M → Finance. Band 3: >2.5M → CEO.', status: 'active' },
      { name: 'Goods receipt (GRN)', role: 'QC Cell + Store', desc: 'Items inspected on arrival. GRN posted. Inventory updated.', status: 'pending' },
      { name: 'Supplier invoice & payment', role: 'Accounts Officer (Hamza Khan)', desc: 'Invoice matched to GRN. WHT deducted. Payment processed.', status: 'pending' },
    ]
  },
  {
    id: 'sales',
    title: 'Sales & Credit Control',
    description: 'Inquiry → Sales order → Credit check → Approval → Dispatch → Invoice → Collection.',
    color: 'purple',
    icon: ShoppingCart,
    steps: [
      { name: 'Customer inquiry', role: 'Sales Officer (Bilal Yousafzai)', desc: 'Dealer or B2B inquiry received. Price & availability confirmed.', status: 'done' },
      { name: 'Sales order', role: 'Sales Officer', desc: 'SO typed with product, qty, price, discount. System checks credit limit.', status: 'done' },
      { name: 'Credit & discount check', role: 'System (automatic)', desc: 'Breach triggers approval route: Dept Head → Finance → CEO.', status: 'active' },
      { name: 'SO approval', role: 'Imran Khattak → Mujeeb Ullah → CEO', desc: 'Multi-level sign-off if credit or discount policy is broken.', status: 'active' },
      { name: 'Dispatch', role: 'Finish Store & Delivery (Waqas Ahmed)', desc: 'Stock picked, gate-out pass issued, delivery note signed.', status: 'pending' },
      { name: 'Invoice & collection', role: 'Accounts Officer (Hamza Khan)', desc: 'Invoice posted. Collection tracked in receivables aging.', status: 'pending' },
    ]
  },
  {
    id: 'payroll',
    title: 'Payroll',
    description: 'Attendance → Payroll run → Finance review → CEO approval → Bank payment.',
    color: 'rose',
    icon: Users,
    steps: [
      { name: 'Attendance record', role: 'HR Manager (Nadia Shah)', desc: 'Monthly attendance, leaves, overtime compiled for all staff.', status: 'done' },
      { name: 'Payroll run generated', role: 'HR Manager (Nadia Shah)', desc: 'System calculates gross pay, tax, EOBI, provident fund, advance recovery.', status: 'done' },
      { name: 'Finance review', role: 'Director Finance (Mujeeb Ullah)', desc: 'Verifies totals, tax deductions, and cash availability.', status: 'active' },
      { name: 'CEO approval', role: 'Chairman & CEO (Sana Ullah)', desc: 'Final sign-off on total net pay (PKR 4.87M / month).', status: 'pending' },
      { name: 'Bank transfer', role: 'Accounts Officer (Hamza Khan)', desc: 'Salary transferred via MCB payroll account ••7702.', status: 'pending' },
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing & Campaigns',
    description: 'Campaign plan → Finance budget check → CEO approval → Live → Results.',
    color: 'indigo',
    icon: Share2,
    steps: [
      { name: 'Campaign brief', role: 'Head of Marketing (Mahnoor Khan)', desc: 'Defines objectives, platform, audience, creatives & budget.', status: 'done' },
      { name: 'Finance review', role: 'Director Finance (Mujeeb Ullah)', desc: 'Checks budget against annual marketing allocation.', status: 'done' },
      { name: 'CEO approval', role: 'Chairman & CEO (Sana Ullah)', desc: 'Final approval to spend above PKR 500K.', status: 'done' },
      { name: 'Campaign live', role: 'Social Media & Content (Sana Gul)', desc: 'Creatives published. Spend tracked daily vs budget.', status: 'active' },
      { name: 'Results report', role: 'Head of Marketing (Mahnoor Khan)', desc: 'Monthly reach, engagement, leads & cost-per-lead reported to CEO.', status: 'pending' },
    ]
  },
];

const colorMap = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: { done: 'bg-emerald-600', active: 'bg-emerald-500 ring-4 ring-emerald-100', bottleneck: 'bg-rose-600 ring-4 ring-rose-100 animate-pulse', pending: 'bg-gray-300' },
    line: 'bg-emerald-200',
    card: 'border-emerald-200',
    icon: 'text-emerald-700',
    header: 'bg-emerald-50'
  },
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: { done: 'bg-blue-600', active: 'bg-blue-500 ring-4 ring-blue-100', bottleneck: 'bg-rose-600 ring-4 ring-rose-100 animate-pulse', pending: 'bg-gray-300' },
    line: 'bg-blue-200',
    card: 'border-blue-200',
    icon: 'text-blue-700',
    header: 'bg-blue-50'
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: { done: 'bg-amber-500', active: 'bg-amber-400 ring-4 ring-amber-100', bottleneck: 'bg-rose-600 ring-4 ring-rose-100 animate-pulse', pending: 'bg-gray-300' },
    line: 'bg-amber-200',
    card: 'border-amber-200',
    icon: 'text-amber-700',
    header: 'bg-amber-50'
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: { done: 'bg-purple-600', active: 'bg-purple-500 ring-4 ring-purple-100', bottleneck: 'bg-rose-600 ring-4 ring-rose-100 animate-pulse', pending: 'bg-gray-300' },
    line: 'bg-purple-200',
    card: 'border-purple-200',
    icon: 'text-purple-700',
    header: 'bg-purple-50'
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: { done: 'bg-rose-500', active: 'bg-rose-400 ring-4 ring-rose-100', bottleneck: 'bg-rose-600 ring-4 ring-rose-100 animate-pulse', pending: 'bg-gray-300' },
    line: 'bg-rose-200',
    card: 'border-rose-200',
    icon: 'text-rose-700',
    header: 'bg-rose-50'
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: { done: 'bg-indigo-600', active: 'bg-indigo-500 ring-4 ring-indigo-100', bottleneck: 'bg-rose-600 ring-4 ring-rose-100 animate-pulse', pending: 'bg-gray-300' },
    line: 'bg-indigo-200',
    card: 'border-indigo-200',
    icon: 'text-indigo-700',
    header: 'bg-indigo-50'
  },
};

function StepStatusBadge({ status }) {
  if (status === 'done')
    return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✓ Done</span>;
  if (status === 'active')
    return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">● Active</span>;
  if (status === 'bottleneck')
    return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">⚠ Bottleneck</span>;
  return <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Pending</span>;
}

export default function ProcessMap({ onNavigate }) {
  const [expandedProcess, setExpandedProcess] = useState('receiving');
  const [view, setView] = useState('detail'); // 'detail' | 'overview'

  const selectedProcess = processes.find(p => p.id === expandedProcess);
  const colors = selectedProcess ? colorMap[selectedProcess.color] : colorMap.emerald;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Process Map</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            End-to-end workflows for all key operations — Yousafzai Agri Foods (Pvt) Ltd. Click any process to see step-by-step detail, roles, and current live status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              view === 'overview' ? 'bg-black text-white border-black' : 'text-gray-600 bg-gray-50 border-gray-300 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setView('detail')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              view === 'detail' ? 'bg-black text-white border-black' : 'text-gray-600 bg-gray-50 border-gray-300 hover:bg-gray-100'
            }`}
          >
            Step-by-step
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-5 text-[11px] font-medium text-gray-600">
        <span className="font-bold text-gray-700">Step status:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Done</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Active / in progress</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span> Bottleneck / overdue</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Pending</span>
      </div>

      {/* OVERVIEW MODE: All 6 processes as compact horizontal flow cards */}
      {view === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {processes.map((proc) => {
            const c = colorMap[proc.color];
            const Icon = proc.icon;
            return (
              <div
                key={proc.id}
                onClick={() => { setExpandedProcess(proc.id); setView('detail'); }}
                className={`bg-white rounded-2xl border ${c.card} shadow-sm p-5 hover:shadow-md cursor-pointer transition hover:border-black group`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl ${c.header} border ${c.card}`}>
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-black">{proc.title}</h3>
                    <p className="text-[11px] text-gray-500">{proc.steps.length} steps</p>
                  </div>
                </div>

                {/* Compact steps flow */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {proc.steps.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        step.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        step.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        step.status === 'bottleneck' ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold' :
                        'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {step.name}
                      </span>
                      {idx < proc.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 italic">{proc.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODE: Left process list + Right step-by-step detail */}
      {view === 'detail' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left: Process selector */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-3 space-y-1.5 self-start">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1">Select process</div>
            {processes.map((proc) => {
              const c = colorMap[proc.color];
              const Icon = proc.icon;
              const isSelected = expandedProcess === proc.id;
              const activeCount = proc.steps.filter(s => s.status === 'active').length;
              const bottleneckCount = proc.steps.filter(s => s.status === 'bottleneck').length;

              return (
                <button
                  key={proc.id}
                  onClick={() => setExpandedProcess(proc.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? 'bg-black text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-black border border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : c.icon}`} />
                    <span className="font-semibold">{proc.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {bottleneckCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Bottleneck"></span>
                    )}
                    {activeCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {activeCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Step-by-step vertical timeline */}
          <div className="lg:col-span-3 space-y-4">
            {selectedProcess && (
              <>
                {/* Process Header Card */}
                <div className={`bg-white rounded-2xl border ${colors.card} shadow-sm p-5 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    {(() => { const Icon = selectedProcess.icon; return <div className={`p-2.5 rounded-xl ${colors.header} border ${colors.card}`}><Icon className={`w-5 h-5 ${colors.icon}`} /></div>; })()}
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{selectedProcess.title}</h3>
                      <p className="text-xs text-gray-500">{selectedProcess.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[11px]">
                    <span className="text-gray-500 font-medium">{selectedProcess.steps.filter(s => s.status === 'done').length} / {selectedProcess.steps.length} done</span>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(selectedProcess.steps.filter(s => s.status === 'done').length / selectedProcess.steps.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Horizontal compact flow (top) */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-max">
                    {selectedProcess.steps.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full transition-all ${colors.dot[step.status] || 'bg-gray-300'}`}></div>
                          <span className={`text-[10px] font-semibold whitespace-nowrap ${
                            step.status === 'done' ? 'text-emerald-700' :
                            step.status === 'active' ? 'text-blue-700' :
                            step.status === 'bottleneck' ? 'text-rose-700' : 'text-gray-400'
                          }`}>{step.name}</span>
                        </div>
                        {idx < selectedProcess.steps.length - 1 && (
                          <div className={`h-0.5 w-8 shrink-0 ${step.status === 'done' ? colors.line : 'bg-gray-200'}`}></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Vertical detailed steps */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Step-by-step detail</h4>
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-100 rounded"></div>

                    <div className="space-y-1">
                      {selectedProcess.steps.map((step, idx) => (
                        <div key={idx} className={`relative flex items-start gap-4 p-4 rounded-xl transition group hover:bg-gray-50/80 ${
                          step.status === 'bottleneck' ? 'bg-rose-50/50 border border-rose-200 rounded-xl' : ''
                        }`}>
                          {/* Timeline dot */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition ${
                            step.status === 'done' ? 'bg-emerald-600 border-emerald-600 text-white' :
                            step.status === 'active' ? 'bg-blue-600 border-blue-600 text-white' :
                            step.status === 'bottleneck' ? 'bg-rose-600 border-rose-600 text-white animate-pulse' :
                            'bg-white border-gray-200 text-gray-400'
                          }`}>
                            {step.status === 'done' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : step.status === 'bottleneck' ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <span className="text-xs font-bold">{idx + 1}</span>
                            )}
                          </div>

                          {/* Step content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h5 className="text-sm font-bold text-gray-900">{step.name}</h5>
                              <StepStatusBadge status={step.status} />
                            </div>
                            <div className="text-[11px] font-semibold text-gray-500 mb-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {step.role}
                            </div>
                            <p className="text-xs text-gray-600">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
