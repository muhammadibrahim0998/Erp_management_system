import React, { useState } from 'react';
import { Package, Search, Plus, ArrowRightLeft, Download, AlertTriangle } from 'lucide-react';

export default function InventoryView({ inventoryItems, onAdjustStock }) {
  const [search, setSearch] = useState('');
  const [onlyBelowReorder, setOnlyBelowReorder] = useState(false);

  const filteredItems = (inventoryItems || []).filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.code.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (onlyBelowReorder && item.status !== 'Reorder') {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Stock on hand</h2>
          <p className="text-xs text-gray-500 mt-1">
            Eggs by grade, feed, ingredients and packing at Mardan, Attock, both farms and the plant cold store — in trays of 30.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Stock adjustment</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Stock transfer</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards (Page 13) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock value</span>
          <div className="text-2xl font-black text-gray-900 mt-1">PKR 10.6M</div>
          <span className="text-[11px] text-gray-500">27 stocked items</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/30">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Below reorder level</span>
          <div className="text-2xl font-black text-rose-600 mt-1">4</div>
          <span className="text-[11px] text-rose-700">Organic eggs, Breaking-grade</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Eggs & egg products</span>
          <div className="text-2xl font-black text-gray-900 mt-1">PKR 4.7M</div>
          <span className="text-[11px] text-gray-500">13 items</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Feed & farm inputs</span>
          <div className="text-2xl font-black text-gray-900 mt-1">PKR 4.8M</div>
          <span className="text-[11px] text-gray-500">8 items</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-black"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyBelowReorder}
              onChange={(e) => setOnlyBelowReorder(e.target.checked)}
              className="rounded text-black focus:ring-0"
            />
            <span>Only below reorder</span>
          </label>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Multi-Warehouse Stock Table (Page 13) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
                <th className="py-3 px-4">ITEM</th>
                <th className="py-3 px-2 text-center">MRD</th>
                <th className="py-3 px-2 text-center">ATK</th>
                <th className="py-3 px-2 text-center">CCF</th>
                <th className="py-3 px-2 text-center">PHF</th>
                <th className="py-3 px-3 text-right">TOTAL QTY</th>
                <th className="py-3 px-3 text-right">REORDER AT</th>
                <th className="py-3 px-3 text-right">AVG COST</th>
                <th className="py-3 px-3 text-right">VALUE (PKR)</th>
                <th className="py-3 px-2 text-center">COVER</th>
                <th className="py-3 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{item.code}</div>
                  </td>
                  <td className="py-3.5 px-2 text-center text-gray-600 font-mono">{item.mrd_qty}</td>
                  <td className="py-3.5 px-2 text-center text-gray-600 font-mono">{item.atk_qty}</td>
                  <td className="py-3.5 px-2 text-center text-gray-600 font-mono">{item.ccf_qty}</td>
                  <td className="py-3.5 px-2 text-center text-gray-600 font-mono">{item.phf_qty}</td>
                  <td className="py-3.5 px-3 text-right font-bold text-gray-900 font-mono">
                    {item.total_qty} tray
                  </td>
                  <td className="py-3.5 px-3 text-right text-gray-500 font-mono">{item.reorder_at}</td>
                  <td className="py-3.5 px-3 text-right text-gray-600 font-mono">{item.avg_cost}</td>
                  <td className="py-3.5 px-3 text-right font-black text-gray-900 font-mono">
                    {Number(item.total_value).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-2 text-center text-gray-500">{item.cover_days}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'OK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      item.status === 'Reorder' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.status}
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
