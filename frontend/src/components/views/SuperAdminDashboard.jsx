import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Mail,
  Briefcase,
  Building2,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  Check,
  Power,
  Edit3,
  Trash2
} from 'lucide-react';
import { userService } from '../../services';
import { ROLE_ALLOWED_PAGES } from '../../App';

export const ALL_ROLES_LIST = [
  { role: 'Chairman & CEO', department: 'Executive', defaultPage: 'dashboard', desc: 'Full enterprise oversight & CEO approval lines' },
  { role: 'General Manager', department: 'Executive', defaultPage: 'dashboard', desc: 'Plant and business operations command' },
  { role: 'Super Admin', department: 'IT', defaultPage: 'super-admin', desc: 'Complete enterprise account creation and security administration' },
  { role: 'ERP Admin', department: 'IT', defaultPage: 'super-admin', desc: 'System provisioning, user administration, and audit logs' },
  { role: 'Director Operations', department: 'Operations', defaultPage: 'live-operations', desc: 'Cross-facility operations, manufacturing, and inventory' },
  { role: 'Plant Manager', department: 'Plant', defaultPage: 'production', desc: 'Processing plant scheduling and work orders' },
  { role: 'Production Manager', department: 'Production', defaultPage: 'production', desc: 'Manufacturing line output and batch recipe metrics' },
  { role: 'Breaking Supervisor', department: 'Plant', defaultPage: 'production', desc: 'Industrial egg breaking and output yield logging' },
  { role: 'Gate Officer', department: 'Security', defaultPage: 'gate', desc: 'Inward & outward vehicle entry gate passes' },
  { role: 'QC Cell', department: 'Quality', defaultPage: 'qc', desc: 'Goods inspection, defect rate, and GRN clearance' },
  { role: 'Raw Material Store', department: 'Inventory', defaultPage: 'inventory', desc: 'Cold store storage, receipts, and stock count' },
  { role: 'Finish Store & Delivery', department: 'Logistics', defaultPage: 'inventory', desc: 'Finished goods storage and outbound dispatches' },
  { role: 'Procurement', department: 'Purchasing', defaultPage: 'procurement', desc: 'Purchase orders (POs) and vendor management' },
  { role: 'Sales Manager', department: 'Sales', defaultPage: 'sales', desc: 'Sales order dispatch clearances and dealer terms' },
  { role: 'Sales Officer', department: 'Sales', defaultPage: 'pos', desc: 'POS counter retail invoices and dealer orders' },
  { role: 'Head of Marketing', department: 'Marketing', defaultPage: 'marketing', desc: 'Campaign budgets, spend performance, and reach' },
  { role: 'Social Media & Content', department: 'Marketing', defaultPage: 'marketing', desc: 'Social creatives, ad delivery, and engagement' },
  { role: 'Director Finance', department: 'Finance', defaultPage: 'finance', desc: 'Treasury, credit control, cash flow, and P&L' },
  { role: 'Accounts Officer', department: 'Finance', defaultPage: 'finance', desc: 'Bank accounts, ledger entries, and receivables' },
  { role: 'HR Manager', department: 'HR', defaultPage: 'hr', desc: 'Employee personnel directory and monthly payroll' },
  { role: 'Poultry Farms', department: 'Farms', defaultPage: 'live-operations', desc: 'Farm flock management, layer production, and transfers' }
];

const DEPARTMENTS = [
  'Executive',
  'Operations',
  'Plant',
  'Production',
  'Security',
  'Quality',
  'Inventory',
  'Logistics',
  'Purchasing',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Farms',
  'IT'
];

