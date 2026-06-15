import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  ShoppingCart, Plus, Minus, Trash2, Search, User, CreditCard, 
  Tag, Loader2, Sparkles, Printer, CheckCircle, FileText, X,
  ChevronDown, ChevronUp, SlidersHorizontal, LayoutList
} from 'lucide-react';
import { formatPKDate, formatPKTime } from '../lib/time';
import { audioService } from '../lib/audio';

export default function SalesPOSView() {
  const { products, customers, createSale, currentShop, sales, invoices, saleItems, categories } = useStore();

  // Search products
  const [productSearch, setProductSearch] = useState('');
  
  // Cart state (with price override capability)
  const [cart, setCart] = useState<{ product_id: string; quantity: number; custom_unit_price?: number }[]>([]);
  
  // Choose between beautiful compact row listing and full-panel layout
  const [isCompactMode, setIsCompactMode] = useState(() => {
    const saved = localStorage.getItem('pos_cart_compact_mode');
    return saved !== null ? saved === 'true' : true;
  });

  // Keep track of which card is currently expanded to edit price/quantity in compact mode
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Checkout details
  const [customerId, setCustomerId] = useState<string>(''); // empty means Walk-in
  const [walkInName, setWalkInName] = useState<string>('');
  
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Cash');

  // Completed sale details (for printable receipt modal)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);

  // Buffer raw text for buy-by-amount typing to avoid annoying decimal cursor drift
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});

  // Buffer raw text for price-override typing to avoid annoying decimal cursor drift
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

  const primaryCurrency = currentShop?.currency || 'PKR';
  const taxRate = currentShop?.tax_rate ?? 0;

  // Helper to extract weight from unit for sorting and coloring
  const getWeight = (unit: string) => {
    const match = unit.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
    if (unit.toUpperCase().includes('KG')) return 1;
    return 999;
  };

  const getWeightLabel = (unit: string) => {
    const match = unit.match(/(\d+)/);
    if (match) return match[1];
    if (unit.toUpperCase().includes('KG')) return 'KG';
    return '';
  };

  const getWeightColor = (unit: string) => {
    const w = getWeight(unit);
    if (w === 10) return 'bg-blue-50/50 border-blue-200 text-blue-900';
    if (w === 15) return 'bg-emerald-50/50 border-emerald-200 text-emerald-900';
    if (w === 20) return 'bg-purple-50/50 border-purple-200 text-purple-900';
    if (w === 40 || w === 80) return 'bg-rose-50/50 border-rose-200 text-rose-900';
    return 'bg-white border-gray-150 text-gray-900';
  };

  const getBadgeColor = (unit: string) => {
    const w = getWeight(unit);
    if (w === 10) return 'bg-blue-600 text-white';
    if (w === 15) return 'bg-emerald-600 text-white';
    if (w === 20) return 'bg-purple-600 text-white';
    if (w === 40 || w === 80) return 'bg-rose-600 text-white';
    return 'bg-gray-500 text-white';
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Search filtered products (only showing products in stock)
  const availableProducts = useMemo(() => {
    let filtered = [...products];
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    return filtered
      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
      .sort((a, b) => getWeight(a.unit) - getWeight(b.unit));
  }, [products, productSearch, selectedCategory]);

  const getStockStatusColor = (stock: number, min: number) => {
    if (stock <= 0) return 'bg-gray-300';
    if (stock <= min) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const addToCart = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Reset back to active cart view when starting a new sale
    if (completedSaleId) {
      setCompletedSaleId(null);
    }

    setCart(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing) {
        return prev.map(item => 
          item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: productId, quantity: 1 }];
    });

    audioService.playInfo();

    // Auto-focus the last updated product for quick custom edits
    setExpandedId(productId);

    // Wipe manual amount buffer when product count increments
    setAmountInputs(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Keyboard shortcut for search (Press '/' to focus)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search flour tags..."]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatQuantity = (qty: number) => {
    return Number(qty).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };

  const updateCartQuantity = (productId: string, val: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const finalQty = Math.max(0.0001, parseFloat((item.quantity + val).toFixed(4)));
          return { ...item, quantity: finalQty };
        }
        return item;
      });
    });

    // Wipe amount input cache
    setAmountInputs(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const updateCartPrice = (productId: string, priceVal: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          return { ...item, custom_unit_price: priceVal >= 0 ? priceVal : undefined };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
    setAmountInputs(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setPriceInputs(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    if (expandedId === productId) {
      setExpandedId(null);
    }
  };

  // Computations
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        const activePrice = item.custom_unit_price ?? prod.sale_price;
        subtotal += Math.round(item.quantity * activePrice * 100) / 100;
      }
    });

    const calculatedTax = parseFloat(((subtotal - discount) * (taxRate / 100)).toFixed(2));
    const grandTotal = Math.max(0, subtotal - discount + calculatedTax);

    return {
      subtotal,
      tax: calculatedTax,
      grandTotal
    };
  }, [cart, products, discount, taxRate]);

  // Handle immediate POS checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      const payloadItems = cart.map(item => {
        const prod = products.find(p => p.id === item.product_id)!;
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          sale_price: item.custom_unit_price ?? prod.sale_price
        };
      });

      const activePaid = customerId ? paidAmount : cartTotals.grandTotal;

      const createdId = await createSale({
        customer_id: customerId || null,
        customer_name_manual: customerId ? null : (walkInName || 'Walk-in Customer'),
        items: payloadItems,
        discount: discount || 0,
        paid_amount: Number(activePaid),
        payment_method: paymentMethod
      });

      if (createdId) {
        setCompletedSaleId(createdId);
        // Reset POS Cart
        setCart([]);
        setAmountInputs({});
        setPriceInputs({});
        setCustomerId('');
        setWalkInName('');
        setDiscount(0);
        setPaidAmount(0);
        setExpandedId(null);
      } else {
        useStore.getState().addNotification({
          shop_id: currentShop?.id || 'sys',
          title: 'Checkout Failed',
          message: 'Could not register the sale. Please check inventory or connection.',
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error('POS Checkout Error:', err);
      useStore.getState().addNotification({
        shop_id: currentShop?.id || 'sys',
        title: 'System Error',
        message: err.message || 'An unexpected error occurred during checkout.',
        type: 'error'
      });
    }
  };

  // Lookup details for completed invoice renderer
  const completedInvoiceDetails = useMemo(() => {
    if (!completedSaleId) return null;
    const sale = sales.find(s => s.id === completedSaleId);
    const invoice = invoices.find(inv => inv.sale_id === completedSaleId);
    if (!sale) return null;

    const itemsSold = saleItems.filter(item => item.sale_id === completedSaleId);
    const client = customers.find(c => c.id === sale.customer_id);

    return {
      sale,
      invoice,
      itemsSold,
      client
    };
  }, [completedSaleId, sales, invoices, saleItems, customers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 font-sans" id="pos-view-panel">
      
      {/* LEFT: PRODUCTS LISTING & QUICK SEARCH (3/5 Grid Width) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Checkout Terminal</h2>
            <p className="text-xs text-gray-500">Fast product click checkout & instant client ledger updates</p>
          </div>

          {/* Product quick-search bar */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search flour tags..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-xs bg-white text-gray-800 border border-gray-200 focus:outline-none focus:border-orange-500 rounded-xl transition-all"
            />
            {productSearch && (
              <button 
                onClick={() => setProductSearch('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filtering Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${selectedCategory === 'All' ? 'bg-orange-600 text-white shadow-sm' : 'bg-white border border-gray-150 text-gray-500 hover:bg-gray-50'}`}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-orange-600 text-white shadow-sm' : 'bg-white border border-gray-150 text-gray-500 hover:bg-gray-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Quick click product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {availableProducts.map(prod => {
            const isOutOfStock = prod.stock <= 0;
            const weightColorClasses = isOutOfStock ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : `${getWeightColor(prod.unit)} cursor-pointer`;
            
            return (
              <button
                key={prod.id}
                onClick={() => !isOutOfStock && addToCart(prod.id)}
                disabled={isOutOfStock}
                className={`p-4 border rounded-2xl text-left hover:border-orange-500 hover:shadow-2xs transition-all flex flex-col justify-between space-y-3 relative group ${weightColorClasses}`}
              >
                {/* Weight/Size Badge */}
                {getWeightLabel(prod.unit) && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm z-10 ${getBadgeColor(prod.unit)}`}>
                    {getWeightLabel(prod.unit)}
                  </div>
                )}
                
                <div className="space-y-1">
                  <span className="block font-extrabold text-gray-950 text-xs leading-snug group-hover:text-orange-600 transition-colors">{prod.name}</span>
                  <span className="block text-[10px] text-gray-400 font-mono">CODE: {prod.sku}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 transition-transform group-hover:scale-105 duration-200">
                    <Tag className="h-3 w-3 text-orange-500" />
                    <span className="font-bold font-mono text-gray-900 text-sm">
                      {primaryCurrency} {(prod.sale_price || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">/ {prod.unit}</span>
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prod.stock <= prod.min_stock_alert ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                    {isOutOfStock ? 'Out Of Stock' : `${Number(prod.stock).toFixed(2)} ${prod.unit}`}
                  </span>
                </div>

                {/* Stock Health Bar */}
                {!isOutOfStock && (
                  <div className="w-full bg-gray-200/50 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${getStockStatusColor(prod.stock, prod.min_stock_alert)}`} 
                      style={{ width: `${Math.min(100, (prod.stock / (prod.min_stock_alert * 5)) * 100)}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: BASKET SUMMARY AND CHECKOUT CONTROLS (2/5 Grid Width) */}
      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-3xs p-5 flex flex-col justify-between space-y-4 min-h-[500px]">
        {completedSaleId && completedInvoiceDetails ? (
          <div className="space-y-4 animate-fade-in text-left flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span>Invoice Details</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCompletedSaleId(null)}
                  className="text-xs text-orange-600 font-extrabold hover:underline flex items-center gap-0.5"
                >
                  + New Sale
                </button>
              </div>

              {/* Printable Receipt layout */}
              <div id="print-area" className="space-y-4 text-xs font-sans">
                {/* Receipt Header */}
                <div className="text-center pb-3 border-b border-dashed border-gray-200">
                  <h4 className="text-xs font-extrabold text-gray-950 uppercase tracking-wide">
                    {currentShop?.name || 'Supreme Atta Chakki Mill'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                    {currentShop?.address || 'Main Road, Block B, Grain Market'}<br />
                    Tel: {currentShop?.phone || '+92 300 0000000'}
                  </p>
                </div>

                {/* Patient/Client Metadata */}
                <div className="space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-150 text-[11px] text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-400 text-[9px] uppercase">Ledger Client:</span>
                    <span className="text-gray-950 font-bold uppercase">
                      {completedInvoiceDetails.client?.name || completedInvoiceDetails.sale.customer_name_manual || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-400 text-[9px] uppercase">Invoice Number:</span>
                    <span className="font-mono text-gray-950 font-bold">
                      {completedInvoiceDetails.invoice?.invoice_number || 'INV-MOCK'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-1">
                    <span>Date Time:</span>
                    <span>
                      {formatPKDate(completedInvoiceDetails.sale.created_at)} {formatPKTime(completedInvoiceDetails.sale.created_at)}
                    </span>
                  </div>
                </div>

                {/* Table of items */}
                <div className="max-h-[140px] overflow-y-auto divide-y divide-gray-100 pr-1">
                  {completedInvoiceDetails.itemsSold.map((line, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between text-[11px] gap-2">
                      <div className="truncate max-w-[60%]">
                        <span className="font-bold text-gray-900 block truncate">{line.product_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatQuantity(line.quantity)} {line.unit} × {primaryCurrency} {line.unit_price}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-gray-950 self-center">
                        {primaryCurrency} {(line.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Computation split */}
                <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-200 text-right">
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Cart Subtotal:</span>
                    <span className="font-mono">{primaryCurrency} {(completedInvoiceDetails.sale.total_amount || 0).toLocaleString()}</span>
                  </div>
                  {(completedInvoiceDetails.sale.discount || 0) > 0 && (
                    <div className="flex justify-between text-[11px] text-red-650">
                      <span>Discount:</span>
                      <span className="font-mono">-{primaryCurrency} {(completedInvoiceDetails.sale.discount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-mono">{primaryCurrency} {(completedInvoiceDetails.sale.tax_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-950 font-extrabold border-t border-gray-150 pt-1.5">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-orange-600 text-sm">{primaryCurrency} {(completedInvoiceDetails.sale.net_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-650">
                    <span>Amount Deposited:</span>
                    <span className="font-mono font-bold text-gray-900">{primaryCurrency} {(completedInvoiceDetails.sale.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  {(completedInvoiceDetails.sale.net_amount || 0) - (completedInvoiceDetails.sale.paid_amount || 0) > 0 && (
                    <div className="flex justify-between text-[10px] text-orange-700 font-bold border-t border-dashed border-gray-150 pt-1 animate-pulse">
                      <span>LEDGER CREDIT BALANCE:</span>
                      <span className="font-mono">{primaryCurrency} {((completedInvoiceDetails.sale.net_amount || 0) - (completedInvoiceDetails.sale.paid_amount || 0)).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2.5 border-t border-dashed border-gray-150">
                  <span className="text-[9px] italic text-gray-400 block">"{currentShop?.invoice_footer || 'Thank you for choosing pristine flour milling!'}"</span>
                </div>
              </div>
            </div>

            {/* Print triggers */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 justify-end print:hidden">
              <button 
                onClick={() => setCompletedSaleId(null)}
                className="w-1/2 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Receipt
              </button>
              <button 
                onClick={() => window.print()}
                className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-gray-950 hover:bg-gray-900 text-white text-xs font-extrabold rounded-xl transition shadow-xs cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                  <span>Active Sales Cart</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center gap-1 cursor-pointer"
                    title="Clear everything from cart"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear Cart</span>
                  </button>

                  {/* Mode toggle switcher */}
                  <button
                    type="button"
                  onClick={() => {
                    const next = !isCompactMode;
                    setIsCompactMode(next);
                    localStorage.setItem('pos_cart_compact_mode', String(next));
                  }}
                  className={`px-2 py-1 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 transition-all duration-200 cursor-pointer ${
                    isCompactMode 
                      ? 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100' 
                      : 'bg-gray-100 border-gray-250 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Toggle Cart Layout Style (Compact Summary vs Expanded Details)"
                >
                  {isCompactMode ? (
                    <>
                      <LayoutList className="h-3 w-3 text-orange-600 shrink-0" />
                      <span>Compact rows</span>
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal className="h-3 w-3 text-gray-500 shrink-0" />
                      <span>Detailed cards</span>
                    </>
                  )}
                </button>
              </div>
            </h3>
               {/* Cart Table */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    Cart is currently empty. Click options on the left.
                  </div>
                ) : (
                  cart.map(item => {
                    const prod = products.find(p => p.id === item.product_id);
                    if (!prod) return null;
                    const activePrice = item.custom_unit_price ?? prod.sale_price;
                    const total = Math.round(item.quantity * activePrice * 100) / 100;

                    // If compact mode is enabled, display accordions
                    if (isCompactMode) {
                      const isExpanded = expandedId === item.product_id;

                      if (!isExpanded) {
                        return (
                          <div 
                            key={item.product_id} 
                            onClick={() => setExpandedId(item.product_id)}
                            className="p-2.5 bg-gray-50 hover:bg-gray-100/80 hover:border-gray-350 border border-gray-150 rounded-xl flex items-center justify-between gap-3 text-xs text-left cursor-pointer transition duration-150 select-none animate-fade-in"
                          >
                            <div className="truncate flex-1">
                              <span className="font-bold text-gray-950 block truncate leading-tight mb-0.5">{prod.name}</span>
                              <span className="text-[10px] text-gray-550 flex items-center gap-1 flex-wrap">
                                <span className="font-mono font-extrabold bg-gray-100 text-gray-700 px-1 py-0.5 rounded-sm">{formatQuantity(item.quantity)} {prod.unit}</span>
                                <span className="text-gray-400">×</span>
                                <span className="font-mono text-gray-500">{primaryCurrency} {activePrice}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-extrabold font-mono text-gray-900 text-xs">
                                {primaryCurrency} {(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                          </div>
                        );
                      }

                      // Expanded compact card inline
                      return (
                        <div 
                          key={item.product_id} 
                          className="p-3 bg-orange-50/15 border-2 border-orange-200 rounded-xl flex flex-col gap-2.5 text-xs text-left transition-all duration-200 shadow-2xs"
                        >
                          {/* Expanded Title Header */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="truncate flex-1" onClick={() => setExpandedId(null)}>
                              <span className="block font-bold text-gray-950 truncate cursor-pointer leading-tight">{prod.name}</span>
                              <span className="block text-[8.5px] text-orange-650 font-black tracking-widest uppercase mt-0.5">
                                Edit Quantity & Miller Rate
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition"
                                title="Collapse options"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => removeFromCart(item.product_id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expansion Panel inputs */}
                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-150">
                            {/* Buy Qty */}
                            <div>
                              <span className="block text-[8px] font-black text-gray-450 uppercase mb-0.5 tracking-wider">Buy Qty ({prod.unit})</span>
                              <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs h-8">
                                <button 
                                  type="button"
                                  onClick={() => updateCartQuantity(item.product_id, -1)}
                                  className="px-1.5 hover:bg-gray-100 text-gray-500 transition cursor-pointer shrink-0 h-full flex items-center justify-center border-r border-gray-100"
                                >
                                  <Minus className="h-2 w-2" />
                                </button>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={(e) => {
                                    const rawVal = parseFloat(e.target.value);
                                    setCart(prev => prev.map(c => 
                                      c.product_id === item.product_id ? { ...c, quantity: isNaN(rawVal) ? 0 : parseFloat(rawVal.toFixed(4)) } : c
                                    ));
                                    setAmountInputs(prev => {
                                      const next = { ...prev };
                                      delete next[item.product_id];
                                      return next;
                                    });
                                  }}
                                  className="w-full text-center border-0 p-0 text-[11px] font-black font-mono text-gray-850 bg-transparent focus:ring-0 focus:outline-none min-w-[20px]"
                                />
                                <button 
                                  type="button"
                                  onClick={() => updateCartQuantity(item.product_id, 1)}
                                  className="px-1.5 hover:bg-gray-100 text-gray-500 transition cursor-pointer shrink-0 h-full flex items-center justify-center border-l border-gray-100"
                                >
                                  <Plus className="h-2 w-2" />
                                </button>
                              </div>
                            </div>

                            {/* Buy Price override */}
                            <div>
                              <span className="block text-[8px] font-black text-gray-450 uppercase mb-0.5 tracking-wider">Price / {prod.unit}</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={
                                  priceInputs[item.product_id] !== undefined
                                    ? priceInputs[item.product_id]
                                    : item.custom_unit_price !== undefined
                                    ? item.custom_unit_price
                                    : prod.sale_price
                                }
                                onChange={(e) => {
                                  const valStr = e.target.value;
                                  setPriceInputs(prev => ({
                                    ...prev,
                                    [item.product_id]: valStr
                                  }));

                                  const val = parseFloat(valStr);
                                  updateCartPrice(item.product_id, isNaN(val) ? -1 : val);
                                }}
                                onBlur={() => {
                                  setPriceInputs(prev => {
                                    const next = { ...prev };
                                    delete next[item.product_id];
                                    return next;
                                  });
                                }}
                                placeholder={String(prod.sale_price)}
                                className="w-full h-8 px-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold font-mono text-gray-850 transition focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
                              />
                            </div>

                            {/* Scale dynamically by amount */}
                            <div>
                              <span className="block text-[8px] font-black text-gray-450 uppercase mb-0.5 tracking-wider">By Amount ({primaryCurrency})</span>
                              <input
                                type="number"
                                step="any"
                                placeholder={`e.g. 1000`}
                                value={
                                  amountInputs[item.product_id] !== undefined
                                    ? amountInputs[item.product_id]
                                    : item.quantity === 0
                                    ? ''
                                    : Math.round(item.quantity * activePrice * 100) / 100
                                }
                                onChange={(e) => {
                                  const valStr = e.target.value;
                                  setAmountInputs(prev => ({
                                    ...prev,
                                    [item.product_id]: valStr
                                  }));

                                  const amt = parseFloat(valStr);
                                  if (!isNaN(amt)) {
                                    const qty = parseFloat((amt / activePrice).toFixed(6));
                                    setCart(prev => prev.map(c => 
                                      c.product_id === item.product_id ? { ...c, quantity: qty } : c
                                    ));
                                  } else {
                                    setCart(prev => prev.map(c => 
                                      c.product_id === item.product_id ? { ...c, quantity: 0 } : c
                                    ));
                                  }
                                }}
                                onBlur={() => {
                                  setAmountInputs(prev => {
                                    const next = { ...prev };
                                    delete next[item.product_id];
                                    return next;
                                  });
                                }}
                                className="w-full h-8 px-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
                              />
                            </div>
                          </div>

                          {/* Inline Subtotal statement */}
                          <div className="flex justify-between items-center bg-white/80 p-1.5 px-2.5 rounded-lg text-gray-650 border border-orange-100">
                            <span className="font-bold text-[9px] uppercase tracking-wide text-gray-450">Item subtotal:</span>
                            <span className="font-extrabold text-orange-600 font-mono text-xs">
                              {primaryCurrency} {(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Standard (Detailed cards) Mode
                    return (
                      <div key={item.product_id} className="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex flex-col gap-2 text-xs text-left">
                        {/* Title & Remove btn */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="truncate max-w-[80%]">
                            <span className="block font-bold text-gray-900 truncate">{prod.name}</span>
                            <span className="block text-[10px] text-gray-440 font-mono mt-0.5">
                              Standard Rate: {primaryCurrency} {prod.sale_price} / {prod.unit}
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeFromCart(item.product_id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Interactive adjustment controls */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                          {/* 1. Buy Quantity */}
                          <div>
                            <span className="block text-[8px] font-black text-gray-450 uppercase mb-0.5 tracking-wider">Buy Quantity ({prod.unit})</span>
                            <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs h-8">
                              <button 
                                type="button"
                                onClick={() => updateCartQuantity(item.product_id, -1)}
                                className="p-1 px-1.5 hover:bg-gray-100 text-gray-500 transition cursor-pointer shrink-0"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => {
                                  const rawVal = parseFloat(e.target.value);
                                  setCart(prev => prev.map(c => 
                                    c.product_id === item.product_id ? { ...c, quantity: isNaN(rawVal) ? 0 : parseFloat(rawVal.toFixed(4)) } : c
                                  ));
                                  // Invalidate cache
                                  setAmountInputs(prev => {
                                    const next = { ...prev };
                                    delete next[item.product_id];
                                    return next;
                                  });
                                }}
                                className="w-full text-center border-0 p-0 text-[11px] font-bold font-mono text-gray-800 bg-transparent focus:ring-0 focus:outline-none min-w-[20px]"
                              />
                              <button 
                                type="button"
                                onClick={() => updateCartQuantity(item.product_id, 1)}
                                className="p-1 px-1.5 hover:bg-gray-100 text-gray-650 transition cursor-pointer shrink-0"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>

                          {/* Unit Price Override */}
                          <div>
                            <span className="block text-[8px] font-black text-gray-450 uppercase mb-0.5 tracking-wider">Price Override / {prod.unit}</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={
                                priceInputs[item.product_id] !== undefined
                                  ? priceInputs[item.product_id]
                                  : item.custom_unit_price !== undefined
                                  ? item.custom_unit_price
                                  : prod.sale_price
                              }
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setPriceInputs(prev => ({
                                  ...prev,
                                  [item.product_id]: valStr
                                }));

                                const val = parseFloat(valStr);
                                updateCartPrice(item.product_id, isNaN(val) ? -1 : val);
                              }}
                              onBlur={() => {
                                setPriceInputs(prev => {
                                  const next = { ...prev };
                                  delete next[item.product_id];
                                  return next;
                                });
                              }}
                              placeholder={String(prod.sale_price)}
                              className="w-full h-8 px-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold font-mono text-gray-850 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
                            />
                          </div>

                          {/* 2. Buy by cash amount */}
                          <div>
                            <span className="block text-[8px] font-black text-gray-450 uppercase mb-0.5 tracking-wider">Buy by Amount ({primaryCurrency})</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 800"
                              value={
                                amountInputs[item.product_id] !== undefined
                                  ? amountInputs[item.product_id]
                                  : item.quantity === 0
                                  ? ''
                                  : Math.round(item.quantity * activePrice * 100) / 100
                              }
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setAmountInputs(prev => ({
                                  ...prev,
                                  [item.product_id]: valStr
                                }));

                                const amt = parseFloat(valStr);
                                if (!isNaN(amt)) {
                                  const qty = parseFloat((amt / activePrice).toFixed(6));
                                  setCart(prev => prev.map(c => 
                                    c.product_id === item.product_id ? { ...c, quantity: qty } : c
                                  ));
                                } else {
                                  setCart(prev => prev.map(c => 
                                    c.product_id === item.product_id ? { ...c, quantity: 0 } : c
                                  ));
                                }
                              }}
                              onBlur={() => {
                                // Clear input text buffer when clicking away so that it displays the normalized mathematical total
                                setAmountInputs(prev => {
                                  const next = { ...prev };
                                  delete next[item.product_id];
                                  return next;
                                });
                              }}
                              className="w-full h-8 p-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
                            />
                          </div>
                        </div>

                        {/* Calculated Subtotal banner */}
                        <div className="flex justify-between items-center bg-gray-100/50 p-1 px-2 rounded-lg text-gray-650 font-medium">
                          <span>Subtotal:</span>
                          <span className="font-bold text-gray-950 font-mono">
                            {primaryCurrency} {(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick-toggle customer picker */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerId('')}
                    className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${!customerId ? 'bg-gray-950 border-gray-990 text-white' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                  >
                    Walk-In Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerId(customers[0]?.id || '')}
                    className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${customerId ? 'bg-orange-600 border-orange-700 text-white' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                  >
                    Ledger Credit
                  </button>
                </div>

                {!customerId ? (
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Walk-in Buyer Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Zahid Iqbal"
                      value={walkInName}
                      onChange={(e) => {
                        setWalkInName(e.target.value);
                        setPaidAmount(cartTotals.grandTotal);
                      }}
                      className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Select Registered Client *</label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                      >
                        <option value="">Choose Credit Customer...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} (Credit: {primaryCurrency} {c.balance})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase">Deposit Amount Received *</label>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-gray-500 font-semibold block mt-1">
                        Adds <span className="text-orange-600 font-bold">{primaryCurrency} {Math.max(0, cartTotals.grandTotal - paidAmount).toLocaleString()}</span> outstanding credit toward their ledger.
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Discount box */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Discounts ({primaryCurrency})</label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={discount === 0 ? '' : discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none font-semibold text-gray-800"
                    >
                      <option value="Cash">Cash Hand</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="Bank">Bank Receipt</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* METRICS & FINALIZE ORDER BUTTON */}
            <div className="space-y-3 pt-3 border-t border-gray-105">
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between text-gray-500 font-medium">
                  <span>Cart Subtotal</span>
                  <span className="font-mono">{primaryCurrency} {(cartTotals.subtotal || 0).toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-red-600 font-medium">
                    <span>Instore Discount</span>
                    <span className="font-mono">-{primaryCurrency} {(discount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-500 font-medium">
                  <span>Milling Tax ({taxRate}%)</span>
                  <span className="font-mono">{primaryCurrency} {(cartTotals.tax || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-gray-900 font-bold text-sm border-t border-dashed border-gray-200 pt-1.5">
                  <span>GRAND TOTAL</span>
                  <span className="font-mono text-base text-orange-600">{primaryCurrency} {(cartTotals.grandTotal || 0).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-xl text-xs font-bold font-sans text-white text-center transition-all cursor-pointer ${cart.length === 0 ? 'bg-gray-200 cursor-not-allowed text-gray-400 shadow-none' : 'bg-gray-950 hover:bg-gray-900 shadow-sm active:scale-98'}`}
              >
                Process Secure Checkout ({primaryCurrency} {(cartTotals.grandTotal || 0).toLocaleString()})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
