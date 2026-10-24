import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function DemoBadge({ label = "Demo data — not connected to live records", className = "" }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium w-fit ${className || 'mb-4'}`}>
      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
