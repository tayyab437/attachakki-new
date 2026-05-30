import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  User, Plus, Search, HelpCircle, ArrowUpRight, ArrowDownRight, 
  Coins, Sparkles, Phone, Mail, FileText, CheckCircle2 
} from 'lucide-react';

export default function CustomerLedgerView() {
  const { customers, customerTransactions, addCustomer, receiveCustomerPayment, currentShop } = useStore();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Customer detail drawer
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(customers[0]?.id || null);

  // New customer form states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  // Payment dialog attributes
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Cash');
  const [payDesc, setPayDesc] = useState('');

  const primaryCurrency = currentShop?.currency || 'PKR';

  // Search filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  // Retrieve selected customer details
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === activeCustomerId) || null;
  }, [customers, activeCustomerId]);

  // Transactions logs for selected active customer
  const activeTransactions = useMemo(() => {
    if (!activeCustomerId) return [];
    return customerTransactions
      .filter(tx => tx.customer_id === activeCustomerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [customerTransactions, activeCustomerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addCustomer({
      name,
      phone,
      email: email || null,
      initialBalance: Number(initialBalance)
    });

    setName('');
    setPhone('');
    setEmail('');
    setInitialBalance(0);
    setShowForm(false);
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomerId || payAmount <= 0) return;

    receiveCustomerPayment({
      customer_id: activeCustomerId,
      amount: Number(payAmount),
      method: payMethod,
      description: payDesc || 'Credit repays ledger remittance settlement'
    });

    setPayAmount(0);
    setPayDesc('');
    setShowPayForm(false);
  };

  return (
    <div className="space-y-6 font-sans" id="customer-ledger-view">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Credit Ledger & Customer Book</h2>
          <p className="text-xs text-gray-500">Track outstanding flour payments, receive JazzCash deposits, and review statements.</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer Ledger</span>
        </button>
      </div>

      {/* NEW CUSTOMER FORM */}
      {showForm && (
        <div className="bg-amber-50/50 border border-amber-200/50 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-600" />
            <span>Open Client Accounts & Ledger Book</span>
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Customer / Bakery Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Kasuri Bakers / Akram Tea Stall"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Mobile WhatsApp No *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0321-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="info@bakery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Opening Credit ({primaryCurrency})</label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={initialBalance === 0 ? '' : initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-mono text-orange-600"
              />
            </div>

            <div className="md:col-span-4 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Create Account Ledger
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REPAYMENT PAYMENT DIALOG SHELL */}
      {showPayForm && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-gray-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-150 shadow-md p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Receive Balance Repayment</span>
              <button onClick={() => setShowPayForm(false)} className="text-xs font-bold text-gray-400 hover:text-gray-900">Close</button>
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-4">
              <div>
                <span className="block text-[10px] text-gray-500 font-semibold uppercase">Payer Context</span>
                <span className="block font-bold text-gray-900 text-sm mt-0.5">{activeCustomer.name}</span>
                <span className="block text-[11px] text-orange-600 font-bold mt-1">Outstanding Debt Room: {primaryCurrency} {activeCustomer.balance.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Repayment Money Cash-In *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  max={activeCustomer.balance > 0 ? activeCustomer.balance : 1000000}
                  value={payAmount === 0 ? '' : payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white rounded-xl font-bold font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Repay Direct channel</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl font-semibold text-gray-800"
                >
                  <option value="Cash">Cash Handed</option>
                  <option value="JazzCash">JazzCash Transfer</option>
                  <option value="EasyPaisa">EasyPaisa Transfer</option>
                  <option value="Bank">Bank Receipt Remit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Discrepancy / Receipts notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared pending invoice balance"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl text-gray-850"
                />
              </div>

              <button
                type="submit"
                className="w-full text-xs font-bold py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition cursor-pointer"
              >
                Register Remittance (PKR {payAmount.toLocaleString()})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CORE SPLIT WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ROW 1: CLIENTS SEARCH REGISTER INDEX (1/3 Grid) */}
        <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between" id="customer-register-grid">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <span className="block text-xs font-bold text-gray-900 uppercase tracking-widest">Accounts Book Directory</span>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search phone or names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">No customer matches.</div>
            ) : (
              filteredCustomers.map(cust => (
                <button
                  key={cust.id}
                  onClick={() => setActiveCustomerId(cust.id)}
                  className={`w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-l-4 ${cust.id === activeCustomerId ? 'bg-orange-50/40 border-l-orange-500' : 'border-l-transparent'}`}
                >
                  <div className="space-y-1">
                    <span className="block font-bold text-gray-900 text-xs">{cust.name}</span>
                    <span className="block text-[10px] text-gray-400 font-medium">{cust.phone}</span>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-extrabold font-mono rounded ${cust.balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                    {cust.balance > 0 ? `${primaryCurrency} ${cust.balance.toLocaleString()}` : 'Settled'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ROW 2: DETAILED CLIENT STATEMENTS & CREDIT MOTIONS (2/3 Grid) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs lg:col-span-2 flex flex-col justify-between space-y-4">
          
          {activeCustomer ? (
            <div className="space-y-4">
              
              {/* Profile card details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-4 border border-gray-150 rounded-2xl gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-gray-950 text-white rounded-xl">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="block font-bold text-gray-900 text-sm">{activeCustomer.name}</span>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                      <span className="flex items-center gap-0.5"><Phone className="h-3 w-3 text-gray-450" /> {activeCustomer.phone}</span>
                      {activeCustomer.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3 text-gray-450" /> {activeCustomer.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeCustomer.balance > 0 && (
                    <button
                      onClick={() => { setPayAmount(0); setShowPayForm(true); }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Receive Cash-In Payment
                    </button>
                  )}
                  <button
                    onClick={() => {
                      alert(`Printing direct invoice statement report for ${activeCustomer.name}...`);
                      window.print();
                    }}
                    className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs rounded-xl"
                    title="Print Ledger Report"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Transactions Ledger book table lists */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest pb-1 border-b border-gray-100">Historical Credit Transactions</span>
                <div className="max-h-[225px] overflow-y-auto space-y-2">
                  {activeTransactions.length === 0 ? (
                    <div className="py-12 bg-gray-50/50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                      Zero credits or payments logged for this customer.
                    </div>
                  ) : (
                    activeTransactions.map((tx, idx) => {
                      const isRefPay = tx.type === 'payment_received';
                      return (
                        <div key={idx} className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs transition hover:border-gray-300 gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-lg ${isRefPay ? 'bg-emerald-50 text-emerald-650' : 'bg-orange-50 text-orange-655'}`}>
                              {isRefPay ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            </div>
                            <div>
                              <span className="block font-bold text-gray-900">{tx.description}</span>
                              <span className="block text-[9px] text-gray-400 mt-0.5">
                                {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {tx.payment_method && ` | Paid via ${tx.payment_method}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`block font-extrabold font-mono ${isRefPay ? 'text-emerald-700' : 'text-orange-700'}`}>
                              {isRefPay ? '-' : '+'}{primaryCurrency} {tx.amount.toLocaleString()}
                            </span>
                            <span className="block text-[9px] font-medium text-gray-400 mt-0.5 uppercase tracking-wider">{tx.type.replace('_', ' ')}</span>
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
              <Coins className="h-10 w-10 text-gray-300 mx-auto" />
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Customer ledger</h4>
              <p className="text-gray-400 text-[11px]">Click some registered account to look up statement transactions</p>
            </div>
          )}

          {activeCustomer && (
            <div className="bg-gray-50 p-3 rounded-b-2xl border-t border-gray-150 text-[11px] text-gray-500 flex justify-between items-center pr-1">
              <span>Dynamic balances calculated in realtime:</span>
              <span className="font-bold text-gray-900 font-mono">Total Pending: {primaryCurrency} {activeCustomer.balance.toLocaleString()}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