export default function SuperAdminDashboard({ currentUser, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Gate Officer');
  const [newUserDept, setNewUserDept] = useState('Security');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit User Modal State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete User Confirmation State
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Password Modal State
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data || []);
    } catch (e) {
      showNotice('Failed to load user directory: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // When role changes in create form, auto-match department
  const handleRoleChange = (roleName) => {
    setNewUserRole(roleName);
    const matched = ALL_ROLES_LIST.find(r => r.role === roleName);
    if (matched) {
      setNewUserDept(matched.department);
    }
  };

  // Submit New User Account
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      setFormError('All fields (Name, Email, Password, Role) are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept
      });

      showNotice(`User account created successfully for: ${newUserName} (${newUserRole})`);
      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      await loadUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      setFormError(err.message || 'Error creating user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.updateUserStatus(user.id, nextStatus);
      showNotice(`${user.name}'s account status set to: ${nextStatus}`);
      await loadUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (e) {
      showNotice('Failed to update status', 'error');
    }
  };

  // Reset Password Submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordValue.trim() || !selectedUserForReset) return;
    setIsResetting(true);
    try {
      await userService.resetUserPassword(selectedUserForReset.id, newPasswordValue.trim());
      showNotice(`Password updated successfully for ${selectedUserForReset.name}`);
      setSelectedUserForReset(null);
      setNewPasswordValue('');
    } catch (e) {
      showNotice('Failed to reset password: ' + e.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user) => {
    setSelectedUserForEdit(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'Gate Officer');
    setEditDept(user.department || 'Security');
    setEditStatus(user.status || 'active');
    setEditError('');
  };

  // When role changes in edit form, auto-match department
  const handleEditRoleChange = (roleName) => {
    setEditRole(roleName);
    const matched = ALL_ROLES_LIST.find(r => r.role === roleName);
    if (matched) {
      setEditDept(matched.department);
    }
  };

  // Submit Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setIsUpdating(true);
    setEditError('');
    try {
      await userService.updateUser(selectedUserForEdit.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        department: editDept,
        status: editStatus
      });
      showNotice(`Updated details successfully for ${editName}`);
      setSelectedUserForEdit(null);
      await loadUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      setEditError(err.message || 'Error updating user');
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm Delete User
  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(selectedUserForDelete.id);
      showNotice(`Account deleted successfully for: ${selectedUserForDelete.name}`);
      setSelectedUserForDelete(null);
      await loadUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      showNotice(err.message || 'Failed to delete user account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.role || '').toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'ALL' || u.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [users, search, deptFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black text-white">
              Super Admin Console
            </span>
            <span className="text-xs text-gray-500 font-medium">Enterprise Identity & Access Management (IAM)</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Super Admin Control Center
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Create new accounts for any department, issue secure login credentials, and enforce role-based module restrictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm ${
          notification.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Accounts</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{users.length}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Active credentials</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Status</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {users.filter(u => u.status === 'active').length}
          </div>
          <span className="text-[10px] text-gray-500">Allowed system login</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Roles Configured</span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {new Set(users.map(u => u.role)).size}
          </div>
          <span className="text-[10px] text-gray-500">Distinct functional job roles</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RBAC Policy</span>
          <div className="text-2xl font-black text-gray-900 mt-1">100%</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Strict page filtering</span>
        </div>
      </div>

      {/* Users Directory Table with Search & Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              All Enterprise User Accounts & Permissions Directory
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
              {filteredUsers.length} Users
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black w-48 sm:w-60"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 focus:outline-none focus:border-black"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <button
              onClick={loadUsers}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                <th className="py-3 px-4">USER</th>
                <th className="py-3 px-4">EMAIL (LOGIN USERNAME)</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">FUNCTIONAL ROLE</th>
                <th className="py-3 px-4">PAGES ALLOWED UPON LOGIN</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">CREDENTIAL ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredUsers.map((u) => {
                const allowedPages = ROLE_ALLOWED_PAGES[u.role] || ['dashboard'];
                const isCeo = u.role === 'Chairman & CEO';
                const isSuperAdmin = u.role === 'Super Admin' || u.role === 'ERP Admin';

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {u.avatar || u.name?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{u.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                      {u.email}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-[11px] text-gray-700">
                        {u.department}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isCeo
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : isSuperAdmin
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {allowedPages.slice(0, 3).map((pageId, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gray-100 text-gray-600">
                            {pageId}
                          </span>
                        ))}
                        {allowedPages.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            +{allowedPages.length - 3} modules
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition flex items-center gap-1 border ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                        <span>{u.status === 'active' ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                          title="Edit user details & permissions"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setNewPasswordValue('');
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                          title="Reset user login password"
                        >
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>Password</span>
                        </button>
                        {currentUser?.email !== u.email && (
                          <button
                            onClick={() => setSelectedUserForDelete(u)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                            title="Delete this user account"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-Based Access Reference Guide */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Enterprise Role Access & Landing Page Reference</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            When any user logs in with their email and password, the system checks their role below and only renders their authorized operational pages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_ROLES_LIST.map((r, i) => (
            <div key={i} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 hover:border-gray-300 transition">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{r.role}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-600">
                  {r.department}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">{r.desc}</p>
              <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                <span>Default Landing:</span>
                <span className="font-mono bg-emerald-50 px-1 rounded border border-emerald-200">
                  {r.defaultPage}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE USER ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Create New User Account</h3>
                  <p className="text-xs text-gray-500">Provide credentials and assign operational role</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-black font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asad Ullah Khan"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-semibold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Email Address (Login Username)</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. asad@yaf.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Initial Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password (e.g. 123456 or strong password)"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-gray-900 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5 block">Password is encrypted with Bcrypt (10 rounds) in MySQL</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Functional Job Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:outline-none focus:border-black"
                  >
                    {ALL_ROLES_LIST.map(r => (
                      <option key={r.role} value={r.role}>{r.role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Department</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:outline-none focus:border-black"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview of pages allowed */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Pages Allowed for this User Upon Login:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(ROLE_ALLOWED_PAGES[newUserRole] || ['dashboard']).map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-gray-200 text-gray-800">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isSubmitting ? 'Creating Account...' : 'Create Account & Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {selectedUserForReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-gray-900">Reset User Password</h3>
              </div>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="text-gray-400 hover:text-black font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Set a new login password for <strong>{selectedUserForReset.name}</strong> ({selectedUserForReset.email}):
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password (e.g. 123456)"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono font-bold text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold transition shadow-sm"
                >
                  {isResetting ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER DETAILS MODAL */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Edit User Account</h3>
                  <p className="text-xs text-gray-500">Update role, department, name, or account status</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="text-gray-400 hover:text-black font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-semibold text-gray-900"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Email Address (Login Username)</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Functional Job Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => handleEditRoleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:outline-none focus:border-black"
                  >
                    {ALL_ROLES_LIST.map(r => (
                      <option key={r.role} value={r.role}>{r.role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:outline-none focus:border-black"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 bg-white focus:outline-none focus:border-black"
                >
                  <option value="active">Active (Permitted to Log In)</option>
                  <option value="inactive">Inactive / Suspended (Access Blocked)</option>
                </select>
              </div>

              {/* Preview of pages allowed with this role */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Permitted Operational Pages for Selected Role:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(ROLE_ALLOWED_PAGES[editRole] || ['dashboard']).map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-gray-200 text-gray-800">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {selectedUserForDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Delete User Account?</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete the account for <strong>{selectedUserForDelete.name}</strong> ({selectedUserForDelete.email}) with role <strong>{selectedUserForDelete.role}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedUserForDelete(null)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition shadow-sm text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
