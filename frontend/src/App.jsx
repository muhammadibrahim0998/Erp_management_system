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
  GitBranch
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
import PayrollView from './components/views/PayrollView';
import FinanceView from './components/views/FinanceView';
import ReportsView from './components/views/ReportsView';
import SettingsMatrix from './components/views/SettingsMatrix';
import RoleSwitcherModal from './components/RoleSwitcherModal';
import ProcessMap from './components/views/ProcessMap';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
    } catch (e) {}
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
    } catch (e) {}
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
    } catch (e) {}
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

  return (
    <div className="flex h-screen bg-[#0E2118] text-gray-900 overflow-hidden font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#0E2118] text-white px-4 py-2.5 rounded-xl border border-[#27533E] shadow-2xl flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Dark Green Sidebar (#0E2118) */}
      <aside className="w-64 border-r border-[#1B3A2C] bg-[#0E2118] flex flex-col justify-between shrink-0">
        <div className="overflow-y-auto">
          {/* Brand Header */}
          <div className="h-20 flex items-center px-6 gap-3 border-b border-[#1B3A2C]">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="font-black text-amber-400 text-sm tracking-tighter">YAF</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-tight text-white uppercase truncate">
                Yousafzai Agri Foods
              </h1>
              <p className="text-xs text-white font-bold truncate">Head office - Mardan · FY 2026-27</p>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className="p-3 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 text-xs font-bold text-white tracking-wider">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-white transition ${
                        isActive
                          ? 'bg-[#18392A] border border-[#27533E] shadow-sm'
                          : 'hover:bg-[#142F23]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-white" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-rose-600 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Server & DB Status Badges in Sidebar */}
        <div className="p-3 border-t border-[#1B3A2C] space-y-2">
          {/* Active User Switcher Pill */}
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className="w-full p-2.5 rounded-xl bg-[#132C20] hover:bg-[#193B2B] border border-[#1D4433] flex items-center justify-between text-left transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#0E2118] border border-[#1D4433] flex items-center justify-center font-bold text-xs text-white shrink-0">
                {currentUser?.avatar || 'SU'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{currentUser?.name || 'Sana Ullah'}</div>
                <div className="text-xs text-white font-bold truncate">{currentUser?.role || 'Chairman & CEO'}</div>
              </div>
            </div>
            <span className="text-xs text-amber-400 font-semibold shrink-0">Switch</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dark Green Top Navbar (#0E2118) */}
        <header className="h-16 border-b border-[#1B3A2C] px-8 flex items-center justify-between bg-[#0E2118] sticky top-0 z-10 shrink-0">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold" />
            <input
              type="text"
              placeholder="Search documents, items, customers, suppliers..."
              className="w-full bg-[#132C20] border border-[#1D4433] rounded-lg pl-9 pr-4 py-1.5 text-sm text-white font-bold placeholder:text-white placeholder:font-bold focus:outline-none focus:border-[#2E684E] focus:ring-1 focus:ring-[#2E684E] transition"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-bold text-white bg-[#132C20] px-2.5 py-1 rounded-md border border-[#1D4433]">
              29 Sep 2026
            </span>

            <button
              onClick={fetchAllData}
              className="p-2 rounded-lg bg-[#132C20] hover:bg-[#193B2B] text-white font-bold border border-[#1D4433] transition"
              title="Refresh All Real-time ERP Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button className="relative p-2 rounded-lg bg-[#132C20] hover:bg-[#193B2B] border border-[#1D4433] text-white font-bold transition">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            </button>

            <div className="h-5 w-px bg-[#1B3A2C] mx-1"></div>

            <div
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-[#132C20] border border-[#1D4433] flex items-center justify-center font-bold text-sm text-white">
                {currentUser?.avatar || 'SU'}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{currentUser?.name || 'Sana Ullah'}</div>
                <div className="text-xs text-white font-bold">{currentUser?.role || 'Chairman & CEO'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Gray Dashboard Background with Full White Content Views */}
        <main className="flex-1 bg-gray-100 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <ChairmanDashboard
                data={chairmanData}
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
              <ApprovalsInbox
                tasks={tasks.filter(t => t.doc_type.includes('Production') || t.assigned_role?.includes('HR'))}
                onApproveTask={handleApproveTask}
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
