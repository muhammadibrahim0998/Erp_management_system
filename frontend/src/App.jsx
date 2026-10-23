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
  Menu,
  Shield,
  History,
  Store,
  ShieldAlert
} from 'lucide-react';

import ChairmanDashboard from './components/views/ChairmanDashboard';
import ApprovalsInbox from './components/views/ApprovalsInbox';
import { authService, operationsService, userService } from './services';
import LiveOperations from './components/views/LiveOperations';
import GateSecurity from './components/views/GateSecurity';
import QcGoodsReceipt from './components/views/QcGoodsReceipt';
import ProcurementView from './components/views/ProcurementView';
import ProductionBoard from './components/views/ProductionBoard';
import InventoryView from './components/views/InventoryView';
import PosView from './components/views/PosView';
import SalesCreditView from './components/views/SalesCreditView';
import MarketingView from './components/views/MarketingView';
import HrAdminView from './components/views/HrAdminView';
import PayrollView from './components/views/PayrollView';
import FinanceView from './components/views/FinanceView';
import ReportsView from './components/views/ReportsView';
import SettingsMatrix from './components/views/SettingsMatrix';
import UserManagement from './components/views/UserManagement';
import AuditLogsView from './components/views/AuditLogsView';
import RoleSwitcherModal from './components/RoleSwitcherModal';
import ProcessMap from './components/views/ProcessMap';
import Auth from './components/Auth';

/**
 * Returns the primary operational workspace tab matching the user's role and department
 */
