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
  Shield,
  History,
  Store
} from 'lucide-react';

import ChairmanDashboard from './components/views/ChairmanDashboard';
import ApprovalsInbox from './components/views/ApprovalsInbox';
import { authService, operationsService } from './services';
import LiveOperations from './components/views/LiveOperations';
import GateSecurity from './components/views/GateSecurity';
import QcGoodsReceipt from './components/views/QcGoodsReceipt';
import ProcurementView from './components/views/ProcurementView';
import ProductionBoard from './components/views/ProductionBoard';
import InventoryView from './components/views/InventoryView';
import PosView from './components/views/PosView';
import SalesCreditView from './components/views/SalesCreditView';
import MarketingView from './components/views/MarketingView';
import PayrollView from './components/views/PayrollView';
import FinanceView from './components/views/FinanceView';
import ReportsView from './components/views/ReportsView';
import SettingsMatrix from './components/views/SettingsMatrix';
import UserManagement from './components/views/UserManagement';
import AuditLogsView from './components/views/AuditLogsView';
import RoleSwitcherModal from './components/RoleSwitcherModal';
import ProcessMap from './components/views/ProcessMap';
import Auth from './components/Auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());

  // Live Server Data
  const [chairmanData, setChairmanData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [gatePasses, setGatePasses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [financeData, setFinanceData] = useState(null);
  const [failedDatasets, setFailedDatasets] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedToday = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  const currentYear = today.getFullYear();
  const startFiscalYear = today.getMonth() >= 6 ? currentYear : currentYear - 1;
  const endFiscalYear = startFiscalYear + 1;
  const fiscalYearText = `FY ${startFiscalYear}-${String(endFiscalYear).slice(-2)}`;

  const showNotification = (msg, type = 'success') => {
    const text = typeof msg === 'string' ? msg : msg?.message || 'Notification';
    setNotification({ text, type });
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
      if (data.sales) {
        setSalesOrders(Array.isArray(data.sales) ? data.sales : [data.sales]);
      }
      if (data.marketing) setCampaigns(data.marketing);
      if (data.payroll) setPayrollRuns(data.payroll);
      if (data.finance) setFinanceData(data.finance);

      if (data.failed) {
        setFailedDatasets(data.failed);
        if (data.failed.length > 0) {
          showNotification(`Could not load: ${data.failed.join(', ')}`, 'error');
        }
      } else {
        setFailedDatasets([]);
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify session token on initial mount & listen for unauthorized events
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

    const handleUnauthorized = () => {
      authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
    };
    window.addEventListener('yaf_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('yaf_unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 20000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Action Handlers
  const handleApproveTask = async (taskId, actionType = 'approved', reason = null) => {
    try {
      await operationsService.actionApproval(taskId, actionType, reason);
      showNotification(`Task marked as ${actionType} in MySQL database`);
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Error processing task', 'error');
      throw e;
    }
  };

  const handleAddGatePass = async (data) => {
    try {
      await operationsService.createGatePass(data);
      showNotification('Inward Gate Pass issued successfully in MySQL');
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Error issuing gate pass', 'error');
      throw e;
    }
  };

  const handleAddPo = async (data) => {
    try {
      await operationsService.createProcurementPO(data);
      showNotification('Purchase Order created in MySQL');
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Error creating PO', 'error');
      throw e;
    }
  };

  const handleMoveOrder = async (id, stage) => {
    try {
      await operationsService.moveProduction(id, stage);
      showNotification(`Order moved to ${stage}`);
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Error moving order', 'error');
      throw e;
    }
  };

  const handleApproveSales = async (soNumber) => {
    try {
      await operationsService.approveSalesOrder(soNumber);
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Error approving sales order', 'error');
      throw e;
    }
  };

  const handleGeneratePayroll = async (month) => {
    try {
      await operationsService.generatePayroll(month);
      showNotification(`Payroll generated for ${month} in MySQL`);
      fetchAllData();
    } catch (e) {
      showNotification(e.message || 'Error generating payroll', 'error');
      throw e;
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <Auth
        onLogin={(user, _token) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          fetchAllData();
        }}
      />
    );
  }

  // Role & Department permission checking
  const userRole = currentUser.role || '';
  const userDept = currentUser.department || '';
  const isSuperAdmin = userRole === 'ERP Admin' || userRole === 'Chairman & CEO';
  const isGM = userRole === 'General Manager' || isSuperAdmin;
  const isFinance = userDept === 'Finance' || isGM;
  const isOperations = ['Operations', 'Plant', 'Production'].includes(userDept) || isGM;
  const isSecurity = userDept === 'Security' || userDept === 'Logistics' || isGM;
  const isQC = userDept === 'Quality' || isGM;
  const isInventory = userDept === 'Inventory' || isOperations || isGM;
  const isSales = ['Sales', 'Marketing'].includes(userDept) || isGM;
  const isHR = userDept === 'HR' || isGM;

  // Nav Groups with Role-Based Access Control
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
        { id: 'approvals', label: 'Approvals', icon: CheckSquare, badge: tasks.filter(t => t.status === 'pending').length, visible: true },
        { id: 'live-operations', label: 'Live operations', icon: Activity, visible: isOperations || isSecurity || isQC || isGM },
        { id: 'process-map', label: 'Process map', icon: GitBranch, visible: true }
      ].filter(item => item.visible)
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'procurement', label: 'Procurement', icon: ShoppingBag, visible: userDept === 'Purchasing' || isFinance || isOperations || isGM },
        { id: 'gate', label: 'Gate & security', icon: Truck, visible: isSecurity || isOperations || isGM },
        { id: 'qc', label: 'QC cell', icon: CheckCircle2, visible: isQC || isOperations || isGM },
        { id: 'inventory', label: 'Inventory', icon: Package, visible: isInventory || isGM },
        { id: 'production', label: 'Production', icon: Layers, visible: isOperations || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'SALES & MARKETING',
      items: [
        { id: 'pos', label: 'Point of Sale (POS)', icon: Store, visible: isSales || isFinance || isGM },
        { id: 'sales', label: 'Sales orders', icon: ShoppingCart, visible: isSales || isFinance || isGM },
        { id: 'marketing', label: 'Marketing', icon: Share2, visible: isSales || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'PEOPLE',
      items: [
        { id: 'hr', label: 'HR & Admin', icon: Users, visible: isHR || isGM },
        { id: 'payroll', label: 'Payroll', icon: DollarSign, visible: isHR || isFinance || isGM }
      ].filter(item => item.visible)
    },
    {
      title: 'MONEY',
      items: [
        { id: 'finance', label: 'Accounts & Finance', icon: Building2, visible: isFinance || isGM },
        { id: 'reports', label: 'Reports', icon: FileText, visible: isGM || isFinance }
      ].filter(item => item.visible)
    },
    {
      title: 'ADMIN & SETTINGS',
      items: [
        { id: 'users', label: 'User Management', icon: Shield, visible: isSuperAdmin || isGM },
        { id: 'audit-logs', label: 'Audit Trail & Logs', icon: History, visible: isSuperAdmin || isGM },
        { id: 'settings', label: 'Approval matrix', icon: Sliders, visible: isSuperAdmin || isGM }
      ].filter(item => item.visible)
    }
  ].filter(section => section.items.length > 0);

  return (
    <div className="flex h-screen bg-[#0E2118] text-gray-900 overflow-hidden font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-bounce ${
          notification.type === 'error'
            ? 'bg-rose-950 text-white border border-rose-700'
            : 'bg-[#0E2118] text-white border border-[#27533E]'
        }`}>
          {notification.type === 'error' ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{notification.text}</span>
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
              <p className="text-xs text-white font-bold truncate">Head office - Mardan · {fiscalYearText}</p>
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

        {/* Logout Link in Sidebar */}
        <div className="p-3 border-t border-[#1B3A2C]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </div>
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
              {formattedToday}
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

            <div className="flex items-center gap-2.5 transition">
              <div className="w-8 h-8 rounded-lg bg-[#132C20] border border-[#1D4433] flex items-center justify-center font-bold text-sm text-white">
                {currentUser?.avatar || currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{currentUser?.name || ''}</div>
                <div className="text-xs text-white font-bold">{currentUser?.role || ''}</div>
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
                currentUser={currentUser}
                onNavigate={(t) => setActiveTab(t)}
                onApproveTask={handleApproveTask}
              />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsInbox
                tasks={tasks}
                onApproveTask={handleApproveTask}
                isLoading={isLoading}
                onRefetch={fetchAllData}
              />
            )}

            {activeTab === 'live-operations' && (
              <LiveOperations />
            )}

            {activeTab === 'procurement' && (
              <ProcurementView
                purchaseOrders={purchaseOrders}
                onAddPo={handleAddPo}
                isLoading={isLoading}
                onRefetch={fetchAllData}
              />
            )}

            {activeTab === 'gate' && (
              <GateSecurity
                gatePasses={gatePasses}
                onAddGatePass={handleAddGatePass}
                isLoading={isLoading}
                onRefetch={fetchAllData}
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
                isLoading={isLoading}
                error={failedDatasets.includes('inventory') ? 'Could not load inventory items from server' : null}
                onRefetch={fetchAllData}
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
                isLoading={isLoading}
                error={failedDatasets.includes('production') ? 'Could not load production orders from server' : null}
                onRefetch={fetchAllData}
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
                salesOrders={salesOrders}
                salesOrder={salesOrders[0]}
                currentUser={currentUser}
                onApproveOrder={handleApproveSales}
                onRefresh={fetchAllData}
                showNotification={showNotification}
              />
            )}

            {activeTab === 'marketing' && (
              <MarketingView
                campaigns={campaigns}
              />
            )}

            {activeTab === 'hr' && (
              <ApprovalsInbox
                tasks={tasks.filter(t => t.assigned_role === currentUser?.name)}
                onApproveTask={handleApproveTask}
                isLoading={isLoading}
                onRefetch={fetchAllData}
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
          showNotification(`Switched role to: ${u.name} (${u.role})`);
        }}
      />
    </div>
  );
}
