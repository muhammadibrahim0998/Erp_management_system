import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Search,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  Layers,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import { auditService } from '../../services';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

function formatLogDetails(details) {
  if (!details || !String(details).trim()) return 'No details recorded';
  return String(details)
    .replace(/\b(undefined|null)\b/g, 'User not recorded');
}

export default function AuditLogsView({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedEvents: 0,
    warningEvents: 0,
    todayEvents: 0,
    uniqueActors: 0
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null); // For detail modal
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const filters = {
        page: String(page),
        limit: String(pagination.limit)
      };

      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (selectedCategory !== 'ALL') filters.entityType = selectedCategory;
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;

      const data = await auditService.getAuditLogs(filters);

      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, pages: 1 });
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    fetchLogs(1);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const filters = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (selectedCategory !== 'ALL') filters.entityType = selectedCategory;
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;

      const exportData = await auditService.exportAuditLogs(filters);

      const headers = ['Log ID', 'Timestamp', 'User Name', 'Role', 'Action', 'Category', 'Entity ID', 'IP Address', 'Status', 'Details'];
      const rows = exportData.map(log => [
        log.id,
        new Date(log.created_at).toLocaleString(),
        log.user_name || 'System',
        log.role || 'System',
        log.action,
        log.entity_type,
        log.entity_id || '-',
        log.ip_address,
        log.status,
        log.details || ''
      ]);

      exportToExcel({
        filename: `YAF_Audit_Trail_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'AuditLogs',
        data: rows,
        headers
      });

      // Log export event
      await auditService.logClientEvent({
        action: 'EXPORT_AUDIT_EXCEL',
        entityType: 'SECURITY',
        details: `Exported ${exportData.length} audit logs to Excel (.xlsx)`
      });

      showNotification('Audit logs exported to Excel successfully');
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const filters = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (selectedCategory !== 'ALL') filters.entityType = selectedCategory;
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;

      const exportData = await auditService.exportAuditLogs(filters);

      const headers = ['Time', 'Actor', 'Role', 'Action', 'Target', 'IP', 'Status'];
      const rows = exportData.slice(0, 150).map(log => [
        new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        log.user_name || 'System',
        log.role || 'Staff',
        log.action,
        log.entity_id || log.entity_type,
        log.ip_address,
        log.status
      ]);

      exportToPDF({
        filename: `YAF_Security_Audit_${new Date().toISOString().slice(0, 10)}`,
        title: 'Central Security & Compliance Audit Trail',
        subtitle: 'Enterprise Activity Log & System Governance Report',
        period: `Extracted On: ${new Date().toLocaleString()}`,
        kpis: [
          { label: 'Total Events', value: String(stats.totalEvents) },
          { label: 'Security Alerts', value: String(stats.failedEvents) },
          { label: 'Warnings', value: String(stats.warningEvents) },
          { label: 'Active Actors', value: String(stats.uniqueActors) }
        ],
        headers,
        rows,
        summaryNotes: [
          'Confidential Record: Prepared exclusively for Yousafzai Agri Foods Executive Board and Internal Audit.',
          'All events are timestamped and cryptographically verified against server system clocks.'
        ]
      });

      // Log export event
      await auditService.logClientEvent({
        action: 'EXPORT_AUDIT_PDF',
        entityType: 'SECURITY',
        details: `Exported ${exportData.length} audit logs to Corporate PDF`
      });

      showNotification('Audit Trail PDF generated successfully');
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
            {status}
          </span>
        );
    }
  };

  const getActionColor = (action, status) => {
    if (status === 'FAILED') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (status === 'WARNING') return 'text-amber-800 bg-amber-50 border-amber-200';

    if (action.includes('LOGIN')) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (action.includes('USER') || action.includes('PASSWORD')) return 'text-blue-800 bg-blue-50 border-blue-200';
    if (action.includes('PO') || action.includes('PURCHASE')) return 'text-indigo-800 bg-indigo-50 border-indigo-200';
    if (action.includes('GATE')) return 'text-cyan-800 bg-cyan-50 border-cyan-200';
    if (action.includes('SALES')) return 'text-purple-800 bg-purple-50 border-purple-200';
    if (action.includes('INVENTORY') || action.includes('PRODUCTION')) return 'text-teal-800 bg-teal-50 border-teal-200';
    if (action.includes('PAYROLL')) return 'text-orange-800 bg-orange-50 border-orange-200';

    return 'text-gray-800 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#0E2118] text-white px-4 py-2.5 rounded-xl border border-emerald-500 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#0E2118] border border-emerald-200">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Audit Trail & Security Logs
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#0E2118] text-amber-300">
              Immutable Trail
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Centralized compliance, user tracking, and security monitoring for Yousafzai Agri Foods (Pvt) Ltd.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition border border-gray-300 disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting || logs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition border border-emerald-300 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || logs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0E2118] hover:bg-[#18392A] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Events</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2 font-mono">
            {Number(stats.totalEvents).toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span>Across all operational modules</span>
          </div>
        </div>

        {/* Security Alerts / Failed */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Failed / Throttled</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2 font-mono">
            {Number(stats.failedEvents).toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
            <span>Invalid credentials or blocked logins</span>
          </div>
        </div>

        {/* Warnings & Critical Modifications */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Warnings & Overrides</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 font-mono">
            {Number(stats.warningEvents).toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
            <span>Suspensions, resets & credit breaches</span>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Today's Activity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2 font-mono">
            {Number(stats.todayEvents).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <span>Active unique actors: {stats.uniqueActors}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by actor name, action, IP, target document, or keyword..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#0E2118] hover:bg-[#18392A] text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Search</span>
          </button>

          {(searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
            >
              Reset
            </button>
          )}
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'AUTH', label: 'Authentication' },
              { id: 'USER', label: 'User Admin' },
              { id: 'PURCHASE_ORDER', label: 'Procurement' },
              { id: 'SALES_ORDER', label: 'Sales & Credit' },
              { id: 'INVENTORY', label: 'Inventory' },
              { id: 'PRODUCTION', label: 'Plant & Production' },
              { id: 'GATE_PASS', label: 'Gate & Logistics' },
              { id: 'PAYROLL', label: 'Payroll' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? 'bg-[#0E2118] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
              Status:
            </span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'SUCCESS', label: 'Success' },
              { id: 'WARNING', label: 'Warning' },
              { id: 'FAILED', label: 'Failed' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedStatus === st.id
                    ? 'bg-[#0E2118] text-amber-300 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0E2118] text-white text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor / Role</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Category & ID</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500 font-semibold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading audit records from database...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 font-medium">
                    <Shield className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <span>No audit log records found matching your filters.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const logDate = new Date(log.created_at);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/80 transition font-medium text-gray-800"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-gray-900">
                          {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {logDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#0E2118] text-white flex items-center justify-center text-xs font-black shrink-0">
                            {(log.user_name || 'SY').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{log.user_name || 'System Core'}</div>
                            <div className="text-[10px] text-gray-400">{log.role || 'System'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-bold border font-mono ${getActionColor(log.action, log.status)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target / Entity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            {log.entity_type}
                          </span>
                          {log.entity_id && (
                            <span className="font-mono text-[11px] font-semibold text-gray-900">
                              #{log.entity_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 max-w-xs truncate" title={formatLogDetails(log.details)}>
                        <span className="text-gray-600 text-xs">
                          {formatLogDetails(log.details) || '—'}
                        </span>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {log.ip_address}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Inspect */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
                          title="View Full Metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <div>
            Showing <span className="font-bold text-gray-900">{logs.length}</span> of{' '}
            <span className="font-bold text-gray-900">{pagination.total}</span> total events (Page{' '}
            <span className="font-bold text-gray-900">{pagination.page}</span> of {pagination.pages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <span className="px-2 font-mono font-bold text-gray-700">
              {pagination.page} / {pagination.pages}
            </span>

            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || isLoading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0E2118]" />
                <h3 className="font-bold text-sm text-gray-900">
                  Audit Event #{selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Action</span>
                  <span className="font-mono font-bold text-gray-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Status</span>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Actor</span>
                  <span className="font-semibold text-gray-900">{selectedLog.user_name || 'System Core'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Role</span>
                  <span className="text-gray-700">{selectedLog.role || 'System'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Target Entity</span>
                  <span className="font-mono text-gray-800">{selectedLog.entity_type} {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ''}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Client IP</span>
                  <span className="font-mono text-gray-700">{selectedLog.ip_address}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Details & Description</span>
                <div className="p-3 bg-gray-900 text-emerald-400 rounded-xl font-mono text-[11px] leading-relaxed break-words">
                  {formatLogDetails(selectedLog.details) || 'No additional description provided.'}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Exact Server Timestamp</span>
                <span className="text-gray-700 font-mono text-xs">{new Date(selectedLog.created_at).toISOString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
