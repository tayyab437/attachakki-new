import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  User, Plus, Search, HelpCircle, ArrowUpRight, ArrowDownRight, Trash2,
  Coins, Sparkles, Phone, Mail, FileText, CheckCircle2 
} from 'lucide-react';
import { formatPKDate, formatPKTime } from '../lib/time';

export default function CustomerLedgerView() {
  const { customers, customerTransactions, addCustomer, deleteCustomer, deleteCustomerTransaction, addCustomerTransaction, currentShop } = useStore();

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
  const [payType, setPayType] = useState<'credit' | 'payment_received'>('payment_received');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Cash');
  const [payDesc, setPayDesc] = useState('');

  const primaryCurrency = currentShop?.currency || 'PKR';

  // Search filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [customers, searchTerm]);

  // Retrieve selected customer details
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === activeCustomerId) || null;
  }, [customers, activeCustomerId]);

  // Transactions logs for selected active customer with running balances
  const activeTransactionsWithBalance = useMemo(() => {
    if (!activeCustomerId) return [];
    
    // Sort oldest first to calculate running balance
    const sorted = [...customerTransactions]
      .filter(tx => tx.customer_id === activeCustomerId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let running = 0;
    return sorted.map(tx => {
      const isPayment = tx.type === 'payment_received';
      if (isPayment) {
        running -= tx.amount;
      } else {
        running += tx.amount;
      }
      return { ...tx, runningBalance: running };
    });
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

    addCustomerTransaction({
      customer_id: activeCustomerId,
      amount: Number(payAmount),
      type: payType,
      method: payType === 'payment_received' ? payMethod : null,
      description: payDesc || (payType === 'payment_received' ? 'Direct Payment' : 'Amount Added')
    });

    setPayAmount(0);
    setPayDesc('');
    setShowPayForm(false);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This will also delete all their transaction history. This action cannot be undone.`)) {
      deleteCustomer(id);
      setActiveCustomerId(customers.find(c => c.id !== id)?.id || null);
    }
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
              <p className="text-[9px] text-gray-400 mb-1">Use negative value if shop owes customer.</p>
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
              <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Customer Ledger Entry</span>
              <button onClick={() => setShowPayForm(false)} className="text-xs font-bold text-gray-400 hover:text-gray-900">Close</button>
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-4">
              <div>
                <span className="block text-[10px] text-gray-500 font-semibold uppercase">Payer Context</span>
                <span className="block font-bold text-gray-900 text-sm mt-0.5">{activeCustomer.name}</span>
                <span className={`block text-[11px] font-bold mt-1 ${activeCustomer.balance >= 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {activeCustomer.balance >= 0 ? 'Outstanding Debt:' : 'Shop Owes Customer:'} {primaryCurrency} {Math.abs(activeCustomer.balance || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPayType('payment_received')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${payType === 'payment_received' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Payment Received
                </button>
                <button
                  type="button"
                  onClick={() => setPayType('credit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${payType === 'credit' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Amount Added
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  {payType === 'payment_received' ? 'Repayment Money Cash-In *' : 'Charge Amount (Add to Debt) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  value={payAmount === 0 ? '' : payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white rounded-xl font-bold font-mono text-gray-800"
                />
              </div>

              {payType === 'payment_received' && (
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
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Reason / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder={payType === 'payment_received' ? "e.g. Cleared pending invoice balance" : "e.g. Manual credit for off-menu items"}
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl text-gray-850"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xs transition-all ${payType === 'payment_received' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
              >
                {payType === 'payment_received' ? `Register Payment (${primaryCurrency} ${payAmount.toLocaleString()})` : `Post Charge (${primaryCurrency} ${payAmount.toLocaleString()})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CORE SPLIT WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ROW 1: CLIENTS SEARCH REGISTER INDEX (1/4 Grid) */}
        <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-start lg:col-span-1" id="customer-register-grid">
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

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
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

                  <span className={`px-2 py-1 text-[10px] font-extrabold font-mono rounded ${cust.balance > 0 ? 'bg-amber-100 text-amber-800' : cust.balance < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {cust.balance !== 0 ? `${(cust.balance || 0).toLocaleString()}` : 'Settled'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ROW 2: DETAILED CLIENT STATEMENTS & CREDIT MOTIONS (3/4 Grid) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-3xs lg:col-span-3 flex flex-col justify-between space-y-4">
          
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
                  <button
                    onClick={() => { setPayAmount(0); setShowPayForm(true); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Receive Payment
                  </button>
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
                  <button
                    onClick={() => handleDeleteCustomer(activeCustomer.id, activeCustomer.name)}
                    className="p-2 border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-xl transition-colors"
                    title="Delete Account Ledger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Transactions Ledger book table lists */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                  <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Historical Credit Transactions</span>
                  <span className="text-[10px] text-gray-400 italic">Showing oldest to newest</span>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
                  {activeTransactionsWithBalance.length === 0 ? (
                    <div className="py-12 bg-gray-50/50 border border-dashed text-center text-xs text-gray-400 rounded-xl">
                      Zero credits or payments logged for this customer.
                    </div>
                  ) : (
                    <table className="min-w-full text-left text-xs border-separate border-spacing-y-1.5">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          <th className="px-3">Date</th>
                          <th className="px-3">Description</th>
                          <th className="px-3 text-right">Net Amount</th>
                          <th className="px-3 text-right">Spot Paid</th>
                          <th className="px-3 text-right">Draft (Credit)</th>
                          <th className="px-3 text-right">Payment</th>
                          <th className="px-3 text-right">Net Balance</th>
                          <th className="px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTransactionsWithBalance.map((tx, idx) => {
                          const isPayment = tx.type === 'payment_received';
                          const isOpening = tx.type === 'opening_balance';
                          return (
                            <tr key={idx} className="bg-white border hover:bg-gray-50 transition-colors group">
                              <td className="px-3 py-2 border-y border-l rounded-l-xl border-gray-100 font-mono text-[10px] text-gray-500">
                                {formatPKDate(tx.created_at)}
                                <div className="text-[9px] opacity-70">{formatPKTime(tx.created_at)}</div>
                              </td>
                              <td className="px-3 py-2 border-y border-gray-100">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 rounded-md ${isPayment ? 'bg-emerald-50 text-emerald-600' : isOpening ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {isPayment ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                  </div>
                                  <div>
                                    <span className="font-bold text-gray-900 block leading-tight">{tx.description}</span>
                                    {tx.payment_method && <span className="text-[9px] text-gray-500 font-medium">Via {tx.payment_method}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 border-y border-gray-100 text-right font-mono text-gray-600">
                                {tx.net_amount ? (tx.net_amount).toLocaleString() : '-'}
                              </td>
                              <td className="px-3 py-2 border-y border-gray-100 text-right font-mono text-emerald-600">
                                {tx.paid_on_spot ? (tx.paid_on_spot).toLocaleString() : '-'}
                              </td>
                              <td className="px-3 py-2 border-y border-gray-100 text-right font-mono font-bold text-orange-700">
                                {!isPayment ? `+${(tx.amount || 0).toLocaleString()}` : '-'}
                              </td>
                              <td className="px-3 py-2 border-y border-gray-100 text-right font-mono font-bold text-emerald-700">
                                {isPayment ? `-${(tx.amount || 0).toLocaleString()}` : '-'}
                              </td>
                              <td className="px-3 py-2 border-y border-gray-100 text-right font-mono font-bold text-gray-900 group-hover:bg-gray-100">
                                {(tx.runningBalance || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 border-y border-r rounded-r-xl border-gray-100 text-center">
                                {!isOpening && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this specific ledger entry transaction? The customer outstanding balance will be automatically recalculated.')) {
                                        deleteCustomerTransaction(tx.id);
                                      }
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors inline-block"
                                    title="Delete entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
            <div className={`p-4 rounded-2xl text-[11px] flex justify-between items-center transition-all ${activeCustomer.balance >= 0 ? 'bg-orange-50 text-orange-900 border border-orange-100' : 'bg-emerald-50 text-emerald-900 border border-emerald-100'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-bold uppercase tracking-wider">Statement Summary:</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] opacity-60 uppercase font-bold text-gray-500">Statement Calculation</span>
                  <span className="font-semibold italic text-gray-700">Total Credits - Payments</span>
                </div>
                <div className="h-8 w-[1px] bg-gray-300/30"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold uppercase text-gray-500">Total Payable / Balance</span>
                  <span className="text-xl font-extrabold font-mono leading-none tracking-tight">
                    {activeCustomer.balance >= 0 ? '+' : ''}{(activeCustomer.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
