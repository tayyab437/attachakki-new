import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  Building2, Plus, Search, Truck, ArrowUpRight, ArrowDownRight, 
  Coins, Sparkles, Phone, ShieldAlert 
} from 'lucide-react';

export default function SupplierView() {
  const { suppliers, supplierTransactions, addSupplier, makeSupplierPayment, currentShop } = useStore();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Supplier
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(suppliers[0]?.id || null);

  // New forms
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  // Supplier pay form keys
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Bank');
  const [payDesc, setPayDesc] = useState('');

  const primaryCurrency = currentShop?.currency || 'PKR';

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [suppliers, searchTerm]);

  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === activeSupplierId) || null;
  }, [suppliers, activeSupplierId]);

  const activeTransactions = useMemo(() => {
    if (!activeSupplierId) return [];
    return supplierTransactions
      .filter(tx => tx.supplier_id === activeSupplierId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [supplierTransactions, activeSupplierId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSupplier({
      name,
      phone,
      company: company || null,
      initialBalance: Number(initialBalance)
    });

    setName('');
    setPhone('');
    setCompany('');
    setInitialBalance(0);
    setShowForm(false);
  };

  const handlePaySupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplierId || payAmount <= 0) return;

    makeSupplierPayment({
      supplier_id: activeSupplierId,
      amount: Number(payAmount),
      method: payMethod,
      description: payDesc || 'Grain supplier payment receipt remittance'
    });

    setPayAmount(0);
    setPayDesc('');
    setShowPayForm(false);
  };

  return (
    <div className="space-y-6 font-sans" id="supplier-ledger-page">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-950">Wheat & Raw Grain Suppliers</h2>
          <p className="text-xs text-gray-550">Track debts to grain wholesale dealers, manage wheat arrival ledgers, and register bank payouts.</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Grain Supplier</span>
        </button>
      </div>

      {/* NEW SUPPLIER FORM */}
      {showForm && (
        <div className="bg-amber-50/50 border border-amber-200/50 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-600" />
            <span>Onboard Raw Grain Wholesaler</span>
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Supplier Contact Person *</label>
              <input
                type="text"
                required
                placeholder="e.g. Chaudhry Rashid"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Company/Arhat Title</label>
              <input
                type="text"
                placeholder="e.g. Sargodha Grain Commission Seal"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">WhatsApp Phone *</label>
              <input
                type="text"
                required
                placeholder="e.g. 0300-9876543"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Opening Debt Liability ({primaryCurrency})</label>
              <input
                type="number"
                step="any"
                value={initialBalance === 0 ? '' : initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-mono text-indigo-600 font-semibold"
              />
            </div>

            <div className="md:col-span-4 flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} type="button" className="px-4 py-2 border border-gray-205 text-gray-650 text-xs font-semibold rounded-xl">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs">
                Register Wholesaler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUPPLIER PAYMENT MODAL GADGET */}
      {showPayForm && activeSupplier && (
        <div className="fixed inset-0 z-50 bg-gray-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-150 shadow-md p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Remit Supplier Premium</span>
              <button onClick={() => setShowPayForm(false)} className="text-xs font-bold text-gray-450 hover:text-gray-900">Close</button>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-4">
              <div>
                <span className="block text-[10px] text-gray-550 uppercase font-semibold">Dealer Target</span>
                <span className="block font-bold text-gray-900 text-sm mt-0.5">{activeSupplier.name} ({activeSupplier.company || 'Private Wholesaler'})</span>
                <span className="block text-indigo-700 text-xs font-bold mt-1">Pending debt: {primaryCurrency} {(activeSupplier.balance || 0).toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Payment Payout Amount *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  max={activeSupplier.balance}
                  value={payAmount === 0 ? '' : payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white rounded-xl font-bold font-mono text-gray-855"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Financial Channel</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl text-gray-800 font-semibold"
                >
                  <option value="Bank">Bank Receipt Telegraphic</option>
                  <option value="Cash">Cash Counter</option>
                  <option value="JazzCash">JazzCash Transfer</option>
                  <option value="EasyPaisa">EasyPaisa Payout</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Reference Notes / Banks Detail</label>
                <input
                  type="text"
                  placeholder="e.g. Bank slip transaction reference #82012"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full text-xs font-bold py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition cursor-pointer"
              >
                Execute Remit Payout (PKR {(payAmount || 0).toLocaleString()})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WORKSPACE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Suppliers Registry Selector (1/3 Width) */}
        <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between" id="suppliers-index">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <span className="block text-xs font-bold text-gray-900 uppercase tracking-widest">Commission Dealers Directory</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Search wholesalers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-3 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
            {filteredSuppliers.map(sup => (
              <button
                key={sup.id}
                onClick={() => setActiveSupplierId(sup.id)}
                className={`w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition border-l-4 ${sup.id === activeSupplierId ? 'bg-orange-50/40 border-l-orange-500' : 'border-l-transparent'}`}
              >
                <div>
                  <span className="block font-bold text-gray-900 text-xs">{sup.name}</span>
                  <span className="block text-[10px] text-gray-400 font-medium leading-none mt-0.5">{sup.company || 'Private Farm Seller'}</span>
                </div>
                <span className="inline-block px-2.5 py-1 text-xs font-extrabold font-mono rounded bg-indigo-50 text-indigo-805">
                  {primaryCurrency} {(sup.balance || 0).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Transactions ledger book (2/3 Width) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs lg:col-span-2 space-y-4">
          
          {activeSupplier ? (
            <div className="space-y-4">
              
              {/* Info panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-4 border border-gray-150 rounded-2xl gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-3 bg-gray-900 text-white rounded-xl">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-gray-900 text-sm leading-snug">{activeSupplier.name}</span>
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{activeSupplier.company || 'Local Private Farmer'}</span>
                    <span className="block text-[10px] text-gray-500 mt-1">Mobile: {activeSupplier.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeSupplier.balance > 0 ? (
                    <button
                      onClick={() => { setPayAmount(0); setShowPayForm(true); }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      Remit Bank Payout
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      All balances settled!
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions Ledger log list */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-1 border-b border-gray-100">Grain Shipments arrival ledgers</span>
                <div className="max-h-[220px] overflow-y-auto space-y-2">
                  {activeTransactions.length === 0 ? (
                    <div className="py-12 bg-gray-50 text-center text-gray-400 text-xs rounded-xl">
                      No business deal recorded for this wheat supplier.
                    </div>
                  ) : (
                    activeTransactions.map((tx, idx) => {
                      const isPayOf = tx.type === 'payment_made';
                      return (
                        <div key={idx} className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs transition hover:border-gray-200 gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-lg ${isPayOf ? 'bg-indigo-50 text-indigo-650' : 'bg-amber-50 text-amber-655'}`}>
                              {isPayOf ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <span className="block font-semibold text-gray-900">{tx.description}</span>
                              <span className="block text-[9px] text-gray-400 mt-0.5">
                                {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {tx.payment_method && ` | Handed via ${tx.payment_method}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`block font-extrabold font-mono text-xs ${isPayOf ? 'text-indigo-700' : 'text-amber-800'}`}>
                              {isPayOf ? '-' : '+'}{primaryCurrency} {(tx.amount || 0).toLocaleString()}
                            </span>
                            <span className="block text-[9px] font-medium text-gray-400 mt-0.5 uppercase tracking-wide">{tx.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="py-20 text-center space-y-2">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto" />
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Supplier Dealer</h4>
              <p className="text-gray-404 text-[11px]">Click some wholesaler directory on the left to handle raw grain balance statements</p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
