import React, { useState } from 'react';
import { Users, DollarSign, Calendar, CheckCircle2, Plus, Clock, FileText } from 'lucide-react';

export default function PayrollView({ payrollRuns, onGeneratePayroll }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGeneratePayroll(selectedMonth);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Payroll</h2>
          <p className="text-xs text-gray-500 mt-1">
            Monthly salary runs with tax, provident fund, EOBI and advance recovery — approved by Finance and the Chairman.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 font-mono"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isGenerating ? 'Calculating...' : 'Generate payroll'}</span>
          </button>
        </div>
      </div>

      {/* Runs Table (Page 17) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-medium bg-gray-50/50">
                <th className="py-3 px-4">NUMBER</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">MONTH</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">PREPARED BY</th>
                <th className="py-3 px-4 text-right">NET PAY (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {(payrollRuns || []).map((run, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{run.run_number}</td>
                  <td className="py-3.5 px-4 text-gray-500">{run.run_date}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">{run.month}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      run.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">{run.prepared_by}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                    {Number(run.net_pay).toLocaleString()}
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
