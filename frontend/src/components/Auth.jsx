import React, { useState } from 'react';
import { Lock, Mail, User, Briefcase, Building } from 'lucide-react';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      const res = await fetch(`http://localhost:7000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E2118] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#132C20] rounded-2xl border border-[#1D4433] shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="font-black text-amber-400 text-2xl tracking-tighter">YAF</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-[#8CAAA0] text-sm">
            Yousafzai Agri Foods ERP System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6A947F]" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6A947F]" />
                <input
                  type="text"
                  placeholder="Role (e.g., Sales Manager)"
                  required
                  className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                />
              </div>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6A947F]" />
                <input
                  type="text"
                  placeholder="Department"
                  required
                  className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6A947F]" />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6A947F]" />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-[#0E2118] border border-[#1D4433] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-[#6A947F] focus:border-[#2E684E] focus:outline-none"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#8CAAA0] hover:text-white text-sm transition"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
