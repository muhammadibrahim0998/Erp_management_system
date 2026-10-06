import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Truck,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function LiveOperations() {
  const [selectedNode, setSelectedNode] = useState(null);

  const receivingSteps = [
    { id: 'supp', name: 'Suppliers', count: 2, status: 'normal', desc: 'Charsadda & Swabi farms' },
    { id: 'gate_in', name: 'Gate in', count: 1, time: '35 min', status: 'active', desc: 'Vehicle MRD-4471 waiting' },
    { id: 'qc', name: 'QC cell', count: 0, status: 'clear', desc: 'Inspection station idle' },
    { id: 'store', name: 'Store', count: 1, time: '1 h 35 m', status: 'waiting', desc: 'Unloading into Mardan bay' },
    { id: 'inv', name: 'Inventory', count: 0, status: 'clear', desc: 'Cold store available' },
    { id: 'gate_out', name: 'Gate out', count: 0, status: 'clear', desc: 'Cleared departures' }
  ];

  const plantSteps = [
    { id: 'sales', name: 'Sales', count: 1, status: 'done', desc: 'B2B order confirmed' },
    { id: 'gm', name: 'GM', count: 1, status: 'done', desc: 'Work order approved' },
    { id: 'plant', name: 'Plant', count: 1, time: '5 h', status: 'waiting', desc: 'Rashakai plant scheduling' },
    { id: 'planning', name: 'Planning', count: 1, status: 'done', desc: 'Batch requirement calculated' },
    { id: 'raw_store', name: 'Raw store', count: 1, status: 'done', desc: 'Shell eggs released' },
    { id: 'breaking', name: 'Breaking', count: 1, time: '1 d 14 h', status: 'bottleneck', desc: 'Breaking machine #2 backlog' },
    { id: 'finish_store', name: 'Finish store', count: 1, status: 'done', desc: 'Pasteurised cold tanks' },
    { id: 'dispatch', name: 'Dispatch', count: 0, status: 'clear', desc: 'Insulated tankers' },
    { id: 'cust', name: 'Customers', count: 1, status: 'done', desc: 'Peek Freans, Dawn Foods' }
  ];

  return (
    <div className="space-y-6">
      {/* Control Room Top Banner */}
      <div className="bg-black text-white p-6 rounded-2xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              Live Operations Control Room · Refreshes every 20s
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1 text-white">Operations Real-Time Flow</h2>
          <p className="text-xs text-zinc-400">
            Vehicles at the gate, QC, store, and each production order from the GM to dispatch. The step over its time limit pulses red.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white">
            Live flow
          </span>
        </div>
      </div>

      {/* Control Room Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Eggs traded · 7 days</span>
          <div className="text-xl font-black text-gray-900 mt-1">572K</div>
          <span className="text-[10px] text-gray-500">19,077 trays</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gate → Store</span>
          <div className="text-xl font-black text-gray-900 mt-1">1 h 53 m</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Average cycle</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Work in progress</span>
          <div className="text-xl font-black text-gray-900 mt-1">PKR 836K</div>
          <span className="text-[10px] text-gray-500">Active batch</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last batch yield</span>
          <div className="text-xl font-black text-emerald-600 mt-1">98.6%</div>
          <span className="text-[10px] text-gray-500">Optimal recovery</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-300 shadow-sm bg-rose-50/20">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Bottleneck</span>
          <div className="text-xl font-black text-rose-600 mt-1 flex items-center gap-1">
            <span>Breaking</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
          </div>
          <span className="text-[10px] text-rose-700 font-semibold">1 d 14 h waiting</span>
        </div>
      </div>

      {/* Visual Pipeline 1: Receiving Flow (Page 7) */}
      <div className="bg-black text-white p-6 rounded-2xl border border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">1. Receiving Flow (Gate to Store)</h3>
          <span className="text-[11px] text-zinc-500">Click any step for telemetry details</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-6 px-2 overflow-x-auto">
          {receivingSteps.map((step, idx) => {
            const isBottleneck = step.status === 'bottleneck';
            const isActive = step.status === 'active';
            const isWaiting = step.status === 'waiting';

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => setSelectedNode(step)}
                  className="flex flex-col items-center gap-2 cursor-pointer group shrink-0"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition relative ${
                      isBottleneck
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse ring-4 ring-rose-500/30'
                        : isWaiting
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : isActive
                        ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 group-hover:border-zinc-500'
                    }`}
                  >
                    <span className="text-xs font-bold">{step.count}</span>
                    {step.time && <span className="text-[9px] text-amber-300 font-mono">{step.time}</span>}
                  </div>
                  <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition">
                    {step.name}
                  </span>
                </div>
                {idx < receivingSteps.length - 1 && (
                  <div className="h-0.5 flex-1 min-w-[24px] bg-zinc-800 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-zinc-500 rotate-45"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Visual Pipeline 2: Liquid Egg Plant Flow (Page 7) */}
      <div className="bg-black text-white p-6 rounded-2xl border border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            2. Liquid Egg Plant Process (Sales Order to Customer Dispatch)
          </h3>
          <span className="text-[11px] text-zinc-500">Rashakai Special Economic Zone Plant</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-6 px-2 overflow-x-auto">
          {plantSteps.map((step, idx) => {
            const isBottleneck = step.status === 'bottleneck';
            const isWaiting = step.status === 'waiting';

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => setSelectedNode(step)}
                  className="flex flex-col items-center gap-2 cursor-pointer group shrink-0"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 transition relative ${
                      isBottleneck
                        ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse ring-4 ring-rose-600/40 shadow-lg shadow-rose-900/50'
                        : isWaiting
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300 group-hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-xs font-bold">{step.count}</span>
                    {step.time && <span className="text-[8px] font-mono text-amber-300">{step.time}</span>}
                  </div>
                  <span
                    className={`text-[11px] font-semibold transition ${
                      isBottleneck ? 'text-rose-400 font-bold' : 'text-zinc-300 group-hover:text-white'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {idx < plantSteps.length - 1 && (
                  <div className="h-0.5 flex-1 min-w-[16px] bg-zinc-800 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-zinc-500 rotate-45"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Clear / Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Work waiting
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> Over time limit (Bottleneck)
          </span>
        </div>
      </div>

      {/* Selected Node Drawer / Info */}
      {selectedNode && (
        <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-800">
              {selectedNode.count}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">{selectedNode.name} Status</div>
              <div className="text-xs text-gray-500">{selectedNode.desc}</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs font-semibold text-gray-500 hover:text-black"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
