import React from 'react';
import { UserCheck, X, Shield } from 'lucide-react';

export default function RoleSwitcherModal({ isOpen, onClose, users, currentUser, onSelectUser }) {
  const isDevRoleSwitcherEnabled = Boolean(
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_ROLE_SWITCHER === 'true'
  );

  if (!isOpen || !isDevRoleSwitcherEnabled) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              YOUSAFZAI AGRI FOODS (PVT) LTD · SINCE 1960
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-1">
              Select Demo Role (19 Working Roles from PDF Page 4)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any role to sign in as that person. Each user has their own permissions and workflow tasks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black font-bold"
          >
            ✕
          </button>
        </div>

        {/* Development Only Disclaimer */}
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">DEVELOPMENT UI PREVIEW ONLY:</span>
            <p className="mt-0.5 text-amber-800">
              Switching roles here previews client-side page layouts and navigation rules. It <strong>does not authenticate</strong> the selected user with the backend or exchange JWT bearer tokens. Any API operations requiring elevated privileges will be rejected with HTTP 403 Forbidden. To test real role permissions, sign out and log in with real account credentials.
            </p>
          </div>
        </div>

        {/* 19 Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {users.map((u) => {
            const isSelected = currentUser?.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                  isSelected
                    ? 'border-black bg-gray-50 ring-2 ring-black/10'
                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/60'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {u.avatar || u.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-gray-900 truncate">{u.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{u.role}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{u.department}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
