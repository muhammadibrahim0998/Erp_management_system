import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ArrowRight,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';

export default function ApprovalsInbox({ tasks, onApproveTask }) {
  const [activeTab, setActiveTab] = useState('waiting');
  const [filterDoc, setFilterDoc] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionComment, setActionComment] = useState('');

  const filteredTasks = (tasks || []).filter((t) => {
    if (activeTab === 'waiting' && t.status !== 'pending') return false;
    if (activeTab === 'completed' && t.status === 'pending') return false;
    if (filterDoc && !t.doc_number.toLowerCase().includes(filterDoc.toLowerCase()) && !t.party.toLowerCase().includes(filterDoc.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAction = async (task, actionType) => {
    await onApproveTask(task.id, actionType);
    setSelectedTask(null);
    setActionComment('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Approvals & tasks inbox</h2>
          <p className="text-xs text-gray-500 mt-1">
            Documents move to the next approver automatically. Returned and rejected items need a comment; nobody can approve their own document.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search documents, items, party..."
            value={filterDoc}
            onChange={(e) => setFilterDoc(e.target.value)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('waiting')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'waiting'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          <span>Waiting for me</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'waiting' ? 'bg-zinc-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
            {tasks?.filter(t => t.status === 'pending').length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'submitted'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          <span>Submitted by me</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-800">0</span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'completed'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          <span>Processed & history</span>
        </button>
      </div>

      {/* Task Table View */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No pending tasks found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                  <th className="py-3.5 px-4">DOCUMENT #</th>
                  <th className="py-3.5 px-4">TYPE</th>
                  <th className="py-3.5 px-4">PARTY / DETAILS</th>
                  <th className="py-3.5 px-4">ASSIGNED TO</th>
                  <th className="py-3.5 px-4">WAITING</th>
                  <th className="py-3.5 px-4">PRIORITY</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {task.doc_number}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {task.doc_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{task.action_label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{task.title}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {task.assigned_role || 'General Manager'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                      {task.waiting_since}
                    </td>
                    <td className="py-3.5 px-4">
                      {task.priority === 'high' ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          High
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        task.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : task.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {task.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(task, 'rejected')}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition"
                            title="Reject"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(task, 'returned')}
                            className="px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-md transition"
                            title="Return with note"
                          >
                            Return
                          </button>
                          <button
                            onClick={() => handleAction(task, 'approved')}
                            className="px-3 py-1 text-[11px] font-bold text-white bg-black hover:bg-zinc-800 rounded-md transition shadow-sm flex items-center gap-1"
                            title="Approve"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
