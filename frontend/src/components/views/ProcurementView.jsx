import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle2, Clock, FileText, Download } from 'lucide-react';

export default function ProcurementView({ purchaseOrders, onAddPo }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');

  const filteredOrders = (purchaseOrders || []).filter(p =>
    p.po_number.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplier || !amount) return;
    await onAddPo({ supplier, amount: parseFloat(amount) });
    setSupplier('');
    setAmount('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Procurement</h2>
          <p className="text-xs text-gray-500 mt-1">
            Egg purchases from partner farms, feed, vet supplies and packing — with quotation comparison to approved order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New purchase order</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {['Requisitions', 'Purchase orders', 'Goods receipts', 'Suppliers'].map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              (tab === 'Purchase orders' && activeTab === 'orders') || activeTab === tab
                ? 'bg-black text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search number, party, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-black"
          />
        </div>
        <div className="text-xs text-gray-400">
          Showing {filteredOrders.length} documents
        </div>
      </div>

      {/* Purchase Orders Table (Page 10) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
                <th className="py-3 px-4">NUMBER</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">SUPPLIER</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">CREATED BY</th>
                <th className="py-3 px-4 text-right">AMOUNT (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredOrders.map((po, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{po.po_number}</td>
                  <td className="py-3.5 px-4 text-gray-500">{po.po_date}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800">{po.supplier}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      po.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      po.status.includes('Pending approval') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      po.status === 'Received' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">{po.created_by}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                    {Number(po.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Purchase Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Create Purchase Order</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Peshawar Pulp Trays or Haripur Egg Farm"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-black text-white font-bold"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
