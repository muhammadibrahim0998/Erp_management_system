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

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No pending tasks found for this filter.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/80 transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 text-gray-700">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-gray-900">{task.doc_number}</span>
                    <span className="text-xs text-gray-500">{task.doc_type}</span>
                    {task.priority === 'high' && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        High
                      </span>
                    )}
                    {task.status !== 'pending' && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {task.status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mt-1">{task.title}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>Assigned to: {task.assigned_role || 'General Manager'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.waiting_since}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleAction(task, 'rejected')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(task, 'returned')}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg transition"
                    >
                      Return
                    </button>
                    <button
                      onClick={() => handleAction(task, 'approved')}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{task.action_label}</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Completed
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
