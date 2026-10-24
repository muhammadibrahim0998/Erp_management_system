import React, { useState, useEffect } from 'react';
import { Lock, Mail, User, Briefcase, Building, Sparkles, ShieldAlert } from 'lucide-react';
import { authService } from '../services';
import { apiClient } from '../services/apiClient';

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

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Sales Officer',
    department: 'Sales'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devUsers, setDevUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    if (import.meta.env.DEV && isLogin) {
      let isMounted = true;
      apiClient.get('/api/users')
        .then(users => {
          if (isMounted && Array.isArray(users) && users.length > 0) {
            setDevUsers(users);
          }
        })
        .catch(() => {});
      return () => { isMounted = false; };
    }
  }, [isLogin]);

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    const found = ROLES.find(r => r.role === selectedRole);
    setFormData({
      ...formData,
      role: selectedRole,
      department: found ? found.department : formData.department
    });
  };

  const handleQuickFill = (email, pass) => {
    setFormData(prev => ({
      ...prev,
      email,
      password: pass
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = isLogin
        ? await authService.login(formData.email, formData.password)
        : await authService.signup(formData);

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E2118] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#132C20] rounded-2xl border border-[#1D4433] shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
            <span className="font-black text-amber-400 text-2xl tracking-tighter">YAF</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isLogin ? 'Sign In to AgenTech ERP' : 'Register New Account'}
          </h1>
          <p className="text-[#8CAAA0] text-xs">
            Yousafzai Agri Foods (Pvt) Ltd · Head Office Mardan
          </p>
        </div>

        {/* Development-Only Role Shortcuts (UI-LOGIN-001) */}
        {import.meta.env.DEV && isLogin && (
          <div className="mb-5 p-3 rounded-xl bg-[#0E2118] border border-[#1D4433]">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dev Role Shortcuts ({devUsers.length} Roles):</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                Dev Only
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {devUsers.map((u, idx) => {
                const hasLogin = Boolean(u.email);
                const isSelected = selectedEmail === u.email;
                return (
                  <button
                    key={u.id || u.email || idx}
                    type="button"
                    disabled={!hasLogin}
                    onClick={() => {
                        let fillPass = '123456';
                        if (u.email === 'ceo@gmail.com') fillPass = 'ceo12345';
                        else if (u.email === 'kamranali@gmail.com') fillPass = 'superadmin12345';
                        else if (u.email === 'superadmin@gmail.com') fillPass = 'admin12345';
                        else if (u.email === 'tariqgate@gmail.com') fillPass = 'tariq123';
                        handleQuickFill(u.email, fillPass);
                        setSelectedEmail(u.email);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition border ${
                      !hasLogin
                        ? 'opacity-40 cursor-not-allowed bg-[#173727]/40 border-gray-700 text-gray-500'
                        : isSelected
                        ? 'bg-[#1F4834] border-amber-400 text-white shadow-sm ring-1 ring-amber-400/50'
                        : 'bg-[#173727] hover:bg-[#1f4834] text-white border-[#27533E]'
                    }`}
                  >
                    <div className="font-bold text-[11px] leading-tight text-amber-300 truncate">
                      {u.role}
                    </div>
                    <div className="text-[10px] text-gray-300 truncate mt-0.5">
                      {hasLogin ? (u.name || u.email) : 'no login set'}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-[#6A947F] mt-2 text-center">
              Click any role to autofill Email & Password (pass: <code className="text-amber-300/80 font-mono">123456</code> · Super Admin: <code className="text-amber-300/80 font-mono">superadmin12345</code> · CEO: <code className="text-amber-300/80 font-mono">ceo12345</code>)
            </div>
          </div>
        )}

        {error && (
          <div className={`mb-5 p-3 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-2 ${
            error.toLowerCase().includes('too many')
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300'
              : 'bg-rose-500/10 border border-rose-500/50 text-rose-400'
          }`}>
            {error.toLowerCase().includes('too many') && <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />}
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A947F]" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A947F]" />
                <select
                  value={formData.role}
                  onChange={handleRoleChange}
                  className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:border-[#2E684E] focus:outline-none"
                >
                  {ROLES.map((r, idx) => (
                    <option key={idx} value={r.role} className="bg-[#0E2118] text-white">
                      {r.role} ({r.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A947F]" />
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:border-[#2E684E] focus:outline-none"
                >
                  {DEPARTMENTS.map((dept, idx) => (
                    <option key={idx} value={dept} className="bg-[#0E2118] text-white">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A947F]" />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A947F]" />
            <input
              type="password"
              placeholder="Password (minimum 6 characters)"
              required
              minLength={6}
              className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-md"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#8CAAA0] hover:text-white text-xs transition"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
