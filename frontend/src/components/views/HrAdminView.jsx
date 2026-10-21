import React, { useState } from 'react';
import { Users, Search, Plus, Mail, Building, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HrAdminView({ users, onAddUser }) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState('Operations');
  const [newEmail, setNewEmail] = useState('');

  const departments = ['All', 'Executive', 'Operations', 'Finance', 'Plant', 'Quality', 'Sales', 'Marketing', 'HR', 'IT'];

  const filteredUsers = (users || []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.role.toLowerCase().includes(search.toLowerCase()) ||
                          (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    const matchesDept = selectedDept === 'All' || u.department.toLowerCase() === selectedDept.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName || !newRole) return;
    if (onAddUser) {
      onAddUser({
        name: newName,
        role: newRole,
        department: newDept,
        email: newEmail || `${newName.toLowerCase().replace(/\s+/g, '.')}@yousafzaifoods.pk`,
        avatar: newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      });
    }
    setNewName('');
    setNewRole('');
    setNewEmail('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">HR & Administration</h2>
          <p className="text-xs text-gray-500 mt-1">
            Complete employee directory, department roles, active staff permissions, and organizational staff roster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Staff</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{users?.length || 20}</div>
          <span className="text-[11px] text-gray-500">Registered officers</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Departments</span>
          <div className="text-2xl font-black text-gray-900 mt-1">9</div>
          <span className="text-[11px] text-gray-500">Active divisions</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System Status</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>100% Active</span>
          </div>
          <span className="text-[11px] text-gray-500">Zero locked accounts</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Head Office</span>
          <div className="text-2xl font-black text-gray-900 mt-1">Mardan</div>
          <span className="text-[11px] text-gray-500">KP, Pakistan</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, role or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-black"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Directory Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/70">
                <th className="py-3.5 px-4">EMPLOYEE</th>
                <th className="py-3.5 px-4">ROLE / POSITION</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4">EMAIL ADDRESS</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No employees found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0d4a2b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {u.avatar || u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{u.name}</div>
                          <div className="text-[10px] text-gray-400">ID: EMP-{String(u.id || idx + 1).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">{u.role}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {u.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                      {u.email || `${u.name.toLowerCase().replace(/\s+/g, '.')}@yousafzaifoods.pk`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                        View Profile
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Add New Staff Member</h3>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Asad Khan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Role / Designation</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Assistant Operations Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                >
                  {departments.filter(d => d !== 'All').map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. asad.khan@yousafzaifoods.pk"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold text-white bg-black hover:bg-zinc-800 shadow-sm"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
