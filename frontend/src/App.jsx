import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Activity,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Package,
  Layers,
  ShoppingCart,
  Share2,
  Users,
  DollarSign,
  FileText,
  Sliders,
  Search,
  Bell,
  RefreshCw,
  Server,
  Database,
  Building2,
  UserCheck,
  ChevronRight,
  GitBranch,
  LogOut,
  Menu
} from 'lucide-react';

import ChairmanDashboard from './components/views/ChairmanDashboard';
import ApprovalsInbox from './components/views/ApprovalsInbox';
import LiveOperations from './components/views/LiveOperations';
import GateSecurity from './components/views/GateSecurity';
import QcGoodsReceipt from './components/views/QcGoodsReceipt';
import ProcurementView from './components/views/ProcurementView';
import ProductionBoard from './components/views/ProductionBoard';
import InventoryView from './components/views/InventoryView';
import SalesCreditView from './components/views/SalesCreditView';
import MarketingView from './components/views/MarketingView';
import HrAdminView from './components/views/HrAdminView';
import PayrollView from './components/views/PayrollView';
import FinanceView from './components/views/FinanceView';
import ReportsView from './components/views/ReportsView';
import SettingsMatrix from './components/views/SettingsMatrix';
import RoleSwitcherModal from './components/RoleSwitcherModal';
import ProcessMap from './components/views/ProcessMap';
import Auth from './components/Auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Live Server Data
  const [chairmanData, setChairmanData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [gatePasses, setGatePasses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [salesOrder, setSalesOrder] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [financeData, setFinanceData] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAllData = async () => {
    try {
      const [
        usersRes,
        chairRes,
        tasksRes,
        gateRes,
        poRes,
        prodRes,
        invRes,
        salesRes,
        campRes,
        payRes,
        finRes
      ] = await Promise.all([
        fetch('http://localhost:7000/api/users').catch(() => null),
        fetch('http://localhost:7000/api/dashboard/chairman').catch(() => null),
        fetch('http://localhost:7000/api/approvals').catch(() => null),
        fetch('http://localhost:7000/api/gate').catch(() => null),
        fetch('http://localhost:7000/api/procurement/pos').catch(() => null),
        fetch('http://localhost:7000/api/production/board').catch(() => null),
        fetch('http://localhost:7000/api/inventory').catch(() => null),
        fetch('http://localhost:7000/api/sales/orders').catch(() => null),
        fetch('http://localhost:7000/api/marketing').catch(() => null),
        fetch('http://localhost:7000/api/payroll').catch(() => null),
        fetch('http://localhost:7000/api/finance/overview').catch(() => null)
      ]);

      if (usersRes?.ok) {
        const u = await usersRes.json();
        setUsers(u);
        if (!currentUser && u.length > 0) setCurrentUser(u[0]);
      }
      if (chairRes?.ok) setChairmanData(await chairRes.json());
      if (tasksRes?.ok) setTasks(await tasksRes.json());
      if (gateRes?.ok) setGatePasses(await gateRes.json());
      if (poRes?.ok) setPurchaseOrders(await poRes.json());
      if (prodRes?.ok) setProductionOrders(await prodRes.json());
      if (invRes?.ok) setInventoryItems(await invRes.json());
      if (salesRes?.ok) setSalesOrder(await salesRes.json());
      if (campRes?.ok) setCampaigns(await campRes.json());
      if (payRes?.ok) setPayrollRuns(await payRes.json());
      if (finRes?.ok) setFinanceData(await finRes.json());
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 20000);
    return () => clearInterval(interval);
  }, []);

  // Action Handlers
  const handleApproveTask = async (taskId, actionType = 'approved') => {
    try {
      const res = await fetch(`http://localhost:7000/api/approvals/${taskId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType })
      });
      if (res.ok) {
        showNotification(`Task marked as ${actionType} in MySQL database`);
        fetchAllData();
      }
    } catch (e) {
      showNotification('Error processing task');
    }
  };

  const handleAddGatePass = async (data) => {
    try {
      const res = await fetch('http://localhost:7000/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showNotification('Inward Gate Pass issued successfully in MySQL');
        fetchAllData();
      }
    } catch (e) {
      showNotification('Error issuing gate pass');
    }
  };

  const handleAddPo = async (data) => {
    try {
      const res = await fetch('http://localhost:7000/api/procurement/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showNotification('Purchase Order created in MySQL');
        fetchAllData();
      }
    } catch (e) {
      showNotification('Error creating PO');
    }
  };

  const handleMoveOrder = async (id, stage) => {
    try {
      await fetch('http://localhost:7000/api/production/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage })
      });
      showNotification(`Order moved to ${stage}`);
      fetchAllData();
    } catch (e) { }
  };

  const handleApproveSales = async (soNumber) => {
    try {
      await fetch('http://localhost:7000/api/sales/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_number: soNumber })
      });
      showNotification('Sales order approved by CEO exception');
      fetchAllData();
    } catch (e) { }
  };

  const handleGeneratePayroll = async (month) => {
    try {
      await fetch('http://localhost:7000/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });
      showNotification(`Payroll generated for ${month} in MySQL`);
      fetchAllData();
    } catch (e) { }
  };

  const handleAddUser = async (userData) => {
    try {
      const res = await fetch('http://localhost:7000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        showNotification('New staff member added successfully in MySQL');
        fetchAllData();
      }
    } catch (e) { }
  };

  // Nav Groups matching PDF
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'approvals', label: 'Approvals', icon: CheckSquare, badge: tasks.filter(t => t.status === 'pending').length },
        { id: 'live-operations', label: 'Live operations', icon: Activity },
        { id: 'process-map', label: 'Process map', icon: GitBranch }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'procurement', label: 'Procurement', icon: ShoppingBag },
        { id: 'gate', label: 'Gate & security', icon: Truck },
        { id: 'qc', label: 'QC cell', icon: CheckCircle2 },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'production', label: 'Production', icon: Layers }
      ]
    },
    {
      title: 'SALES & MARKETING',
      items: [
        { id: 'sales', label: 'Sales', icon: ShoppingCart },
        { id: 'marketing', label: 'Marketing', icon: Share2 }
      ]
    },
    {
      title: 'PEOPLE',
      items: [
        { id: 'hr', label: 'HR & Admin', icon: Users },
        { id: 'payroll', label: 'Payroll', icon: DollarSign }
      ]
    },
    {
      title: 'MONEY',
      items: [
        { id: 'finance', label: 'Accounts & Finance', icon: Building2 },
        { id: 'reports', label: 'Reports', icon: FileText }
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        { id: 'settings', label: 'Approval matrix', icon: Sliders }
      ]
    }
  ];

  if (!isAuthenticated) {
    return <Auth onLogin={(user) => { setCurrentUser(user); setIsAuthenticated(true); fetchAllData(); }} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0c8547] text-gray-900 overflow-hidden font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#07361c] text-white px-4 py-2.5 rounded-xl border border-emerald-400 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Full-Width Vibrant Green Top Navbar matching image (#0c8547) */}
      <header className="h-16 border-b border-[#086634] px-0 flex items-center justify-between bg-gradient-to-r from-[#0a7a40] via-[#0c8748] to-[#0a7a40] shadow-[0_4px_16px_rgba(0,0,0,0.25)] z-20 shrink-0">
        {/* Left: 3D Brand Logo Div on Left, 3D Toggle Button on Right */}
        <div
          className={`h-full flex items-center justify-between transition-all duration-300 ease-in-out shrink-0 px-3 ${isSidebarOpen ? 'w-56 border-r border-[#086634] shadow-[1px_0_0_rgba(255,255,255,0.08)]' : 'w-auto gap-4'
            }`}
        >
          {/* Brand Header / Logo in 3D Div with Yellow Hover & Glow */}
          <div className="flex items-center gap-2 min-w-0 px-2 py-1 rounded-xl bg-gradient-to-b from-[#0d4f2b] to-[#07361c] border-t border-emerald-300/40 border-x border-[#094223] border-b-[2.5px] border-b-[#032412] shadow-[0_3px_6px_rgba(0,0,0,0.35)] hover:border-amber-400/80 hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer">
            {/* 3D YAF Badge */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#2a200e] via-[#1b1509] to-[#0f0b04] border-t border-amber-400/60 border-x border-amber-600/30 border-b-[2.5px] border-b-[#0a0702] flex items-center justify-center shrink-0 shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:border-amber-300 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-200">
              <span className="font-black text-amber-400 text-[11px] tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] group-hover:text-amber-300">YAF</span>
            </div>
            {/* Brand Title & Subtitle */}
            <div className="hidden sm:block min-w-0">
              <h1 className="font-black text-[11px] tracking-tight text-white uppercase truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] group-hover:text-amber-300 transition-colors duration-200">
                Yousafzai Foods
              </h1>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 group-hover:bg-amber-400 transition-colors animate-pulse"></span>
                <p className="text-[9px] text-emerald-100 group-hover:text-amber-200/90 font-bold truncate transition-colors duration-200">Head office - Mardan</p>
              </div>
            </div>
          </div>

          {/* 3D Sidebar Toggle Button on the Right Side (Where Sidebar Ends) */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#0d4f2b] to-[#07361c] border-t border-emerald-300/60 border-x border-[#094223] border-b-[3px] border-b-[#032412] text-emerald-100 shadow-[0_3px_0_0_#02180c,0_5px_12px_rgba(0,0,0,0.35)] hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:text-amber-950 hover:border-t-amber-200 hover:border-x-amber-400 hover:border-b-[#78350f] hover:shadow-[0_4px_0_0_#78350f,0_8px_20px_rgba(245,158,11,0.65)] hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 active:shadow-none transition-all duration-150 cursor-pointer shrink-0 flex items-center justify-center"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu className="w-5 h-5 transition-transform duration-200 hover:scale-105" />
          </button>
        </div>

        {/* Center: Modern Professional White 3D Search Bar */}
        <div className="relative flex-1 max-w-lg mx-6 group">
          <div className="relative flex items-center bg-white rounded-xl border-t border-t-white border-x border-gray-200 border-b-[3px] border-b-gray-300 shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:border-b-gray-400 hover:shadow-[0_5px_14px_rgba(0,0,0,0.3)] focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-600 focus-within:border-b-[3px] focus-within:border-b-emerald-700 transition-all duration-200">
            <Search className="w-4 h-4 absolute left-3.5 text-emerald-700 pointer-events-none transition-colors group-focus-within:text-emerald-800" />
            <input
              type="text"
              placeholder="Search documents, items, customers, suppliers..."
              className="w-full bg-transparent pl-10 pr-20 py-2 text-xs md:text-sm text-gray-800 font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
            />
            <div className="absolute right-2.5 flex items-center gap-1">
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-mono font-bold text-gray-500 shadow-xs">
                ⌘K
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: 3D Action Buttons & Profile Card */}
        <div className="flex items-center gap-3 pr-6">
          {/* Date Tag with 3D Pill Design */}
          <span className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-gradient-to-b from-[#0d4f2b] to-[#07361c] px-3 py-1.5 rounded-xl border-t border-emerald-300/40 border-x border-[#094223] border-b-[2.5px] border-b-[#032412] shadow-[0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-150">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>

          {/* Refresh Real-time Data 3D Button */}
          <button
            onClick={fetchAllData}
            className="group p-2 rounded-xl bg-gradient-to-b from-[#0d4f2b] to-[#07361c] border-t border-emerald-300/40 border-x border-[#094223] border-b-[3px] border-b-[#032412] text-white hover:text-white hover:from-[#115f34] hover:to-[#0a4223] hover:border-t-emerald-300/70 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)] active:translate-y-[2px] active:border-b-2 transition-all duration-150 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            title="Refresh All Real-time ERP Data"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
          </button>

          {/* Notifications 3D Button with Glowing Alert */}
          <button
            className="relative p-2 rounded-xl bg-gradient-to-b from-[#0d4f2b] to-[#07361c] border-t border-emerald-300/40 border-x border-[#094223] border-b-[3px] border-b-[#032412] text-white hover:text-white hover:from-[#115f34] hover:to-[#0a4223] hover:border-t-emerald-300/70 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)] active:translate-y-[2px] active:border-b-2 transition-all duration-150 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 border border-[#0c8547] shadow-[0_0_8px_#f59e0b] animate-ping"></span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 border border-[#0c8547]"></span>
          </button>

          <div className="h-6 w-px bg-[#086634] mx-1"></div>

          {/* User Profile 3D Card with Hover Elevation */}
          <div
            onClick={() => setIsRoleModalOpen(true)}
            className="flex items-center gap-2.5 bg-gradient-to-b from-[#0d4f2b] to-[#07361c] pl-2 pr-3.5 py-1.5 rounded-xl border-t border-emerald-300/40 border-x border-[#094223] border-b-[3px] border-b-[#032412] shadow-[0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(0,0,0,0.45)] hover:border-t-emerald-300/70 transition-all duration-150 cursor-pointer group"
            title="Click to Switch Role"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 border-t border-emerald-200 border-b-2 border-b-emerald-900 flex items-center justify-center font-black text-xs text-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform">
              {currentUser?.avatar || 'SU'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-black text-white leading-tight group-hover:text-emerald-200 transition-colors">
                {currentUser?.name || 'Sana Ullah'}
              </div>
              <div className="text-[10px] text-emerald-200 font-bold leading-tight">
                {currentUser?.role || 'Chairman & CEO'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Under Navbar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Vibrant Green Sidebar matching image (#0c8547) */}
        <aside
          className={`${
            isSidebarOpen
              ? 'w-56 border-r-2 border-r-[#032612] shadow-[6px_0_18px_-2px_rgba(0,0,0,0.35),14px_0_32px_-4px_rgba(0,0,0,0.28),2px_0_5px_rgba(0,0,0,0.2)]'
              : 'w-0 border-r-0 shadow-none pointer-events-none'
          } overflow-hidden relative z-20 bg-gradient-to-b from-[#0c8748] via-[#0b8445] to-[#09783c] flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out`}
        >
          {/* Scrollable Navigation with Enhanced Spacing and Green 3D Shadow */}
          <div
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 flex-1 w-56 px-2.5 py-3 space-y-4"
          >
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-2">
                <div className="px-2 text-[10.5px] font-black uppercase tracking-wider text-emerald-100 drop-shadow-sm mb-1">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-black transition-all duration-200 transform cursor-pointer ${isActive
                          ? 'bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-emerald-950 border-t border-t-amber-100 border-x border-x-amber-400 border-b-[3.5px] border-b-[#78350f] shadow-[0_4px_0_0_#78350f,0_8px_18px_rgba(245,158,11,0.55),inset_0_1px_2px_rgba(255,255,255,0.7)] translate-y-[-0.5px]'
                          : 'bg-gradient-to-b from-[#0f4d2b] via-[#0a3f23] to-[#07321c] text-white border-t border-t-emerald-300/40 border-x border-[#094124] border-b-[3.5px] border-b-[#032613] shadow-[0_4px_0_0_#021d0f,0_6px_14px_rgba(4,45,23,0.55)] hover:-translate-y-1 hover:scale-[1.02] hover:from-[#135a34] hover:to-[#0a3c21] hover:text-amber-300 hover:border-t-amber-300 hover:border-x-amber-400/40 hover:shadow-[0_5px_0_0_#021d0f,0_10px_22px_rgba(245,158,11,0.35)] active:translate-y-[1px] active:border-b-[1.5px] active:shadow-none'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isActive
                              ? 'bg-[#062e16] border border-emerald-900 text-amber-300 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.6)] scale-105'
                              : 'bg-[#062413] border border-emerald-400/40 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.5)] text-emerald-200 group-hover:border-amber-400 group-hover:text-amber-300 group-hover:bg-[#09351d] group-hover:shadow-[0_0_10px_rgba(245,158,11,0.6)] group-hover:scale-105'
                            }`}
                        >
                          <Icon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-6" />
                        </div>
                        <span
                          className={`tracking-tight truncate transition-colors duration-200 ${isActive ? 'text-emerald-950 font-black drop-shadow-xs' : 'group-hover:text-amber-300'
                            }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-b from-rose-500 to-rose-700 text-white border-t border-rose-300 border-b border-b-rose-950 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Logout Link in Sidebar with Spacing, Green 3D Shadow and Yellow Hover */}
          <div className="w-56 px-2.5 py-3 border-t border-[#086634] shrink-0">
            <button
              onClick={() => { setIsAuthenticated(false); setCurrentUser(null); }}
              className="w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-black text-rose-200 bg-gradient-to-b from-[#381116] to-[#22070a] border-t border-t-rose-500/40 border-x border-[#2c090e] border-b-[3.5px] border-b-[#120305] shadow-[0_4px_0_0_#0a0103,0_6px_14px_rgba(30,5,8,0.5)] hover:-translate-y-1 hover:scale-[1.02] hover:from-[#44161c] hover:to-[#2c090e] hover:border-t-amber-400 hover:border-x-amber-400/40 hover:shadow-[0_5px_0_0_#0a0103,0_10px_22px_rgba(245,158,11,0.35)] active:translate-y-[1px] active:border-b-[1.5px] active:shadow-none transition-all duration-200 transform cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[#160406] border border-rose-800/70 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.7)] text-rose-300 group-hover:border-amber-400 group-hover:text-amber-300 group-hover:bg-[#200508] group-hover:shadow-[0_0_10px_rgba(245,158,11,0.6)] group-hover:scale-105 transition-all duration-200">
                  <LogOut className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                </div>
                <span className="group-hover:text-amber-300 transition-colors duration-200">Logout</span>
              </div>
            </button>
          </div>
        </aside>

        {/* Gray Dashboard Background with Full White Content Views */}
        <main className="flex-1 bg-gray-100 overflow-y-auto overflow-x-hidden p-8">
          <div key={activeTab} className="max-w-7xl mx-auto animate-page-slide-left">
            {activeTab === 'dashboard' && (
              <ChairmanDashboard
                data={chairmanData}
                currentUser={currentUser}
                onNavigate={(t) => setActiveTab(t)}
                onApproveTask={handleApproveTask}
              />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsInbox
                tasks={tasks}
                onApproveTask={handleApproveTask}
              />
            )}

            {activeTab === 'live-operations' && (
              <LiveOperations />
            )}

            {activeTab === 'procurement' && (
              <ProcurementView
                purchaseOrders={purchaseOrders}
                onAddPo={handleAddPo}
              />
            )}

            {activeTab === 'gate' && (
              <GateSecurity
                gatePasses={gatePasses}
                onAddGatePass={handleAddGatePass}
              />
            )}

            {activeTab === 'qc' && (
              <QcGoodsReceipt
                onReceiveStore={() => showNotification('GRN recorded in Store Inventory')}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                inventoryItems={inventoryItems}
                onAdjustStock={() => showNotification('Stock adjusted')}
              />
            )}

            {activeTab === 'production' && (
              <ProductionBoard
                productionOrders={productionOrders}
                onMoveOrder={handleMoveOrder}
              />
            )}

            {activeTab === 'sales' && (
              <SalesCreditView
                salesOrder={salesOrder}
                onApproveOrder={handleApproveSales}
              />
            )}

            {activeTab === 'marketing' && (
              <MarketingView
                campaigns={campaigns}
              />
            )}

            {activeTab === 'hr' && (
              <HrAdminView
                users={users}
                onAddUser={handleAddUser}
              />
            )}

            {activeTab === 'payroll' && (
              <PayrollView
                payrollRuns={payrollRuns}
                onGeneratePayroll={handleGeneratePayroll}
              />
            )}

            {activeTab === 'finance' && (
              <FinanceView
                financeData={financeData}
                onNavigate={(t) => setActiveTab(t)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'settings' && (
              <SettingsMatrix />
            )}

            {activeTab === 'process-map' && (
              <ProcessMap onNavigate={(t) => setActiveTab(t)} />
            )}
          </div>
        </main>
      </div>

      {/* 19 Roles Switcher Modal (PDF Page 4) */}
      <RoleSwitcherModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={(u) => {
          setCurrentUser(u);
          showNotification(`Switched role to: ${u.name} (${u.role})`);
        }}
      />
    </div>
  );
}