export function getDefaultTabForUser(user) {
  if (!user) return 'dashboard';
  const role = (user.role || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();

  if (role.includes('gate') || dept.includes('security')) return 'gate';
  if (role.includes('qc') || dept.includes('quality')) return 'qc';
  if (role.includes('store') || role.includes('delivery') || dept.includes('inventory') || dept.includes('logistics')) return 'inventory';
  if (role.includes('production') || role.includes('breaking') || dept.includes('plant') || dept.includes('production')) return 'production';
  if (role.includes('procurement') || dept.includes('purchasing')) return 'procurement';
  if (role === 'sales officer' || role.includes('pos')) return 'pos';
  if (role.includes('sales')) return 'sales';
  if (role.includes('marketing') || role.includes('social media') || dept.includes('marketing')) return 'marketing';
  if (role.includes('hr') || dept.includes('hr')) return 'hr';
  if (role.includes('accounts') || dept.includes('finance')) return 'finance';
  if (role.includes('admin') || dept.includes('it')) return 'users';
  if (dept.includes('farm')) return 'live-operations';
  return 'dashboard';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [activeTab, setActiveTab] = useState(() => getDefaultTabForUser(authService.getCurrentUser()));
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [users, setUsers] = useState([]);

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
      const data = await operationsService.getBootstrapData();
      if (data.users) setUsers(data.users);
      if (data.chairman) setChairmanData(data.chairman);
      if (data.approvals) setTasks(data.approvals);
      if (data.gate) setGatePasses(data.gate);
      if (data.procurement) setPurchaseOrders(data.procurement);
      if (data.production) setProductionOrders(data.production);
      if (data.inventory) setInventoryItems(data.inventory);
      if (data.sales) setSalesOrder(data.sales);
      if (data.marketing) setCampaigns(data.marketing);
      if (data.payroll) setPayrollRuns(data.payroll);
      if (data.finance) setFinanceData(data.finance);
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify session token on initial mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      authService.getMe()
        .then(user => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        })
        .catch(() => {
          authService.logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 20000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Action Handlers
  const handleApproveTask = async (taskId, actionType = 'approved') => {
    try {
      await operationsService.actionApproval(taskId, actionType);
      showNotification(`Task marked as ${actionType} in MySQL database`);
      fetchAllData();
    } catch (e) {
      showNotification('Error processing task');
    }
  };

  const handleAddGatePass = async (data) => {
    try {
      await operationsService.createGatePass(data);
      showNotification('Inward Gate Pass issued successfully in MySQL');
      fetchAllData();
    } catch (e) {
      showNotification('Error issuing gate pass');
    }
  };

  const handleAddPo = async (data) => {
    try {
      await operationsService.createProcurementPO(data);
      showNotification('Purchase Order created in MySQL');
      fetchAllData();
    } catch (e) {
      showNotification('Error creating PO');
    }
  };

  const handleMoveOrder = async (id, stage) => {
    try {
      await operationsService.moveProduction(id, stage);
      showNotification(`Order moved to ${stage}`);
      fetchAllData();
    } catch (e) { }
  };

  const handleApproveSales = async (soNumber) => {
    try {
      await operationsService.approveSalesOrder(soNumber);
      showNotification('Sales order approved by CEO exception');
      fetchAllData();
    } catch (e) { }
  };

  const handleGeneratePayroll = async (month) => {
    try {
      await operationsService.generatePayroll(month);
      showNotification(`Payroll generated for ${month} in MySQL`);
      fetchAllData();
    } catch (e) { }
  };

  const handleAddUser = async (userData) => {
    try {
      await userService.createUser(userData);
      showNotification('New staff member added successfully in MySQL');
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Failed to add user');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Dynamic Role & Department permission matrix
  const userRole = currentUser?.role || '';
  const userDept = currentUser?.department || '';

  const isSuperAdmin = userRole === 'ERP Admin' || userRole === 'Chairman & CEO';
  const isExecutive = userRole === 'Chairman & CEO' || userRole === 'General Manager' || userDept === 'Executive';
  const isITAdmin = userRole === 'ERP Admin' || userDept === 'IT';
  const isGM = isExecutive || isSuperAdmin;
  
  const isFinance = userDept === 'Finance' || userRole.includes('Finance') || userRole.includes('Accounts') || isGM;
  const isOperations = ['Operations', 'Plant', 'Production'].includes(userDept) || userRole.includes('Operations') || userRole.includes('Plant') || userRole.includes('Production') || isGM;
  const isSecurity = userDept === 'Security' || userDept === 'Logistics' || userRole.includes('Gate') || userRole.includes('Security') || isGM;
  const isQC = userDept === 'Quality' || userRole.includes('QC') || isGM;
  const isInventory = userDept === 'Inventory' || userDept === 'Logistics' || userRole.includes('Store') || userRole.includes('Delivery') || isOperations || isGM;
  const isPurchasing = userDept === 'Purchasing' || userRole.includes('Procurement') || isFinance || isGM;
  const isSales = ['Sales', 'Marketing'].includes(userDept) || userRole.includes('Sales') || isGM;
  const isMarketing = userDept === 'Marketing' || userRole.includes('Marketing') || userRole.includes('Social Media') || isSales || isGM;
  const isHR = userDept === 'HR' || userRole.includes('HR') || isGM;
  const isFarm = userDept === 'Farms' || userRole.includes('Poultry') || isOperations || isGM;

  // Nav Groups with Dynamic Role-Based Access Control
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, visible: isGM || isFinance || isOperations },
        { id: 'approvals', label: 'Approvals Inbox', icon: CheckSquare, badge: tasks.filter(t => t.status === 'pending').length, visible: isGM || isFinance || isOperations || isHR || isPurchasing || userRole === 'Sales Manager' || userRole === 'Head of Marketing' },
        { id: 'live-operations', label: 'Live Operations', icon: Activity, visible: isOperations || isSecurity || isQC || isFarm || isGM },
        { id: 'process-map', label: 'Process Map', icon: GitBranch, visible: true }
      ].filter(item => item.visible)
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'procurement', label: 'Procurement (POs)', icon: ShoppingBag, visible: isPurchasing || isFinance || isGM },
        { id: 'gate', label: 'Gate & Security', icon: Truck, visible: isSecurity || isOperations || isGM },
        { id: 'qc', label: 'QC Goods Receipt', icon: CheckCircle2, visible: isQC || isOperations || isGM },
        { id: 'inventory', label: 'Inventory & Stock', icon: Package, visible: isInventory || isPurchasing || isSales || isGM },
        { id: 'production', label: 'Production Board', icon: Layers, visible: isOperations || isFarm || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'SALES & MARKETING',
      items: [
        { id: 'pos', label: 'Point of Sale (POS)', icon: Store, visible: isSales || isFinance || isGM },
        { id: 'sales', label: 'Sales Orders', icon: ShoppingCart, visible: isSales || isFinance || isGM },
        { id: 'marketing', label: 'Marketing Campaigns', icon: Share2, visible: isMarketing || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'PEOPLE',
      items: [
        { id: 'hr', label: 'HR & Staff Directory', icon: Users, visible: isHR || isGM },
        { id: 'payroll', label: 'Payroll Management', icon: DollarSign, visible: isHR || isFinance || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'MONEY',
      items: [
        { id: 'finance', label: 'Accounts & Finance', icon: Building2, visible: isFinance || isGM },
        { id: 'reports', label: 'Financial Reports', icon: FileText, visible: isFinance || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'ADMIN & SETTINGS',
      items: [
        { id: 'users', label: 'User Management', icon: Shield, visible: isSuperAdmin },
        { id: 'audit-logs', label: 'System Audit Logs', icon: History, visible: isSuperAdmin || isGM },
        { id: 'settings', label: 'Approval Matrix', icon: Sliders, visible: isSuperAdmin || isGM }
      ].filter(item => item.visible)
    }
  ].filter(section => section.items.length > 0);

  const allowedTabIds = navSections.flatMap(section => section.items.map(item => item.id));

  // Automatically ensure active tab is strictly allowed for current user role
  useEffect(() => {
    if (allowedTabIds.length > 0 && !allowedTabIds.includes(activeTab)) {
      const defaultRoleTab = getDefaultTabForUser(currentUser);
      if (allowedTabIds.includes(defaultRoleTab)) {
        setActiveTab(defaultRoleTab);
      } else {
        setActiveTab(allowedTabIds[0]);
      }
    }
  }, [currentUser, allowedTabIds, activeTab]);

  if (!isAuthenticated) {
    return (
      <Auth
        onLogin={(user, token) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          const landingTab = getDefaultTabForUser(user);
          setActiveTab(landingTab);
          fetchAllData();
          showNotification(`Welcome, ${user.name} (${user.role})`);
        }}
      />
    );
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

        {/* Center: Modern Compact 3D Search Bar with Stable Position & Yellow Hover */}
        <div className="relative mx-4 sm:mx-6 w-60 sm:w-68 md:w-76 group">
          <div className="relative flex items-center bg-white rounded-xl border-t border-t-white border-x border-gray-200 border-b-[3px] border-b-gray-300 shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:border-amber-400 hover:border-b-[3px] hover:border-b-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.5),0_3px_8px_rgba(0,0,0,0.2)] focus-within:ring-2 focus-within:ring-amber-400/40 focus-within:border-amber-400 focus-within:border-b-[3px] focus-within:border-b-amber-500 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-200 pl-3.5 pr-1 py-1">
            <input
              type="text"
              placeholder="Search ERP..."
              className="w-full bg-transparent pr-2 py-1 text-xs text-gray-800 font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
            />
            
            {/* Circular 3D Search Button Inside Right of Search Bar */}
            <button
              onClick={() => showNotification('Searching system records...')}
              className="w-7 h-7 rounded-full bg-gradient-to-b from-[#0d4f2b] to-[#07361c] border-t border-emerald-300/60 border-x border-[#094223] border-b-2 border-b-[#032412] text-emerald-100 flex items-center justify-center shadow-[0_2px_0_0_#02180c,0_3px_6px_rgba(0,0,0,0.25)] hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:text-amber-950 hover:border-t-amber-200 hover:border-x-amber-400 hover:border-b-[#78350f] hover:shadow-[0_2px_0_0_#78350f,0_5px_12px_rgba(245,158,11,0.6)] active:translate-y-[1px] active:border-b active:shadow-none transition-all duration-150 cursor-pointer shrink-0 group/btn"
              title="Search ERP System"
            >
              <Search className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:rotate-6" />
            </button>
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
          className={`${isSidebarOpen
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
              onClick={handleLogout}
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
        <main className="flex-1 bg-gray-100 overflow-y-auto overflow-x-hidden p-8 relative [perspective:1400px]">
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
                onAdjustStock={() => {
                  fetchAllData();
                  showNotification('Inventory & warehouse levels refreshed');
                }}
              />
            )}

            {activeTab === 'production' && (
              <ProductionBoard
                productionOrders={productionOrders}
                onMoveOrder={handleMoveOrder}
              />
            )}

            {activeTab === 'pos' && (
              <PosView
                currentUser={currentUser}
                onSaleCompleted={() => {
                  fetchAllData();
                  showNotification('POS Sale recorded and inventory deducted atomically');
                }}
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

            {activeTab === 'users' && (
              <UserManagement
                currentUser={currentUser}
                onUserUpdated={fetchAllData}
              />
            )}

            {activeTab === 'audit-logs' && (
              <AuditLogsView
                currentUser={currentUser}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsMatrix />
            )}

            {activeTab === 'process-map' && (
              <ProcessMap onNavigate={(t) => setActiveTab(t)} />
            )}

            {!allowedTabIds.includes(activeTab) && (
              <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center max-w-md mx-auto my-12 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-gray-900">Access Restricted</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Your role <strong>{currentUser?.role || 'Staff'}</strong> ({currentUser?.department || 'General'}) does not have permission to view this section.
                </p>
                <button
                  onClick={() => setActiveTab(getDefaultTabForUser(currentUser))}
                  className="mt-4 px-4 py-2 bg-[#0c8547] hover:bg-[#0a733d] text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Open My Role Module
                </button>
              </div>
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
          localStorage.setItem('yaf_user', JSON.stringify(u));
          const landingTab = getDefaultTabForUser(u);
          setActiveTab(landingTab);
          showNotification(`Switched role to: ${u.name} (${u.role})`);
        }}
      />
    </div>
  );
}
