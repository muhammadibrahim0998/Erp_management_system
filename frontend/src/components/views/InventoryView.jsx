import React, { useState } from 'react';
import { Package, Search, Plus, ArrowRightLeft, Download, AlertTriangle } from 'lucide-react';

export default function InventoryView({ inventoryItems, onAdjustStock }) {
  const [search, setSearch] = useState('');
  const [onlyBelowReorder, setOnlyBelowReorder] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [adjustQty, setAdjustQty] = useState('');

  const totalStockVal = (inventoryItems || []).reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
  const reorderCount = (inventoryItems || []).filter(i => i.status === 'Reorder' || Number(i.total_qty) <= Number(i.reorder_at)).length;
  const totalUnits = (inventoryItems || []).reduce((sum, i) => sum + (Number(i.total_qty) || 0), 0);
  const itemsCount = (inventoryItems || []).length;

  const filteredItems = (inventoryItems || []).filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.code.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (onlyBelowReorder && item.status !== 'Reorder') {
      return false;
    }
    return true;
  });

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedItemCode || !adjustQty) return;
    if (onAdjustStock) {
      onAdjustStock({ code: selectedItemCode, qty: parseInt(adjustQty, 10) });
    }
    setSelectedItemCode('');
    setAdjustQty('');
    setIsAdjustModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Stock on Hand & Inventory</h2>
          <p className="text-xs text-gray-500 mt-1">
            Finished goods, raw materials, packaging and store inventory across Mardan, Attock, Charsadda, and Rashakai facilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* 4 Dynamic Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Stock Value</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            PKR {(totalStockVal / 1e6).toFixed(2)}M
          </div>
          <span className="text-[11px] text-gray-500">{itemsCount} tracked catalog SKUs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/30">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Below Reorder Level</span>
          <div className="text-2xl font-black text-rose-600 mt-1">{reorderCount}</div>
          <span className="text-[11px] text-rose-700">Needs purchase order</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Available Units</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {Number(totalUnits).toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-500">Across all warehouses</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inventory Health</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {reorderCount === 0 ? 'Optimal' : `${reorderCount} Low Stock`}
          </div>
          <span className="text-[11px] text-gray-500">Auto FIFO tracking</span>
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
                    {item.total_qty} units
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

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Adjust Stock Quantities</h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Select Item SKU</label>
                <select
                  required
                  value={selectedItemCode}
                  onChange={(e) => setSelectedItemCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                >
                  <option value="">-- Choose item to adjust --</option>
                  {(inventoryItems || []).map(i => (
                    <option key={i.code} value={i.code}>
                      {i.name} ({i.code}) — Current: {i.total_qty} units
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">New Total Quantity (Units)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold text-white bg-black hover:bg-zinc-800 shadow-sm"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
