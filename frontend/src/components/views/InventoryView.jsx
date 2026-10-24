import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  ArrowRightLeft,
  Download,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Truck,
  CheckCircle2,
  X,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Building
} from 'lucide-react';
import { inventoryService } from '../../services';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

export default function InventoryView({
  inventoryItems = [],
  onAdjustStock,
  isLoading,
  error,
  onRefetch
}) {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'ledger'
  const [search, setSearch] = useState('');
  const [onlyBelowReorder, setOnlyBelowReorder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState(null);

  // Form states - Adjustment
  const [adjItemId, setAdjItemId] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('MRD');
  const [adjType, setAdjType] = useState('add');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('Physical Stock Count Audit');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjError, setAdjError] = useState(null);
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Form states - Transfer
  const [trfItemId, setTrfItemId] = useState('');
  const [trfFromWh, setTrfFromWh] = useState('CCF');
  const [trfToWh, setTrfToWh] = useState('MRD');
  const [trfQty, setTrfQty] = useState('');
  const [trfVehicle, setTrfVehicle] = useState('');
  const [trfDriver, setTrfDriver] = useState('');
  const [trfAutoGatePass, setTrfAutoGatePass] = useState(true);
  const [trfError, setTrfError] = useState(null);
  const [isSubmittingTrf, setIsSubmittingTrf] = useState(false);

  // Ledger state
  const [ledgerTxs, setLedgerTxs] = useState([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const WAREHOUSES = [
    { code: 'MRD', name: 'Mardan Central Store & Sales Point', col: 'mrd_qty' },
    { code: 'ATK', name: 'Attock Cold Store', col: 'atk_qty' },
    { code: 'CCF', name: 'Charsadda Layer Farm', col: 'ccf_qty' },
    { code: 'PHF', name: 'Peshawar Holding Facility', col: 'phf_qty' },
    { code: 'RSK_RM', name: 'Rashakai Plant — Raw Material', col: 'rsk_rm_qty' },
    { code: 'RSK_FG', name: 'Rashakai Plant — Finished Store', col: 'rsk_fg_qty' }
  ];

  // Fetch Ledger
  const fetchLedger = async () => {
    setIsLoadingLedger(true);
    setLedgerError(null);
    try {
      const data = await inventoryService.getLedger();
      setLedgerTxs(data || []);
    } catch (err) {
      console.error('Failed to load inventory ledger:', err);
      setLedgerError(err.message || 'Failed to load stock movement ledger');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedger();
    }
  }, [activeTab]);

  // Open Adjustment Modal with Optional Pre-selected Item
  const handleOpenAdjust = (item = null) => {
    const targetItem = item || (inventoryItems && inventoryItems[0]);
    if (targetItem) {
      setAdjItemId(String(targetItem.id));
      setSelectedItemForAction(targetItem);
    } else {
      setAdjItemId('');
      setSelectedItemForAction(null);
    }
    setAdjWarehouse('MRD');
    setAdjType('add');
    setAdjQty('');
    setAdjReason('Physical Stock Count Audit');
    setAdjNotes('');
    setAdjError(null);
    setIsAdjustModalOpen(true);
  };

  // Open Transfer Modal with Optional Pre-selected Item
  const handleOpenTransfer = (item = null) => {
    const targetItem = item || (inventoryItems && inventoryItems[0]);
    if (targetItem) {
      setTrfItemId(String(targetItem.id));
      setSelectedItemForAction(targetItem);
    } else {
      setTrfItemId('');
      setSelectedItemForAction(null);
    }
    setTrfFromWh('CCF');
    setTrfToWh('MRD');
    setTrfQty('');
    setTrfVehicle('');
    setTrfDriver('');
    setTrfError(null);
    setIsTransferModalOpen(true);
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    setAdjError(null);

    if (!adjItemId) {
      setAdjError('Please select an item');
      return;
    }
    if (!adjWarehouse) {
      setAdjError('Please select a warehouse');
      return;
    }
    if (!adjQty || isNaN(Number(adjQty)) || Number(adjQty) <= 0) {
      setAdjError('Quantity must be a valid number greater than zero');
      return;
    }
    if (!adjReason || adjReason.trim().length === 0) {
      setAdjError('Please select or specify an adjustment reason');
      return;
    }

    setIsSubmittingAdj(true);
    try {
      const data = await inventoryService.adjustStock({
        id: parseInt(adjItemId, 10),
        warehouse: adjWarehouse,
        adjust_qty: Number(adjQty),
        adjustType: adjType,
        reason: adjReason.trim(),
        notes: adjNotes
      });

      showNotification(`Stock adjusted successfully: ${data?.refNo || 'ADJ'}`);
      setAdjError(null);
      setAdjQty('');
      setAdjNotes('');
      setIsAdjustModalOpen(false);
      if (onAdjustStock) onAdjustStock();
      if (onRefetch) onRefetch();
      if (activeTab === 'ledger') fetchLedger();
    } catch (err) {
      setAdjError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // Submit Transfer
  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    setTrfError(null);

    if (!trfItemId) {
      setTrfError('Please select an item to transfer');
      return;
    }
    if (!trfFromWh || !trfToWh) {
      setTrfError('Please select both source and destination facilities');
      return;
    }
    if (trfFromWh === trfToWh) {
      setTrfError('Source and destination warehouses cannot be the same');
      return;
    }
    if (!trfQty || isNaN(Number(trfQty)) || Number(trfQty) <= 0) {
      setTrfError('Quantity must be a valid number greater than zero');
      return;
    }

    setIsSubmittingTrf(true);
    try {
      const data = await inventoryService.transferStock({
        id: parseInt(trfItemId, 10),
        fromWarehouse: trfFromWh,
        toWarehouse: trfToWh,
        quantity: Number(trfQty),
        vehicleNumber: trfVehicle,
        driverName: trfDriver,
        autoGatePass: trfAutoGatePass
      });

      showNotification(`Transfer completed: ${data?.transferRef || 'TRF'} ${data?.gatePassNumber ? `(Gate Pass: ${data.gatePassNumber})` : ''}`);
      setTrfError(null);
      setTrfQty('');
      setTrfVehicle('');
      setTrfDriver('');
      setIsTransferModalOpen(false);
      if (onAdjustStock) onAdjustStock();
      if (onRefetch) onRefetch();
      if (activeTab === 'ledger') fetchLedger();
    } catch (err) {
      setTrfError(err.message || 'Failed to transfer stock');
    } finally {
      setIsSubmittingTrf(false);
    }
  };

  // Export Inventory Valuation to Excel
  const handleExportExcel = () => {
    const headers = [
      'Item Code', 'Item Name', 'Category', 
      'Mardan (MRD)', 'Attock (ATK)', 'Charsadda (CCF)', 'Peshawar (PHF)', 
      'Total Trays', 'Reorder Level', 'Avg Cost (PKR)', 'Total Value (PKR)', 'Status'
    ];

    const rows = (inventoryItems || []).map(i => [
      i.code,
      i.name,
      i.category,
      i.mrd_qty || 0,
      i.atk_qty || 0,
      i.ccf_qty || 0,
      i.phf_qty || 0,
      i.total_qty || 0,
      i.reorder_at || 0,
      Number(i.avg_cost).toFixed(2),
      Number(i.total_value).toLocaleString(),
      i.status
    ]);

    exportToExcel({
      filename: `YAF_Stock_Valuation_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'StockValuation',
      data: rows,
      headers
    });
    showNotification('Inventory report exported to Excel successfully');
  };

  // Export Inventory Valuation to PDF
  const handleExportPDF = () => {
    const headers = ['Code', 'Item Description', 'MRD', 'ATK', 'CCF', 'Total Qty', 'Rate', 'Value (PKR)', 'Status'];
    const rows = (inventoryItems || []).map(i => [
      i.code,
      i.name,
      String(i.mrd_qty || 0),
      String(i.atk_qty || 0),
      String(i.ccf_qty || 0),
      `${i.total_qty} trays`,
      `PKR ${Number(i.avg_cost).toLocaleString()}`,
      `PKR ${Number(i.total_value).toLocaleString()}`,
      i.status
    ]);

    const totalVal = (inventoryItems || []).reduce((acc, i) => acc + (parseFloat(i.total_value) || 0), 0);
    const belowReorderCount = (inventoryItems || []).filter(i => i.status === 'Reorder').length;

    exportToPDF({
      filename: `YAF_Inventory_Valuation_${new Date().toISOString().slice(0, 10)}`,
      title: 'Warehouse Stock Valuation & Multi-Facility Inventory',
      subtitle: 'Head Office Mardan, Attock Cold Store, Charsadda & Peshawar Facilities',
      period: `Position as of: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      kpis: [
        { label: 'Total Valuation', value: `PKR ${(totalVal / 1000000).toFixed(2)}M` },
        { label: 'Stocked SKUs', value: `${inventoryItems?.length || 0} items` },
        { label: 'Below Reorder', value: `${belowReorderCount} items` },
        { label: 'Central Facility', value: 'Mardan Store' }
      ],
      headers,
      rows,
      summaryNotes: [
        'All quantities are expressed in standard industry trays (30 eggs per tray).',
        'Valuation calculated using weighted average landed cost method.',
        'Authorised by: Usman Ali (Store Manager) and Director Operations.'
      ]
    });
    showNotification('Inventory report exported to Corporate PDF');
  };

  // Filtered Items
  const filteredItems = (inventoryItems || []).filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.code.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (onlyBelowReorder && item.status !== 'Reorder') {
      return false;
    }
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const totalInventoryValue = (inventoryItems || []).reduce((acc, i) => acc + (parseFloat(i.total_value) || 0), 0);
  const reorderItemsCount = (inventoryItems || []).filter(i => i.status === 'Reorder').length;
  const watchItemsCount = (inventoryItems || []).filter(i => i.status === 'Watch').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#0E2118] text-white px-4 py-2.5 rounded-xl border border-emerald-500 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Stock on Hand & Multi-Warehouse Control</h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#0E2118] text-amber-300">
              ACID Synchronized
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Eggs by grade, feed, inputs, and packing at Mardan, Attock, both farms, and Rashakai cold stores — standard trays of 30.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAdjust()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>Stock Adjustment</span>
          </button>

          <button
            onClick={() => handleOpenTransfer()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0E2118] rounded-xl hover:bg-[#18392A] transition shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Inter-Warehouse Transfer</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Stock Value</span>
          <div className="text-2xl font-black text-gray-900 mt-1 font-mono">
            PKR {(totalInventoryValue / 1000000).toFixed(1)}M
          </div>
          <span className="text-[11px] text-gray-500">{inventoryItems?.length || 0} active stocked items</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Below Reorder Level</span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
            {reorderItemsCount} items
          </div>
          <span className="text-[11px] text-rose-700 font-medium">Critical reorder required</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Watch Items</span>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {watchItemsCount} items
          </div>
          <span className="text-[11px] text-amber-700">Approaching threshold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Warehouses</span>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">
            6 facilities
          </div>
          <span className="text-[11px] text-emerald-600">Mardan, Attock, Farms & Plant</span>
        </div>
      </div>

      {/* Sub Tabs: Stock vs Movement Ledger */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'stock'
              ? 'bg-[#0E2118] text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Warehouse Stock Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ledger'
              ? 'bg-[#0E2118] text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Stock Movement Ledger</span>
        </button>
      </div>

      {/* VIEW 1: WAREHOUSE STOCK MATRIX */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filter Row */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {['ALL', 'Eggs', 'Feed'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      selectedCategory === cat
                        ? 'bg-[#0E2118] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyBelowReorder}
                  onChange={(e) => setOnlyBelowReorder(e.target.checked)}
                  className="rounded text-black focus:ring-0"
                />
                <span>Only below reorder</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0E2118] rounded-lg hover:bg-[#18392A] transition"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Multi-Warehouse Stock Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold bg-[#0E2118] text-white uppercase tracking-wider">
                    <th className="py-3 px-4">ITEM DESCRIPTION</th>
                    <th className="py-3 px-2 text-center" title="Mardan Central Store & Sales Point">MRD</th>
                    <th className="py-3 px-2 text-center" title="Attock Cold Store">ATK</th>
                    <th className="py-3 px-2 text-center" title="Charsadda Layer Farm">CCF</th>
                    <th className="py-3 px-2 text-center" title="Peshawar Holding Facility">PHF</th>
                    <th className="py-3 px-3 text-right">TOTAL STOCK</th>
                    <th className="py-3 px-3 text-right">REORDER</th>
                    <th className="py-3 px-3 text-right">AVG COST</th>
                    <th className="py-3 px-3 text-right">VALUE (PKR)</th>
                    <th className="py-3 px-2 text-center">STATUS</th>
                    <th className="py-3 px-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-gray-400 font-medium">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                        <span>Loading inventory items...</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="11" className="py-8 text-center text-rose-700 bg-rose-50 font-semibold text-xs">
                        {error}
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-gray-400 font-medium">
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                            <span>{item.code}</span>
                            <span className="text-gray-300">·</span>
                            <span>{item.category}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono font-bold text-gray-900 bg-gray-50/50">
                          {item.mrd_qty || 0}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-gray-700">
                          {item.atk_qty || 0}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-gray-700">
                          {item.ccf_qty || 0}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-gray-700">
                          {item.phf_qty || 0}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-gray-950 font-mono">
                          {item.total_qty} trays
                        </td>
                        <td className="py-3.5 px-3 text-right text-gray-500 font-mono">{item.reorder_at}</td>
                        <td className="py-3.5 px-3 text-right text-gray-600 font-mono">
                          PKR {Number(item.avg_cost).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-gray-900 font-mono">
                          PKR {Number(item.total_value).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'OK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.status === 'Reorder' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenAdjust(item)}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-800 text-gray-600 transition"
                              title="Adjust Stock for this item"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenTransfer(item)}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-[#0E2118] hover:text-amber-300 text-gray-600 transition"
                              title="Transfer Stock between Warehouses"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MOVEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Stock Movement Audit Ledger</h3>
              <p className="text-xs text-gray-500">Immutable chronological record of sales deductions, transfers, and physical count adjustments</p>
            </div>
            <button
              onClick={fetchLedger}
              disabled={isLoadingLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLedger ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0E2118] text-white font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">Quantity Change</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {isLoadingLedger ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      <span>Loading movements...</span>
                    </td>
                  </tr>
                ) : ledgerError ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-rose-700 bg-rose-50 font-semibold text-xs">
                      {ledgerError}
                    </td>
                  </tr>
                ) : ledgerTxs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400 font-medium">
                      No stock movements yet
                    </td>
                  </tr>
                ) : (
                  ledgerTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {tx.ref_no}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {tx.item_name || `Item #${tx.item_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.transaction_type === 'POS_SALE' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          tx.transaction_type === 'TRANSFER_OUT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          tx.transaction_type === 'TRANSFER_IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {tx.warehouse || 'Mardan Central Store'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={tx.quantity_change > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change} trays
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {tx.performed_by || 'Staff'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK ADJUSTMENT */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-gray-900">Stock Adjustment</h3>
              </div>
              <button
                onClick={() => {
                  setIsAdjustModalOpen(false);
                  setAdjError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {adjError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
                {adjError}
              </div>
            )}

            <form onSubmit={handleSubmitAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-600 font-bold block mb-1">Select Item</label>
                <select
                  value={adjItemId}
                  onChange={(e) => setAdjItemId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- Select an item --</option>
                  {(inventoryItems || []).map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code} · Total: {i.total_qty} trays)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-bold block mb-1">Facility / Warehouse</label>
                  <select
                    value={adjWarehouse}
                    onChange={(e) => setAdjWarehouse(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
                  >
                    {WAREHOUSES.map(w => (
                      <option key={w.code} value={w.code}>{w.code} – {w.name.split(' ')[0]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-600 font-bold block mb-1">Adjustment Action</label>
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjType('add')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${adjType === 'add' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600'}`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType('subtract')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${adjType === 'subtract' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-600'}`}
                    >
                      - Subtract
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-600 font-bold block mb-1">Quantity (Trays of 30)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-gray-600 font-bold block mb-1">Adjustment Reason</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="Physical Stock Count Audit">Physical Stock Count Audit</option>
                  <option value="QC Reject / Broken Eggs">QC Reject / Broken Eggs</option>
                  <option value="Restock from Farm">Restock from Farm</option>
                  <option value="Damaged in Cold Store">Damaged in Cold Store</option>
                  <option value="Customer Return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="text-gray-600 font-bold block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional reference notes"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setAdjError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="px-4 py-2 rounded-xl bg-[#0E2118] text-white hover:bg-[#18392A] font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingAdj && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />}
                  <span>{isSubmittingAdj ? 'Saving...' : 'Save Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTER-WAREHOUSE TRANSFER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-gray-900">Inter-Warehouse Stock Transfer</h3>
              </div>
              <button
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTrfError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {trfError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
                {trfError}
              </div>
            )}

            <form onSubmit={handleSubmitTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-600 font-bold block mb-1">Select Item to Transfer</label>
                <select
                  value={trfItemId}
                  onChange={(e) => setTrfItemId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">-- Select an item --</option>
                  {(inventoryItems || []).map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-bold block mb-1">Source Facility</label>
                  <select
                    value={trfFromWh}
                    onChange={(e) => setTrfFromWh(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
                  >
                    {WAREHOUSES.map(w => (
                      <option key={w.code} value={w.code}>{w.code} – {w.name.split(' ')[0]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-600 font-bold block mb-1">Destination Facility</label>
                  <select
                    value={trfToWh}
                    onChange={(e) => setTrfToWh(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
                  >
                    {WAREHOUSES.map(w => (
                      <option key={w.code} value={w.code}>{w.code} – {w.name.split(' ')[0]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-600 font-bold block mb-1">Transfer Quantity (Trays)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={trfQty}
                  onChange={(e) => setTrfQty(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 font-bold block mb-1">Vehicle Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. MRD-4471"
                    value={trfVehicle}
                    onChange={(e) => setTrfVehicle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-gray-600 font-bold block mb-1">Driver / Transporter (Optional)</label>
                  <input
                    type="text"
                    placeholder="Driver name"
                    value={trfDriver}
                    onChange={(e) => setTrfDriver(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span className="text-[11px] font-bold text-emerald-900">Auto-issue Outward Gate Pass</span>
                </div>
                <input
                  type="checkbox"
                  checked={trfAutoGatePass}
                  onChange={(e) => setTrfAutoGatePass(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-0"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferModalOpen(false);
                    setTrfError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTrf}
                  className="px-4 py-2 rounded-xl bg-[#0E2118] text-white hover:bg-[#18392A] font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingTrf && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />}
                  <span>{isSubmittingTrf ? 'Transferring...' : 'Execute Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
