import React, { useState } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

export default function GateSecurity({ gatePasses, onAddGatePass, isLoading, onRefetch }) {
  const [activeTab, setActiveTab] = useState('on_site');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [vehicleNo, setVehicleNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [passType, setPassType] = useState('inward');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!vehicleNo.trim()) {
      setFormError('Vehicle registration number is required');
      return;
    }
    if (!supplier.trim()) {
      setFormError('Supplier or customer name is required');
      return;
    }
    if (!passType) {
      setFormError('Pass type must be chosen');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddGatePass({
        vehicle_number: vehicleNo.trim(),
        supplier_customer: supplier.trim(),
        pass_type: passType
      });
      setVehicleNo('');
      setSupplier('');
      setPassType('inward');
      setIsModalOpen(false);
      if (onRefetch) onRefetch();
    } catch (err) {
      setFormError(err.message || 'Error issuing gate pass');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPasses = Array.isArray(gatePasses) ? gatePasses : [];
  const inwardPasses = allPasses.filter(g => g.pass_type === 'inward' || !g.pass_type);
  const outboundPasses = allPasses.filter(g => g.pass_type === 'outward');

  const displayedPasses = activeTab === 'Inward gate passes'
    ? inwardPasses
    : activeTab === 'Outward gate passes'
    ? outboundPasses
    : allPasses;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Gate & security</h2>
          <p className="text-xs text-gray-500 mt-1">
            Vehicles in and out — gate pass numbers on information from control. Issue inward gate pass; let loaded vehicles out only against posted sales invoice.
          </p>
        </div>
        <button
          onClick={() => { setFormError(''); setIsModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Vehicle arrived</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {['Vehicles on site', 'Inward gate passes', 'Outward gate passes'].map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === tab ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid: Inbound vs Outbound */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">
              {activeTab === 'Outward gate passes' ? 'Outward gate passes' : 'Vehicles on site & Gate Passes'}
            </h3>
            <span className="text-xs font-semibold text-gray-500">{displayedPasses.length} records</span>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-gray-500 font-medium flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span>Loading gate passes...</span>
              </div>
            ) : displayedPasses.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 font-medium border border-dashed border-gray-200 rounded-xl">
                No gate passes found for this view
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-medium">
                    <th className="pb-3">GATE PASS</th>
                    <th className="pb-3">VEHICLE</th>
                    <th className="pb-3">SUPPLIER / PARTY</th>
                    <th className="pb-3">SINCE</th>
                    <th className="pb-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {displayedPasses.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 font-mono font-bold text-gray-900">{v.pass_number}</td>
                      <td className="py-3.5 font-semibold text-gray-800">{v.vehicle_number}</td>
                      <td className="py-3.5 text-gray-600">{v.supplier_customer}</td>
                      <td className="py-3.5 text-gray-400">{v.since_time}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          v.status?.includes('QC done') || v.status?.includes('Cleared')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Outbound dispatch vehicles</h3>
              <span className="text-xs text-gray-400">{outboundPasses.length} total</span>
            </div>
            {outboundPasses.length > 0 ? (
              <div className="space-y-2.5">
                {outboundPasses.map((v, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-gray-900">{v.pass_number}</div>
                      <div className="text-gray-700 font-semibold">{v.vehicle_number}</div>
                      <div className="text-[10px] text-gray-400">{v.supplier_customer}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                No vehicles waiting to go out
              </div>
            )}
          </div>
          <div className="mt-6 text-[11px] text-gray-400 border-t border-gray-100 pt-3">
            Vehicles let out only after store has verified unloaded items or invoice cleared.
          </div>
        </div>
      </div>

      {/* Modal: New Vehicle Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Issue Inward Gate Pass</h3>
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Vehicle Registration # *</label>
                <input
                  type="text"
                  placeholder="e.g. CSD-9821 or MRD-5520"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Supplier or Customer Name *</label>
                <input
                  type="text"
                  placeholder="Supplier or customer name"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Pass Type *</label>
                <select
                  value={passType}
                  onChange={(e) => setPassType(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:opacity-50"
                >
                  <option value="inward">Inward (Receiving / Goods Arrival)</option>
                  <option value="outward">Outward (Dispatch / Delivery)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-black text-white font-bold hover:bg-zinc-800 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Issuing...' : 'Confirm & Print Pass'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
