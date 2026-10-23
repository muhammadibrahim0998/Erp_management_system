import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Calculator,
  ChevronRight,
  Printer
} from 'lucide-react';

export default function ProductionBoard({ productionOrders, onMoveOrder }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('both'); // 'board' | 'table' | 'both'

  const columns = [
    'With GM',
    'With Plant Manager',
    'With Production Manager',
    'Materials requested',
    'In production',
    'Completed'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Production & Assembly Board</h2>
          <p className="text-xs text-gray-500 mt-1">
            Sales → GM → Plant Manager → Production Manager → raw material store → processing → finish store.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1 rounded-lg font-bold transition ${viewMode === 'both' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              All Views
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded-lg font-bold transition ${viewMode === 'board' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-bold transition ${viewMode === 'table' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'}`}
            >
              Data Table
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {(viewMode === 'board' || viewMode === 'both') && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {columns.map((col, idx) => {
            const ordersInCol = (productionOrders || []).filter(o => o.stage === col);
            return (
              <div key={idx} className="bg-gray-50/80 rounded-2xl border border-gray-200 p-3 flex flex-col min-h-[440px]">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                  <span className="text-xs font-bold text-gray-800">{col}</span>
                  <span className="w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {ordersInCol.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {ordersInCol.map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => setSelectedOrder(wo)}
                      className="p-3 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-gray-900">{wo.wo_number}</span>
                          {wo.priority === 'high' && (
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              High
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-gray-800 mt-1">{wo.customer}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {wo.quantity_kg} kg {wo.product_name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-2">
                          {wo.eggs_to_break.toLocaleString()} input units · {wo.trays_count} cartons/packs
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                        <span>Due {wo.due_date}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Production Orders Data Table */}
      {(viewMode === 'table' || viewMode === 'both') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Production Work Orders Table
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {productionOrders?.length || 0} active work orders
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                  <th className="py-3.5 px-4">WORK ORDER #</th>
                  <th className="py-3.5 px-4">CUSTOMER</th>
                  <th className="py-3.5 px-4">PRODUCT SPECIFICATION</th>
                  <th className="py-3.5 px-4">OUTPUT QTY</th>
                  <th className="py-3.5 px-4">INPUT UNITS</th>
                  <th className="py-3.5 px-4">DUE DATE</th>
                  <th className="py-3.5 px-4">CURRENT STAGE</th>
                  <th className="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {(productionOrders || []).map((wo) => {
                  const currentIdx = columns.indexOf(wo.stage);
                  const nextStage = currentIdx < columns.length - 1 ? columns[currentIdx + 1] : null;
                  return (
                    <tr key={wo.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {wo.wo_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-800">
                        {wo.customer}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {wo.product_name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700 font-mono">
                        {wo.quantity_kg} kg
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {Number(wo.eggs_to_break).toLocaleString()} units ({wo.trays_count} cartons)
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {wo.due_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          wo.stage === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : wo.stage === 'In production'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {wo.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(wo)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                          >
                            Recipe
                          </button>
                          {nextStage && (
                            <button
                              onClick={() => onMoveOrder && onMoveOrder(wo.id, nextStage)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-black hover:bg-zinc-800 rounded-md transition shadow-xs"
                            >
                              Advance →
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Order Detail & Recipe Calculation Modal (Page 12) */}
      {selectedOrder && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gray-500">{selectedOrder.wo_number}</span>
                <h3 className="text-lg font-bold text-gray-900">
                  Production Order · {selectedOrder.customer}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xs font-bold text-gray-500 hover:text-black"
              >
                Close ✕
              </button>
            </div>

            {/* Stepper (Sales -> GM -> Plant -> Prod Mgr -> Raw store -> Breaking -> Finish store) */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] flex items-center justify-between overflow-x-auto gap-2">
              <span className="font-bold text-emerald-700">✓ Sales</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-bold text-emerald-700">✓ GM</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-bold text-emerald-700">✓ Plant Mgr</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-bold text-emerald-700">✓ Prod Mgr</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-bold text-amber-700">● Raw store issues</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">Processing</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">Finish store</span>
            </div>

            {/* Key Recipe Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">To produce</span>
                <div className="text-lg font-black text-gray-900">{selectedOrder.quantity_kg} kg</div>
                <span className="text-[10px] text-gray-500">{selectedOrder.product_name}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Units to process</span>
                <div className="text-lg font-black text-gray-900">{selectedOrder.eggs_to_break.toLocaleString()}</div>
                <span className="text-[10px] text-gray-500">{selectedOrder.trays_count} cartons/packs</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Processing time</span>
                <div className="text-lg font-black text-gray-900">{selectedOrder.duration_hours} h</div>
                <span className="text-[10px] text-gray-500">at 45,000 units/hour</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Material cost / kg</span>
                <div className="text-lg font-black text-emerald-700">PKR {selectedOrder.cost_per_kg}</div>
                <span className="text-[10px] text-gray-500">PKR 836k total batch</span>
              </div>
            </div>

            {/* Raw Material Requirement Calculation */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono space-y-2 text-gray-800">
              <div className="font-bold text-gray-900">Raw material requirement calculation:</div>
              <div>1. Finished yield per unit = Standard output after process & trimming loss (2.5% loss) = <strong>49.44 g</strong></div>
              <div>2. Standard batch material required 2,270 kg ÷ 49.44 g = <strong>45,915 input units</strong></div>
              <div>3. Total 45,915 units ÷ 30 = <strong>1,531 cartons/packs</strong> of production materials.</div>
            </div>

            {/* Advance Stage Button */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-500">
                Current stage: <strong>{selectedOrder.stage}</strong>
              </span>
              <div className="flex gap-2">
                {columns.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onMoveOrder(selectedOrder.id, c);
                      setSelectedOrder({ ...selectedOrder, stage: c });
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                      selectedOrder.stage === c ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
