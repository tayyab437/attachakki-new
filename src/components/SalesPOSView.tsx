import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  ShoppingCart, Plus, Minus, Trash2, Search, User, CreditCard, 
  Tag, Loader2, Sparkles, Printer, CheckCircle, FileText, X 
} from 'lucide-react';

export default function SalesPOSView() {
  const { products, customers, createSale, currentShop, sales, invoices, saleItems } = useStore();

  // Search products
  const [productSearch, setProductSearch] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<{ product_id: string; quantity: number }[]>([]);
  
  // Checkout details
  const [customerId, setCustomerId] = useState<string>(''); // empty means Walk-in
  const [walkInName, setWalkInName] = useState<string>('');
  
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Cash');

  // Completed sale details (for printable receipt modal)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);

  const primaryCurrency = currentShop?.currency || 'PKR';
  const taxRate = currentShop?.tax_rate || 5;

  // Search filtered products (only showing products in stock)
  const availableProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const addToCart = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setCart(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing) {
        return prev.map(item => 
          item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: productId, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, val: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const finalQty = Math.max(0.1, parseFloat((item.quantity + val).toFixed(2)));
          return { ...item, quantity: finalQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  // Computations
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        subtotal += item.quantity * prod.sale_price;
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

    const payloadItems = cart.map(item => {
      const prod = products.find(p => p.id === item.product_id)!;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        sale_price: prod.sale_price
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
      setCustomerId('');
      setWalkInName('');
      setDiscount(0);
      setPaidAmount(0);
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
          <div className="relative">
            <input
              type="text"
              placeholder="Search flour tags..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-3 pr-3 py-1.5 text-xs bg-white text-gray-800 border border-gray-200 focus:outline-none rounded-xl"
            />
          </div>
        </div>

        {/* Quick click product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {availableProducts.map(prod => {
            const isOutOfStock = prod.stock <= 0;
            return (
              <button
                key={prod.id}
                onClick={() => !isOutOfStock && addToCart(prod.id)}
                disabled={isOutOfStock}
                className={`p-4 bg-white border rounded-2xl text-left hover:border-orange-500 hover:shadow-2xs transition-all flex flex-col justify-between space-y-3 relative group ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'border-gray-150 cursor-pointer'}`}
              >
                <div className="space-y-1">
                  <span className="block font-extrabold text-gray-950 text-xs leading-snug group-hover:text-orange-600 transition-colors">{prod.name}</span>
                  <span className="block text-[10px] text-gray-400 font-mono">CODE: {prod.sku}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold font-mono text-gray-900 text-sm">
                    {primaryCurrency} {prod.sale_price.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">/ {prod.unit}</span>
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prod.stock <= prod.min_stock_alert ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                    {isOutOfStock ? 'Out Of Stock' : `${prod.stock} ${prod.unit}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: BASKET SUMMARY AND CHECKOUT CONTROLS (2/5 Grid Width) */}
      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-3xs p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <ShoppingCart className="h-4 w-4 text-orange-600" />
            <span>Active Sales Cart</span>
          </h3>

          {/* Cart Table */}
          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Cart is currently empty. Click options on the left.
              </div>
            ) : (
              cart.map(item => {
                const prod = products.find(p => p.id === item.product_id);
                if (!prod) return null;
                const total = item.quantity * prod.sale_price;

                return (
                  <div key={item.product_id} className="p-2.5 bg-gray-50 border border-gray-200/50 rounded-xl flex items-center justify-between text-xs gap-2">
                    <div className="max-w-[50%]">
                      <span className="block font-bold text-gray-900 truncate">{prod.name}</span>
                      <span className="block text-[10px] text-gray-500 font-mono">
                        {primaryCurrency} {prod.sale_price} / {prod.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => updateCartQuantity(item.product_id, -1)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold text-xs px-2 w-7 text-center font-mono">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateCartQuantity(item.product_id, 1)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block font-bold text-gray-900 font-mono">{primaryCurrency} {total.toLocaleString()}</span>
                      <button 
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold"
                      >
                        Remove
                      </button>
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
                className={`py-1.5 rounded-xl text-xs font-bold border ${!customerId ? 'bg-gray-950 border-gray-990 text-white' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
              >
                Walk-In Buyer
              </button>
              <button
                type="button"
                onClick={() => setCustomerId(customers[0]?.id || '')}
                className={`py-1.5 rounded-xl text-xs font-bold border ${customerId ? 'bg-orange-600 border-orange-700 text-white' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
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
              <span className="font-mono">{primaryCurrency} {cartTotals.subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-red-600 font-medium">
                <span>Instore Discount</span>
                <span className="font-mono">-{primaryCurrency} {discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-gray-500 font-medium">
              <span>Milling Tax ({taxRate}%)</span>
              <span className="font-mono">{primaryCurrency} {cartTotals.tax.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-gray-900 font-bold text-sm border-t border-dashed border-gray-200 pt-1.5">
              <span>GRAND TOTAL</span>
              <span className="font-mono text-base text-orange-600">{primaryCurrency} {cartTotals.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-xl text-xs font-bold font-sans text-white text-center transition-all ${cart.length === 0 ? 'bg-gray-200 cursor-not-allowed text-gray-400 shadow-none' : 'bg-gray-900 hover:bg-gray-800 cursor-pointer shadow-sm active:scale-98'}`}
          >
            Process Secure Checkout ({primaryCurrency} {cartTotals.grandTotal.toLocaleString()})
          </button>
        </div>
      </div>

      {/* PRINTABLE INVOICE FULLSCREEN OVERLAY MODAL */}
      {completedSaleId && completedInvoiceDetails && (
        <div className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-3xs flex items-center justify-center p-4 overflow-y-auto" id="invoice-receipt-wrapper">
          <div className="bg-white max-w-md w-full rounded-2xl border border-gray-200/50 shadow-lg p-6 relative print:p-0 print:border-none print:shadow-none space-y-6">
            
            {/* Modal Exit Button */}
            <button 
              onClick={() => setCompletedSaleId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 print:hidden p-1 bg-gray-50 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Print Friendly Receipt Styling */}
            <div id="print-area" className="space-y-5 print:mt-4 text-left font-sans">
              
              {/* Receipt Header / Logo */}
              <div className="text-center pb-4 border-b border-dashed border-gray-200">
                <h1 className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">
                  {currentShop?.name || 'Supreme Atta Chakki Mill'}
                </h1>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  {currentShop?.address || 'Main Road, Block B, Grain Market'}<br />
                  Tel: {currentShop?.phone || '+92 300 0000000'} | NTN: {currentShop?.tax_rate ? '82938-289B' : 'Registry ID'}
                </p>
              </div>

              {/* Receipt Meta Details */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-650">
                <div>
                  <span className="block font-semibold">CUSTOMER DETS:</span>
                  <span className="block text-gray-900 font-bold uppercase mt-0.5">
                    {completedInvoiceDetails.client?.name || completedInvoiceDetails.sale.customer_name_manual || 'Walk-in Customer'}
                  </span>
                  {completedInvoiceDetails.client?.phone && (
                    <span className="block">{completedInvoiceDetails.client.phone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="block font-semibold">INVOICE METRIC:</span>
                  <span className="block font-mono text-gray-900 font-bold mt-0.5">
                    {completedInvoiceDetails.invoice?.invoice_number || 'INV-2026-MOCK'}
                  </span>
                  <span className="block text-[9px] text-gray-400">{new Date(completedInvoiceDetails.sale.created_at).toLocaleDateString()} {new Date(completedInvoiceDetails.sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-gray-200 py-3">
                <table className="w-full text-left text-[11px] leading-relaxed">
                  <thead>
                    <tr className="font-bold text-gray-500 uppercase text-[9px] border-b border-gray-100">
                      <th className="py-1">Milled Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-105">
                    {completedInvoiceDetails.itemsSold.map((line, idx) => (
                      <tr key={idx} className="text-gray-800">
                        <td className="py-1.5 font-bold">{line.product_name}</td>
                        <td className="py-1.5 text-center font-mono">{line.quantity} <span className="text-[10px] text-gray-550">{line.unit}</span></td>
                        <td className="py-1.5 text-right font-mono">{line.unit_price}</td>
                        <td className="py-1.5 text-right font-bold font-mono">{primaryCurrency} {line.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Computation Summary */}
              <div className="space-y-1 text-xs text-right pr-1">
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Cart Subtotal:</span>
                  <span className="font-mono">{primaryCurrency} {completedInvoiceDetails.sale.total_amount.toLocaleString()}</span>
                </div>
                {completedInvoiceDetails.sale.discount > 0 && (
                  <div className="flex justify-between text-[11px] text-red-600">
                    <span>Instore Discount:</span>
                    <span className="font-mono">-{primaryCurrency} {completedInvoiceDetails.sale.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Milling Taxes ({taxRate}%):</span>
                  <span className="font-mono">{primaryCurrency} {completedInvoiceDetails.sale.tax_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-extrabold border-t border-gray-100 pt-1">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-orange-600">{primaryCurrency} {completedInvoiceDetails.sale.net_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Amount Deposited:</span>
                  <span className="font-mono font-semibold text-gray-900">{primaryCurrency} {completedInvoiceDetails.sale.paid_amount.toLocaleString()}</span>
                </div>
                {completedInvoiceDetails.sale.net_amount - completedInvoiceDetails.sale.paid_amount > 0 && (
                  <div className="flex justify-between text-[10px] text-orange-700 font-bold border-t border-dashed border-gray-150 pt-1">
                    <span>LEDGER DEBT DEFERRED:</span>
                    <span className="font-mono">{primaryCurrency} {(completedInvoiceDetails.sale.net_amount - completedInvoiceDetails.sale.paid_amount).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Footnotes */}
              <div className="text-center pt-4 border-t border-dashed border-gray-200">
                <p className="text-[10px] font-semibold text-gray-800 italic">
                  "{currentShop?.invoice_footer || 'Fresh stone ground flour is health!'}"
                </p>
                <p className="text-[8px] text-gray-400 mt-2 font-mono">
                  Software Powered by Atta Chakki SaaS Millers Client System.
                </p>
              </div>

            </div>

            {/* Print Overlay controls */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100 print:hidden justify-end">
              <button 
                onClick={() => setCompletedSaleId(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Close Receipt
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1 px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
