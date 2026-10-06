import React, { useState } from 'react';
import {
  Share2,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  PieChart,
  BarChart,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function MarketingView({ campaigns }) {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns?.[0] || null);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Marketing & Brand</h2>
          <p className="text-xs text-gray-500 mt-1">
            Campaign budgets go Marketing → Finance → CEO. Then spend against budget, creatives delivered against plan, reach, engagement and leads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
            Campaign Pipeline Active
          </span>
        </div>
      </div>

      {/* 5-Stage Approval / Lifecycle Stepper (Page 15) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span className="font-bold text-gray-700">0 · Plan</span>
            <div className="text-[11px] text-gray-500 mt-1">Marketing drafts budget</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span className="font-bold text-gray-700">1 · Finance review</span>
            <div className="text-[11px] text-gray-500 mt-1">Checks budget & cash</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="font-bold text-emerald-800">✓ 1 · CEO approval</span>
            <div className="text-[11px] text-emerald-700 mt-1">Final sign-off</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 ring-2 ring-blue-500/20">
            <span className="font-bold text-blue-800">● 1 · Live</span>
            <div className="text-[11px] text-blue-700 mt-1">Spend, creatives & posts</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span className="font-bold text-gray-500">1 · Completed</span>
            <div className="text-[11px] text-gray-400 mt-1">Results reported</div>
          </div>
        </div>
      </div>

      {/* KPI Cards (Page 15) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Approved budget</span>
          <div className="text-xl font-black text-gray-900 mt-1">PKR 2.7M</div>
          <span className="text-[10px] text-gray-400">PKR 6.4M waiting</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Spent</span>
          <div className="text-xl font-black text-gray-900 mt-1">PKR 2.2M</div>
          <span className="text-[10px] text-emerald-600 font-semibold">82% of approved</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Creatives delivered</span>
          <div className="text-xl font-black text-gray-900 mt-1">60 / 75</div>
          <span className="text-[10px] text-gray-400">15 to go</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Reach</span>
          <div className="text-xl font-black text-gray-900 mt-1">1.3M</div>
          <span className="text-[10px] text-gray-500">5.7% engagement</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Leads</span>
          <div className="text-xl font-black text-emerald-600 mt-1">1,066</div>
          <span className="text-[10px] text-gray-400">PKR 1,220 per lead</span>
        </div>
      </div>

      {/* Detailed Campaign Card: MKB-2026-0002 (Page 16) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-gray-500">MKB-2026-0002</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Live
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-1">
              Always-on social — farm fresh since 1960
            </h3>
            <p className="text-xs text-gray-500">
              Grow the brand on social media every week and bring new dealers through lead ads · 16 Jul 2026 – 14 Oct 2026
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">Total Budget</span>
            <div className="text-xl font-black text-gray-900 font-mono">PKR 1,781,000</div>
            <span className="text-xs text-emerald-700 font-semibold">Spent: PKR 1,319,000 (74%)</span>
          </div>
        </div>

        {/* Campaign Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-400 text-[10px]">TIME ELAPSED</span>
            <div className="font-black text-gray-900 text-sm mt-0.5">84%</div>
            <span className="text-[10px] text-gray-400">76 of 91 days</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-400 text-[10px]">AD SPEND</span>
            <div className="font-black text-gray-900 text-sm mt-0.5">PKR 890k</div>
            <span className="text-[10px] text-gray-400">of 1.1M planned</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-400 text-[10px]">CREATIVES</span>
            <div className="font-black text-gray-900 text-sm mt-0.5">36 / 51</div>
            <span className="text-[10px] text-gray-400">5 in the works</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-400 text-[10px]">POSTS</span>
            <div className="font-black text-gray-900 text-sm mt-0.5">26</div>
            <span className="text-[10px] text-gray-400">1.4M impressions</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-400 text-[10px]">REACH</span>
            <div className="font-black text-gray-900 text-sm mt-0.5">873k</div>
            <span className="text-[10px] text-gray-400">target 600k</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-400 text-[10px]">LEADS</span>
            <div className="font-black text-emerald-700 text-sm mt-0.5">498</div>
            <span className="text-[10px] text-gray-400">PKR 1,787/lead</span>
          </div>
        </div>
      </div>
    </div>
  );
}
