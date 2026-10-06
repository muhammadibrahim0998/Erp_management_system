import React, { useState } from 'react';
import { Truck, Plus, CheckCircle2, Clock, ShieldCheck, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function GateSecurity({ gatePasses, onAddGatePass }) {
  const [activeTab, setActiveTab] = useState('on_site');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleNo, setVehicleNo] = useState('');
  const [supplier, setSupplier] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleNo || !supplier) return;
    await onAddGatePass({
      vehicle_number: vehicleNo,
      supplier_customer: supplier,
      pass_type: 'inward'
    });
    setVehicleNo('');
    setSupplier('');
    setIsModalOpen(false);
  };

  const inboundVehicles = gatePasses || [
    { pass_number: 'GPI-2026-0003', vehicle_number: 'CSD-2298', supplier_customer: 'Charsadda Poultry Farm', since_time: '2 h ago', status: 'QC done — unloading' },
    { pass_number: 'GPI-2026-0002', vehicle_number: 'MRD-4471', supplier_customer: 'Swabi Layer Farms', since_time: '35 min ago', status: 'At gate — waiting for QC' }
  ];

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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm"
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
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
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
          <h3 className="text-sm font-bold text-gray-900 mb-4">Inbound vehicles on site</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium">
                  <th className="pb-3">GATE PASS</th>
                  <th className="pb-3">VEHICLE</th>
                  <th className="pb-3">SUPPLIER</th>
                  <th className="pb-3">SINCE</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {inboundVehicles.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 font-mono font-bold text-gray-900">{v.pass_number}</td>
                    <td className="py-3.5 font-semibold text-gray-800">{v.vehicle_number}</td>
                    <td className="py-3.5 text-gray-600">{v.supplier_customer}</td>
                    <td className="py-3.5 text-gray-400">{v.since_time}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        v.status.includes('QC done') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4">Outbound vehicles at the gate</h3>
            <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
              No vehicles waiting to go out
            </div>
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
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Vehicle Registration #</label>
                <input
                  type="text"
                  placeholder="e.g. CSD-9821 or MRD-5520"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Supplier or Farm Name</label>
                <input
                  type="text"
                  placeholder="e.g. Charsadda Poultry Farm"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
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
                  Confirm & Print Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
