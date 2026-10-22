import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';

export default function ApprovalsInbox({ tasks, onApproveTask, isLoading, error, onRefetch }) {
  const [activeTab, setActiveTab] = useState('waiting');
  const [filterDoc, setFilterDoc] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [rejectModalTask, setRejectModalTask] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const filteredTasks = (tasks || []).filter((t) => {
    if (activeTab === 'waiting' && t.status !== 'pending') return false;
    if (activeTab === 'completed' && t.status === 'pending') return false;
    if (filterDoc && !t.doc_number?.toLowerCase().includes(filterDoc.toLowerCase()) && !t.party?.toLowerCase().includes(filterDoc.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleApprove = async (task) => {
    setProcessingId(task.id);
    setRowError(null);
    try {
      await onApproveTask(task.id, 'approved');
      if (onRefetch) onRefetch();
    } catch (err) {
      setRowError({ id: task.id, message: err.message || 'Action failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReturn = async (task) => {
    setProcessingId(task.id);
    setRowError(null);
    try {
      await onApproveTask(task.id, 'returned');
      if (onRefetch) onRefetch();
    } catch (err) {
      setRowError({ id: task.id, message: err.message || 'Action failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (task) => {
    setRejectModalTask(task);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('A non-empty rejection reason is required before sending.');
      return;
    }
    setProcessingId(rejectModalTask.id);
    setRejectError('');
    try {
      await onApproveTask(rejectModalTask.id, 'rejected');
      setRejectModalTask(null);
      setRejectReason('');
      if (onRefetch) onRefetch();
    } catch (err) {
      setRejectError(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
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
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span>Loading approvals...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50 border border-rose-200 m-4 rounded-xl text-xs font-semibold">
            {error}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No pending approvals
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="divide-y divide-gray-50">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/80 transition">
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
                      <span>Assigned to: {task.assigned_role || 'Approver'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.waiting_since || task.created_at || 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleOpenReject(task)}
                        disabled={processingId === task.id}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReturn(task)}
                        disabled={processingId === task.id}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Return
                      </button>
                      <button
                        onClick={() => handleApprove(task)}
                        disabled={processingId === task.id}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {processingId === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{task.action_label || 'Approve'}</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Completed
                    </span>
                  )}
                </div>
              </div>

              {rowError && rowError.id === task.id && (
                <div className="px-5 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{rowError.message}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Reject Task {rejectModalTask.doc_number}</h3>
              <button
                onClick={() => { setRejectModalTask(null); setRejectReason(''); setRejectError(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Please provide a mandatory reason for rejecting this document.
            </p>
            <div>
              <textarea
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
                placeholder="Enter rejection reason..."
                className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-500 h-24"
                rows={3}
              />
              {rejectError && (
                <p className="text-xs text-rose-600 font-semibold mt-1">{rejectError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setRejectModalTask(null); setRejectReason(''); setRejectError(''); }}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold"
                disabled={processingId === rejectModalTask.id}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId === rejectModalTask.id}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {processingId === rejectModalTask.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
