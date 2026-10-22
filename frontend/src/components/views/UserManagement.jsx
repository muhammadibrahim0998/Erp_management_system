import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  UserCheck,
  UserX,
  Search,
  Edit2,
  CheckCircle,
  AlertCircle,
  X,
  Building,
  Briefcase,
  Mail,
  Lock
} from 'lucide-react';
import { userService } from '../../services';

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

const ROLES = [
  { role: 'ERP Admin', department: 'IT' },
  { role: 'Chairman & CEO', department: 'Executive' },
  { role: 'General Manager', department: 'Executive' },
  { role: 'Director Operations', department: 'Operations' },
  { role: 'Director Finance', department: 'Finance' },
  { role: 'Plant Manager', department: 'Plant' },
  { role: 'Production Manager', department: 'Production' },
  { role: 'Breaking Supervisor', department: 'Plant' },
  { role: 'Gate Officer', department: 'Security' },
  { role: 'QC Cell', department: 'Quality' },
  { role: 'Raw Material Store', department: 'Inventory' },
  { role: 'Finish Store & Delivery', department: 'Logistics' },
  { role: 'Procurement', department: 'Purchasing' },
  { role: 'Sales Manager', department: 'Sales' },
  { role: 'Sales Officer', department: 'Sales' },
  { role: 'Head of Marketing', department: 'Marketing' },
  { role: 'Social Media & Content', department: 'Marketing' },
  { role: 'Accounts Officer', department: 'Finance' },
  { role: 'HR Manager', department: 'HR' },
  { role: 'Poultry Farms', department: 'Farms' }
];

export default function UserManagement({ currentUser, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Active user selection for edit/reset
  const [selectedUser, setSelectedUser] = useState(null);

  // Add Form Data
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Sales Officer',
    department: 'Sales'
  });

  // Edit Form Data
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    status: 'active'
  });

  // Reset Password Form Data
  const [newPassword, setNewPassword] = useState('');

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const data = await userService.createUser(addForm);
      showMsg(`User ${data.name} created successfully!`);
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'Sales Officer',
        department: 'Sales'
      });
      fetchUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const data = await userService.updateUser(selectedUser.id, editForm);
      showMsg(`User ${data.name} updated successfully!`);
      setIsEditModalOpen(false);
      fetchUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await userService.updateUserStatus(user.id, nextStatus);
      showMsg(`${user.name} is now ${nextStatus}!`);
      fetchUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await userService.resetUserPassword(selectedUser.id, newPassword);
      showMsg(`Password reset successfully for ${selectedUser.name}!`);
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'ALL' || u.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Admin · User Management & Access Control</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage organizational staff accounts, roles, departments, active status, and credentials for Yousafzai Agri Foods (Pvt) Ltd.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-xl transition shadow-sm self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff Account</span>
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm ${
          msg.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {msg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-bold whitespace-nowrap">Department:</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-black"
          >
            <option value="ALL">All Departments ({users.length})</option>
            {DEPARTMENTS.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Designation</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Login Email</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No users matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.status === 'active';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                            {u.avatar || u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{u.name}</div>
                            <div className="text-[10px] text-gray-400">ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{u.role}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[11px]">
                          {u.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        {u.email || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Edit User"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditForm({
                                name: u.name,
                                email: u.email || '',
                                role: u.role,
                                department: u.department,
                                status: u.status || 'active'
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-black transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Reset Password"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('');
                              setIsResetModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-amber-600 transition"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title={isActive ? 'Suspend User' : 'Activate User'}
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg border transition ${
                              isActive
                                ? 'border-gray-200 hover:border-rose-300 hover:bg-rose-50 text-gray-500 hover:text-rose-600'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">Create New Staff User</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="tariq@yaf.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => {
                      const r = e.target.value;
                      const found = ROLES.find(x => x.role === r);
                      setAddForm({ ...addForm, role: r, department: found ? found.department : addForm.department });
                    }}
                    className="w-full px-2.5 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                  >
                    {ROLES.map((r, i) => (
                      <option key={i} value={r.role}>{r.role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Department</label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                  >
                    {DEPARTMENTS.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">Edit User Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                  >
                    {ROLES.map((r, i) => (
                      <option key={i} value={r.role}>{r.role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                  >
                    {DEPARTMENTS.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">Reset Password</h3>
              <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Set a new secure password for <strong className="text-gray-900">{selectedUser.name}</strong> ({selectedUser.email}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
