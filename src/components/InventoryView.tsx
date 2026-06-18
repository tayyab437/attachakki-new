import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  Package, Search, Activity, Trash, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, Shuffle, Plus, Eye, User 
} from 'lucide-react';
import { formatPKDate, formatPKTime } from '../lib/time';

export default function InventoryView() {
  const { products, inventoryLogs, adjustInventory, deleteInventoryLog, currentShop, suppliers } = useStore();
  
  // States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [logType, setLogType] = useState<'stock_in' | 'stock_out' | 'adjustment' | 'wastage'>('stock_in');
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState('');
  
  // Advanced fields
  const [supplierId, setSupplierId] = useState('');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Sync total when qty or cost changed
  React.useEffect(() => {
    const calcTotal = parseFloat((qty * unitCost).toFixed(2));
    setTotalAmount(calcTotal);
    // Usually on first entry paid equals total
    if (logType === 'stock_in') {
      setPaidAmount(calcTotal);
    }
  }, [qty, unitCost, logType]);

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || qty <= 0) return;

    adjustInventory({
      product_id: selectedProductId,
      type: logType,
      quantity: Number(qty),
      reason: reason || `Manual stock update (${logType})`,
      supplier_id: supplierId || null,
      unit_cost: Number(unitCost),
      total_amount: Number(totalAmount),
      paid_amount: Number(paidAmount)
    });

    // Reset Form
    setSelectedProductId('');
    setQty(1);
    setReason('');
    setSupplierId('');
    setUnitCost(0);
    setPaidAmount(0);
  };

  // Sort logs by date descending (newest first)
  const sortedLogs = useMemo(() => {
    return [...inventoryLogs].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [inventoryLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return sortedLogs;
    return sortedLogs.filter(log => {
      const prodName = products.find(p => p.id === log.product_id)?.name || '';
      return prodName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             log.reason.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [sortedLogs, products, searchTerm]);

  const primaryCurrency = currentShop?.currency || 'PKR';

  return (
    <div className="space-y-6 font-sans" id="inventory-view-panel">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Stock & Material Control</h2>
        <p className="text-xs text-gray-500">Record grain shipments, load milled flour, and account for waste logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STOCK IN/OUT WORKBENCH FORM */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Activity className="h-4.5 w-4.5 text-orange-600" />
            <span>Material Log Workbench</span>
          </h3>

          <form onSubmit={handleAdjust} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Grain/Flour Product *</label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setSelectedProductId(pid);
                  const prod = products.find(p => p.id === pid);
                  if (prod) {
                    setUnitCost(prod.cost_price);
                  }
                }}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
              >
                <option value="">Choose item...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current: {Number(p.stock).toFixed(2)} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Log Action Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLogType('stock_in')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${logType === 'stock_in' ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200/50'}`}
                >
                  Stock In (+)
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('stock_out')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${logType === 'stock_out' ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200/50'}`}
                >
                  Stock Out (-)
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('adjustment')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${logType === 'adjustment' ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200/50'}`}
                >
                  Adjustment (Over)
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('wastage')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${logType === 'wastage' ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200/50'}`}
                >
                  Milling Waste / Spoiled
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Milling Sacks Quantity *</label>
              <div className="flex rounded-md shadow-xs">
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  value={qty === 0 ? '' : qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="block w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl font-semibold font-mono text-gray-800"
                />
              </div>
            </div>

            {(logType === 'stock_in' || logType === 'stock_out') && (
              <div className="grid grid-cols-1 gap-4 p-3 bg-orange-50/30 rounded-2xl border border-orange-100 animate-in fade-in slide-in-from-top-1">
                <div>
                  <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Link to Dealer/Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => {
                      setSupplierId(e.target.value);
                      const prod = products.find(p => p.id === selectedProductId);
                      if (prod && unitCost === 0) setUnitCost(prod.cost_price);
                    }}
                    className="w-full text-xs p-2 bg-white border border-orange-200 focus:outline-none rounded-lg"
                  >
                    <option value="">Select dealer...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company || 'Private'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Unit Cost ({primaryCurrency})</label>
                    <input
                      type="number"
                      step="any"
                      value={unitCost || ''}
                      placeholder="Price per unit"
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-orange-200 focus:outline-none rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Total Bill</label>
                    <input
                      type="number"
                      step="any"
                      value={totalAmount || ''}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-orange-200 focus:outline-none rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                {logType === 'stock_in' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Amount Paid</label>
                      <input
                        type="number"
                        step="any"
                        value={paidAmount || ''}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-white border border-emerald-200 focus:outline-none rounded-lg font-mono text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Payable Bal</label>
                      <div className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-red-600">
                        {(totalAmount - paidAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Discrepancy / Supplier Reference Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Received wheat Bags shipment from Sargodha Silos"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="w-full text-xs font-bold py-2.5 bg-gray-950 hover:bg-gray-900 text-white rounded-xl transition-colors cursor-pointer"
            >
              Add Material Entry
            </button>
          </form>
        </div>

        {/* LOGS TABLE AND SEARCH LIST */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest select-none">Milling Audit Trail</h3>
              <p className="text-[10px] text-gray-500">Audit logs tracking direct stock adjustments</p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block pl-3 pr-3 py-1.5 bg-gray-50 text-gray-800 border border-gray-200 focus:border-gray-500 rounded-lg text-[10px] w-44 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto" id="logs-container">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No stock ledger history found for this business.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map(log => {
                  const item = products.find(p => p.id === log.product_id);
                  const isAdd = log.type === 'stock_in' || log.type === 'adjustment';

                  return (
                    <div key={log.id} className="p-3 bg-gray-50 border border-gray-200/60 rounded-xl flex items-center justify-between text-xs gap-3">
                      <div className="flex items-start gap-2 max-w-[70%]">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          log.type === 'stock_in' ? 'bg-emerald-50 text-emerald-600' :
                          log.type === 'stock_out' ? 'bg-gray-100 text-gray-600' :
                          log.type === 'wastage' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {log.type === 'stock_in' && <ArrowUpRight className="h-4 w-4" />}
                          {log.type === 'stock_out' && <ArrowDownRight className="h-4 w-4" />}
                          {log.type === 'adjustment' && <Shuffle className="h-4 w-4" />}
                          {log.type === 'wastage' && <Shuffle className="h-4 w-4 animate-pulse" />}
                        </div>
                        <div>
                          <span className="block font-bold text-gray-950 text-xs">{item?.name || 'Deleted Flour Item'}</span>
                          {log.supplier_id && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-1 rounded uppercase tracking-tighter">
                              Dealer: {suppliers.find(s => s.id === log.supplier_id)?.name || 'Unknown'}
                            </span>
                          )}
                          <span className="block text-[10px] text-gray-550 italic leading-snug mt-0.5">Note: "{log.reason}"</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <span className={`block font-extrabold font-mono text-sm ${isAdd ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isAdd ? '+' : '-'}{log.quantity} {log.unit}
                          </span>
                          <span className="block text-[9px] text-gray-400 mt-1">{formatPKDate(log.created_at)} {formatPKTime(log.created_at)}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Verify: absolutely sure to reverse this stock entry? Product inventory levels will be adjusted back.')) {
                              deleteInventoryLog(log.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Void Inventory Entry"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
