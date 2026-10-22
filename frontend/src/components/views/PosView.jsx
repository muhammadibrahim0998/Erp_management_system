import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  CreditCard,
  Banknote,
  Building2,
  RefreshCw,
  X,
  Receipt,
  FileText,
  ChevronRight,
  Hash,
  DollarSign,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { posService } from '../../services';
import { exportToPDF } from '../../utils/exportUtils';

export default function PosView({ currentUser, onSaleCompleted }) {
  // Navigation inside POS view: 'terminal' or 'history'
  const [activeSubTab, setActiveSubTab] = useState('terminal');

  // Inventory items for the catalog
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Cart State
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [customerType, setCustomerType] = useState('retail'); // 'retail' or 'dealer'
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Mardan Central Store');

  // Checkout Status & Receipt Modal
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Invoices History State
  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Daily Stats State
  const [posStats, setPosStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    todayTraysSold: 0
  });

  // Pre-registered B2B Egg Dealers for quick selection
  const REGISTERED_DEALERS = [
    { name: 'Swat Valley Egg Dealers', phone: '0300-9876543', limit: 'PKR 15.0M', rating: 'Tier 1' },
    { name: 'Peek Freans', phone: '021-34567890', limit: 'PKR 25.0M', rating: 'Enterprise' },
    { name: 'Dawn Foods', phone: '042-35890123', limit: 'PKR 20.0M', rating: 'Enterprise' },
    { name: 'Karachi Egg Wholesalers', phone: '0321-4455667', limit: 'PKR 18.0M', rating: 'Tier 1' },
    { name: 'Barkat Frisian (value-added)', phone: '0333-8899001', limit: 'PKR 10.0M', rating: 'Tier 2' },
    { name: 'Salman Sweets & Bakers', phone: '0937-862211', limit: 'PKR 5.0M', rating: 'Retailer' }
  ];

  // Fetch Inventory Products
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await posService.getInventory();
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load inventory for POS:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch POS Stats
  const fetchPosStats = async () => {
    try {
      const data = await posService.getStats();
      if (data) setPosStats(data);
    } catch (err) {
      console.error('Failed to load POS stats:', err);
    }
  };

  // Fetch Invoices History
  const fetchInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const data = await posService.getOrders();
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPosStats();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchInvoices();
    }
  }, [activeSubTab]);

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const discountVal = parseFloat(discount) || 0;
  const taxVal = (subtotal - discountVal) * ((parseFloat(taxPercent) || 0) / 100);
  const totalAmount = Math.max(0, subtotal - discountVal + taxVal);
  const numPaid = parseFloat(paidAmount) || 0;
  const changeDue = Math.max(0, numPaid - totalAmount);

  // Add Product to Cart
  const handleAddToCart = (product) => {
    const existing = cart.find(c => c.id === product.id);
    const available = product.mrd_qty ?? product.total_qty;

    if (existing) {
      if (existing.quantity + 1 > available) {
        alert(`Cannot add more. Available stock in Mardan is ${available} trays.`);
        return;
      }
      setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (available < 1) {
        alert(`"${product.name}" is out of stock in Mardan store.`);
        return;
      }
      setCart([
        ...cart,
        {
          id: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          unit_price: parseFloat(product.avg_cost) || 550,
          quantity: 1,
          availableStock: available
        }
      ]);
    }
  };

  // Update Cart Quantity
  const handleUpdateQty = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.availableStock) {
          alert(`Maximum available stock in Mardan is ${item.availableStock} trays.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  // Remove Item from Cart
  const handleRemoveItem = (productId) => {
    setCart(cart.filter(c => c.id !== productId));
  };

  // Clear Entire Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the active cart?')) {
      setCart([]);
      setDiscount(0);
      setPaidAmount('');
      setCheckoutError(null);
    }
  };

  // Quick Cash Helper Buttons
  const handleQuickCash = (amount) => {
    if (amount === 'exact') {
      setPaidAmount(String(Math.ceil(totalAmount)));
    } else {
      const current = parseFloat(paidAmount) || 0;
      setPaidAmount(String(current + amount));
    }
  };

  // Handle Dealer Select
  const handleSelectDealer = (dealerName) => {
    if (!dealerName) {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      return;
    }
    const d = REGISTERED_DEALERS.find(item => item.name === dealerName);
    if (d) {
      setCustomerName(d.name);
      setCustomerPhone(d.phone);
    }
  };

  // Submit Checkout (ACID Atomic Execution)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to checkout.');
      return;
    }

    if (numPaid < totalAmount && paymentMethod === 'Cash') {
      alert(`Paid amount (PKR ${numPaid.toLocaleString()}) is less than total bill (PKR ${totalAmount.toLocaleString()}).`);
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim(),
        warehouse: selectedWarehouse,
        items: cart.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          quantity: c.quantity,
          unit_price: c.unit_price
        })),
        paymentMethod,
        subtotal,
        taxAmount: taxVal,
        discountAmount: discountVal,
        totalAmount,
        paidAmount: paymentMethod === 'Cash' ? numPaid : totalAmount,
        cashierName: currentUser?.name || 'Bilal Yousafzai'
      };

      const data = await posService.checkout(payload);

      // Success!
      setCompletedInvoice(data.invoice);
      setIsReceiptModalOpen(true);

      // Reset cart
      setCart([]);
      setDiscount(0);
      setPaidAmount('');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');

      // Refresh inventory and stats
      fetchProducts();
      fetchPosStats();
      if (onSaleCompleted) onSaleCompleted();

    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Inspect or Re-Print an Invoice from History
  const handleInspectInvoice = async (invoiceId) => {
    try {
      const orderData = await posService.getOrderById(invoiceId);
      if (orderData) {
        setCompletedInvoice(orderData);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    }
  };

  // Export Invoice to PDF
  const handleExportInvoicePDF = () => {
    if (!completedInvoice) return;

    const headers = ['#', 'Item Description', 'Trays', 'Unit Price', 'Total (PKR)'];
    const rows = (completedInvoice.items || []).map((it, idx) => [
      String(idx + 1),
      it.item_name || it.name,
      `${it.quantity} trays`,
      `PKR ${Number(it.unit_price).toLocaleString()}`,
      `PKR ${Number(it.total_price || (it.quantity * it.unit_price)).toLocaleString()}`
    ]);

    exportToPDF({
      filename: `${completedInvoice.invoice_no || 'YAF_Invoice'}`,
      title: 'Tax Invoice & Goods Issue Note',
      subtitle: `Invoice No: ${completedInvoice.invoice_no} · Payment: ${completedInvoice.payment_method}`,
      period: `Issued On: ${new Date(completedInvoice.created_at).toLocaleString()}`,
      kpis: [
        { label: 'Total Amount', value: `PKR ${Number(completedInvoice.total_amount).toLocaleString()}` },
        { label: 'Paid Amount', value: `PKR ${Number(completedInvoice.paid_amount).toLocaleString()}` },
        { label: 'Change Returned', value: `PKR ${Number(completedInvoice.change_amount || 0).toLocaleString()}` },
        { label: 'Cashier Desk', value: completedInvoice.cashier_name || 'Counter 1' }
      ],
      headers,
      rows,
      summaryNotes: [
        `Customer: ${completedInvoice.customer_name || 'Walk-in'} (${completedInvoice.customer_phone || 'N/A'})`,
        `Warehouse: ${completedInvoice.warehouse || 'Mardan Central Store'}`,
        'Goods received in good condition. Farm-fresh eggs guaranteed since 1960.'
      ]
    });
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with KPIs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Point of Sale (POS) Counter
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#0E2118] text-amber-300">
              ACID Atomic Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            High-speed retail & wholesale egg distribution checkout for Yousafzai Agri Foods (Pvt) Ltd · Mardan Store.
          </p>
        </div>

        {/* Counter Summary KPIs */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Today's Sales</span>
            <span className="text-sm font-black text-emerald-700 font-mono">
              PKR {Number(posStats.todayRevenue).toLocaleString()}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Invoices</span>
            <span className="text-sm font-black text-gray-900 font-mono">
              {posStats.todayOrders} orders
            </span>
          </div>
          <div className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Trays Sold</span>
            <span className="text-sm font-black text-amber-600 font-mono">
              {Number(posStats.todayTraysSold).toLocaleString()} trays
            </span>
          </div>
        </div>
      </div>

      {/* POS Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSubTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'terminal'
              ? 'bg-[#0E2118] text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Sales Terminal</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-gray-950 rounded-full text-[10px] font-black">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'history'
              ? 'bg-[#0E2118] text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-amber-400" />
          <span>Recent Invoices & Receipts</span>
        </button>
      </div>

      {/* VIEW 1: ACTIVE SALES TERMINAL */}
      {activeSubTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Catalog & Search (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search and Category Filters */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Scan barcode, enter SKU or search egg grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Products' },
                  { id: 'Eggs', label: 'Table Eggs' },
                  { id: 'Feed', label: 'Feed & Inputs' },
                  { id: 'Liquid', label: 'Liquid Egg' },
                  { id: 'Packing', label: 'Packaging' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      selectedCategory === cat.id
                        ? 'bg-[#0E2118] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {isLoadingProducts ? (
                <div className="col-span-2 py-16 text-center text-gray-400 font-medium">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading product catalog...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-200">
                  <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <span>No products found matching your search.</span>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const available = product.mrd_qty ?? product.total_qty;
                  const isOutOfStock = available <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddToCart(product)}
                      className={`bg-white border rounded-2xl p-4 shadow-sm transition flex flex-col justify-between cursor-pointer group ${
                        isOutOfStock 
                          ? 'border-gray-200 opacity-60 cursor-not-allowed bg-gray-50' 
                          : 'border-gray-200 hover:border-emerald-500 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[10px] font-bold text-gray-400">
                            {product.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            available > (product.reorder_at * 0.5)
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : available > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {available > 0 ? `${available} trays in stock` : 'Out of Stock'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 transition line-clamp-2">
                          {product.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{product.category}</span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Rate / tray</span>
                          <span className="text-sm font-black text-gray-900 font-mono">
                            PKR {Number(product.avg_cost || 550).toLocaleString()}
                          </span>
                        </div>

                        <button
                          disabled={isOutOfStock}
                          className="w-8 h-8 rounded-xl bg-[#0E2118] text-white flex items-center justify-center font-bold text-xs hover:bg-[#18392A] transition disabled:opacity-40"
                          title="Add to Bill"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Billing Cart & Settlement Drawer (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between min-h-[680px]">
              <div>
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-extrabold text-sm text-gray-900">Active Order</h3>
                    <span className="text-xs font-bold text-gray-400">
                      ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                    </span>
                  </div>

                  <button
                    onClick={handleClearCart}
                    disabled={cart.length === 0}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 transition disabled:opacity-30"
                  >
                    Clear Cart
                  </button>
                </div>

                {/* Customer Selection Drawer */}
                <div className="py-3 border-b border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer Type</span>
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-bold">
                      <button
                        onClick={() => { setCustomerType('retail'); setCustomerName('Walk-in Customer'); setCustomerPhone(''); }}
                        className={`px-2 py-0.5 rounded-md transition ${customerType === 'retail' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        Walk-in Retail
                      </button>
                      <button
                        onClick={() => { setCustomerType('dealer'); setCustomerName(REGISTERED_DEALERS[0].name); setCustomerPhone(REGISTERED_DEALERS[0].phone); }}
                        className={`px-2 py-0.5 rounded-md transition ${customerType === 'dealer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        B2B Dealer
                      </button>
                    </div>
                  </div>

                  {customerType === 'dealer' ? (
                    <div className="space-y-1.5">
                      <select
                        value={customerName}
                        onChange={(e) => handleSelectDealer(e.target.value)}
                        className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-emerald-600"
                      >
                        {REGISTERED_DEALERS.map((d, i) => (
                          <option key={i} value={d.name}>
                            {d.name} ({d.rating} · Credit {d.limit})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Phone: {customerPhone || 'N/A'}</span>
                        <span className="text-emerald-700 font-bold">Pre-authorized Dealer</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-600"
                      />
                      <input
                        type="text"
                        placeholder="Phone No (optional)"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 my-2 pr-1">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-xs font-medium">
                      <ShoppingCart className="w-8 h-8 mx-auto text-gray-300 mb-2 opacity-50" />
                      <span>Select egg grades or items from the left to start billing</span>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-gray-900 truncate">{item.name}</h5>
                          <span className="font-mono text-[11px] text-gray-400">
                            PKR {Number(item.unit_price).toLocaleString()} × {item.quantity}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-5 h-5 rounded bg-white text-gray-700 flex items-center justify-center font-bold hover:bg-gray-200 shadow-sm"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs px-1.5 text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-5 h-5 rounded bg-white text-gray-700 flex items-center justify-center font-bold hover:bg-gray-200 shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right shrink-0 min-w-16">
                          <span className="font-mono font-black text-gray-900">
                            PKR {(item.quantity * item.unit_price).toLocaleString()}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-400 hover:text-rose-600 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Cart Financial Summary & Settlement */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                {/* Discount & Tax Row */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Discount (PKR)</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Sales Tax (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      placeholder="0%"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Subtotal & Final Bill */}
                <div className="space-y-1.5 text-xs font-medium text-gray-600 pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-gray-900">PKR {subtotal.toLocaleString()}</span>
                  </div>
                  {discountVal > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount Applied:</span>
                      <span className="font-mono font-bold">- PKR {discountVal.toLocaleString()}</span>
                    </div>
                  )}
                  {taxVal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Sales Tax ({taxPercent}%):</span>
                      <span className="font-mono font-bold">+ PKR {taxVal.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Net Payable Banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#0E2118] text-white">
                    <div>
                      <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Total Payable</span>
                      <span className="text-xl font-black font-mono">
                        PKR {Math.ceil(totalAmount).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-300">
                      {cart.reduce((a, b) => a + b.quantity, 0)} trays
                    </span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Method</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    {[
                      { id: 'Cash', label: 'Cash', icon: Banknote },
                      { id: 'Bank Transfer', label: 'Meezan', icon: Building2 },
                      { id: 'Credit Card', label: 'Card', icon: CreditCard },
                      { id: 'Dealer Ledger', label: 'Credit', icon: FileText }
                    ].map(pm => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                            paymentMethod === pm.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[10px] truncate">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash Tendered & Change Due (If Cash) */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-gray-700">Cash Received:</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-32 bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-right font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Quick Cash Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleQuickCash('exact')}
                        className="flex-1 py-1 text-[10px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      >
                        Exact
                      </button>
                      <button
                        onClick={() => handleQuickCash(500)}
                        className="flex-1 py-1 text-[10px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      >
                        +500
                      </button>
                      <button
                        onClick={() => handleQuickCash(1000)}
                        className="flex-1 py-1 text-[10px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      >
                        +1,000
                      </button>
                      <button
                        onClick={() => handleQuickCash(5000)}
                        className="flex-1 py-1 text-[10px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      >
                        +5,000
                      </button>
                    </div>

                    {/* Change Return Banner */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-xs font-bold">
                      <span className="text-gray-500">Change Due:</span>
                      <span className={`font-mono text-sm ${changeDue > 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                        PKR {changeDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {checkoutError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || cart.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#0E2118] text-white font-extrabold text-sm shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Processing Atomic Stock Lock...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Complete Sale & Issue Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: RECENT INVOICES & RECEIPTS HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Recent POS Invoices</h3>
              <p className="text-xs text-gray-500">Audit-backed point of sale receipts and tax invoices</p>
            </div>

            <button
              onClick={fetchInvoices}
              disabled={isLoadingInvoices}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0E2118] text-white font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total (PKR)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {isLoadingInvoices ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      <span>Loading invoices...</span>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400 font-medium">
                      No POS orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {inv.invoice_no}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {inv.customer_name}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {inv.warehouse}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          {inv.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                        PKR {Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleInspectInvoice(inv.id)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#0E2118] hover:text-white text-gray-700 transition"
                          title="Print / View Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT & CORPORATE INVOICE MODAL */}
      {isReceiptModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-[#0E2118] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider">Thermal Sales Receipt</h4>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Thermal Slip Body */}
            <div className="p-6 font-mono text-xs text-gray-900 bg-zinc-50 border-b border-gray-200 space-y-4 select-all">
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-300">
                <h3 className="font-black text-sm uppercase tracking-tight text-gray-950 font-sans">
                  Yousafzai Agri Foods (Pvt) Ltd
                </h3>
                <p className="text-[10px] text-gray-600">Head Office: Mardan · Processing Plant: Rashakai</p>
                <p className="text-[10px] text-gray-600">NTN: 8945210-3 · STRN: 3277876123456</p>
                <p className="text-[10px] font-bold text-gray-800 uppercase mt-1">
                  *** Official Sales Receipt ***
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice #:</span>
                  <span className="font-bold">{completedInvoice.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date/Time:</span>
                  <span>{new Date(completedInvoice.created_at || Date.now()).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cashier:</span>
                  <span>{completedInvoice.cashier_name || 'Counter 1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-bold">{completedInvoice.customer_name || 'Walk-in Customer'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pb-3 border-b border-dashed border-gray-300 text-[11px]">
                <div className="flex justify-between font-bold text-gray-500 uppercase text-[9px]">
                  <span>Item / Qty</span>
                  <span>Total</span>
                </div>
                {(completedInvoice.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold truncate text-gray-950">{it.item_name || it.name}</div>
                      <div className="text-[10px] text-gray-500">
                        {it.quantity} trays @ PKR {Number(it.unit_price).toLocaleString()}
                      </div>
                    </div>
                    <div className="font-bold shrink-0">
                      PKR {Number(it.total_price || (it.quantity * it.unit_price)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>PKR {Number(completedInvoice.subtotal || completedInvoice.total_amount).toLocaleString()}</span>
                </div>
                {Number(completedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Discount:</span>
                    <span>- PKR {Number(completedInvoice.discount_amount).toLocaleString()}</span>
                  </div>
                )}
                {Number(completedInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Sales Tax:</span>
                    <span>+ PKR {Number(completedInvoice.tax_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200">
                  <span>TOTAL PAID:</span>
                  <span>PKR {Number(completedInvoice.total_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-gray-600">Payment Mode:</span>
                  <span className="font-bold uppercase">{completedInvoice.payment_method || 'Cash'}</span>
                </div>
                {completedInvoice.payment_method === 'Cash' && (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-600">Cash Received:</span>
                      <span>PKR {Number(completedInvoice.paid_amount || completedInvoice.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-emerald-800">
                      <span>Change Returned:</span>
                      <span>PKR {Number(completedInvoice.change_amount || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Note */}
              <div className="text-center space-y-1 text-[10px] text-gray-500 pt-1">
                <p className="font-bold text-gray-800">Thank you for your business!</p>
                <p>Farm fresh eggs guaranteed since 1960.</p>
                <p className="text-[9px] text-gray-400 mt-1">Software powered by AgenTech Enterprise ERP</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white flex items-center justify-between gap-2.5">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal (80mm)</span>
              </button>

              <button
                onClick={handleExportInvoicePDF}
                className="flex-1 py-2 rounded-xl bg-[#0E2118] hover:bg-[#18392A] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
