import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  FileText, Printer, Eye, Download, TrendingUp, Scale, Package, 
  Coins, Sparkles, AlertCircle 
} from 'lucide-react';

export default function ReportsView() {
  const { sales, saleItems, expenses, products, customers, currentShop } = useStore();
  const [activeReportTab, setActiveReportTab] = useState<'sales' | 'inventory' | 'credit' | 'profit_loss'>('sales');

  const primaryCurrency = currentShop?.currency || 'PKR';

  // 1. Calculations: Daily and Monthly sales metrics
  const reportsData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const todaySales = sales.filter(s => s.created_at.startsWith(today));
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.net_amount, 0);

    const monthlySales = sales;
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + s.net_amount, 0);
    const monthlyCOGS = saleItems.reduce((sum, item) => sum + (item.quantity * item.cost_price_at_sale), 0);
    const monthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netMonthlyProfit = monthlyRevenue - monthlyCOGS - monthlyExpenses;

    const totalOutstandingCredit = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
    const totalInventoryCostValue = products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);

    return {
      todayRevenue,
      monthlyRevenue,
      monthlyExpenses,
      netMonthlyProfit,
      totalOutstandingCredit,
      totalInventoryCostValue,
      todayCount: todaySales.length,
      monthlyCount: monthlySales.length
    };
  }, [sales, saleItems, expenses, products, customers]);

  return (
    <div className="space-y-6 font-sans print:p-0 print:border-none print:shadow-none" id="reports-view-panel">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Financial Reports & Statements</h2>
          <p className="text-xs text-gray-550">Export daily sales journals, review inventory assets, and compile end-of-week credit collection sheets.</p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Printer className="h-4 w-4" />
          <span>Generate Print Copy</span>
        </button>
      </div>

      {/* QUICK STATS Bento Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        
        <div className="bg-white p-4 rounded-xl border border-gray-150 p-4 shadow-3xs">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Today's Revenue</span>
          <span className="block text-lg font-bold text-gray-900 font-mono mt-0.5">{primaryCurrency} {reportsData.todayRevenue.toLocaleString()}</span>
          <span className="block text-[9px] text-gray-500 font-medium">{reportsData.todayCount} checkout transactions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 p-4 shadow-3xs">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Calculated P&L Flow</span>
          <span className={`block text-lg font-bold font-mono mt-0.5 ${reportsData.netMonthlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {primaryCurrency} {reportsData.netMonthlyProfit.toLocaleString()}
          </span>
          <span className="block text-[9px] text-gray-500 font-medium">True profit net value</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 p-4 shadow-3xs">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Outstanding Credit</span>
          <span className="block text-lg font-bold text-gray-950 font-mono mt-0.5 text-orange-700">{primaryCurrency} {reportsData.totalOutstandingCredit.toLocaleString()}</span>
          <span className="block text-[9px] text-gray-400 font-medium">Pending cash collection</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 p-4 shadow-3xs">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Grains Asset Worth</span>
          <span className="block text-lg font-bold text-gray-900 font-mono mt-0.5">{primaryCurrency} {reportsData.totalInventoryCostValue.toLocaleString()}</span>
          <span className="block text-[9px] text-gray-400 font-medium">At baseline cost worth</span>
        </div>

      </div>

      {/* TABS CONTROLLERS */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveReportTab('sales')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${activeReportTab === 'sales' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-950'}`}
        >
          Daily Sales Journal
        </button>
        <button
          onClick={() => setActiveReportTab('inventory')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${activeReportTab === 'inventory' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-950'}`}
        >
          Inventory Asset Sheet
        </button>
        <button
          onClick={() => setActiveReportTab('credit')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${activeReportTab === 'credit' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-950'}`}
        >
          Unpaid Ledger Sheet
        </button>
        <button
          onClick={() => setActiveReportTab('profit_loss')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${activeReportTab === 'profit_loss' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-950'}`}
        >
          Full Profit & Loss Sheet
        </button>
      </div>

      {/* WORKSPACE DETAILED REPORT COMPOSITION */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs space-y-4 print:border-none print:shadow-none print:p-0">
        
        {/* Report title decoration block */}
        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-4">
          <div>
            <span className="block font-mono text-[9px] text-gray-400 tracking-wider">OFFICIAL SAAS STATEMENT</span>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase mt-0.5">
              {activeReportTab === 'sales' && 'Milling & Cash checkout Daily Register'}
              {activeReportTab === 'inventory' && 'Wheat Grain and Flour Stocks valuation Audit'}
              {activeReportTab === 'credit' && 'Outstanding Customer Credit Collections Ratios'}
              {activeReportTab === 'profit_loss' && 'Comprehensive Income statement (P&L Ledger)'}
            </h3>
            <span className="block text-[10px] text-gray-500 mt-0.5">Shop Workspace: {currentShop?.name || 'Atta Chakki'}</span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-gray-550 font-semibold uppercase">STATEMENT DATE:</span>
            <span className="block font-mono text-[10px] text-gray-900 font-bold mt-0.5">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* 1. SALES REPORT TABLE */}
        {activeReportTab === 'sales' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[11px] leading-loose">
                <thead>
                  <tr className="font-bold text-gray-500 uppercase text-[9px] border-b border-gray-100">
                    <th className="py-2">Receipt Info</th>
                    <th className="py-2">Buyer Name</th>
                    <th className="py-2">Gateway</th>
                    <th className="py-2 text-right">Net Cart</th>
                    <th className="py-2 text-right">Amount Paid</th>
                    <th className="py-2 text-right">Debited Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {sales.map((s, index) => (
                    <tr key={s.id}>
                      <td className="py-2 font-bold font-mono text-gray-900 text-xs">SYS-REC-{index + 1001}</td>
                      <td className="py-2">
                        {customers.find(c => c.id === s.customer_id)?.name || s.customer_name_manual || 'Walk-in buyer'}
                      </td>
                      <td className="py-2 uppercase font-semibold text-gray-550">{s.payment_method}</td>
                      <td className="py-2 text-right font-mono font-bold text-gray-905">{primaryCurrency} {s.net_amount.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-emerald-700 font-bold">{primaryCurrency} {s.paid_amount.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-orange-700 font-bold">
                        {primaryCurrency} {(s.net_amount - s.paid_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center pt-2 pt-2 border-t border-gray-100 text-xs bg-gray-50/50 p-3 rounded-xl font-bold">
              <span>Grand Consolidated Sales Value:</span>
              <span className="font-mono text-sm text-gray-900">{primaryCurrency} {sales.reduce((sum, s) => sum + s.net_amount, 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* 2. INVENTORY EVALUATION */}
        {activeReportTab === 'inventory' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[11px] leading-loose">
                <thead>
                  <tr className="font-bold text-gray-500 uppercase text-[9px] border-b border-gray-100">
                    <th className="py-2">Grain Variant Name</th>
                    <th className="py-2 text-center">SKU Code</th>
                    <th className="py-2 text-center">Reserve Count</th>
                    <th className="py-2 text-right">Milling Cost</th>
                    <th className="py-2 text-right">Valued Cost Asset</th>
                    <th className="py-2 text-right">Potential Retail Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-105 text-gray-700">
                  {products.map(p => {
                    const costVal = p.stock * p.cost_price;
                    const retailVal = p.stock * p.sale_price;

                    return (
                      <tr key={p.id}>
                        <td className="py-2 font-bold text-gray-950">{p.name}</td>
                        <td className="py-2 text-center font-mono text-[10px] text-gray-450">{p.sku}</td>
                        <td className="py-2 text-center font-bold font-mono">{p.stock} <span className="text-[10px] text-gray-400 font-normal">{p.unit}</span></td>
                        <td className="py-2 text-right font-mono">{p.cost_price}</td>
                        <td className="py-2 text-right font-mono font-bold text-gray-900">{primaryCurrency} {costVal.toLocaleString()}</td>
                        <td className="py-2 text-right font-mono font-bold text-orange-650">{primaryCurrency} {retailVal.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 bg-gray-50 p-4 rounded-xl text-xs font-bold gap-3">
              <span>Overall Stock Assets Value:</span>
              <span className="font-mono text-sm text-gray-900">
                {primaryCurrency} {products.reduce((acc, p) => acc + (p.stock * p.cost_price), 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* 3. CREDIT COLLECTIONS REPORT */}
        {activeReportTab === 'credit' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[11px] leading-loose">
                <thead>
                  <tr className="font-bold text-gray-500 uppercase text-[9px] border-b border-gray-100">
                    <th className="py-2">Client Full Name</th>
                    <th className="py-2">Mobile Phone</th>
                    <th className="py-2">Registered email</th>
                    <th className="py-2 text-right">Outstanding Debt ({primaryCurrency})</th>
                    <th className="py-2 text-center">Liability status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {customers.filter(c => c.balance > 0).map(c => (
                    <tr key={c.id}>
                      <td className="py-2 font-bold text-gray-905">{c.name}</td>
                      <td className="py-2 font-mono">{c.phone}</td>
                      <td className="py-2 text-gray-500 font-medium">{c.email || 'N/A'}</td>
                      <td className="py-2 text-right font-bold text-red-700 font-mono text-xs">{c.balance.toLocaleString()}</td>
                      <td className="py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-red-50 text-red-750 font-semibold border border-red-100">
                          Pending collection
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 bg-gray-105 p-3.5 rounded-xl text-xs font-bold font-sans">
              <span>Total Deferred Ledger Credit liabilities:</span>
              <span className="font-mono text-sm text-orange-700">
                {primaryCurrency} {customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* 4. COMPREHENSIVE INCOME STATEMENT */}
        {activeReportTab === 'profit_loss' && (
          <div className="space-y-4 max-w-lg mx-auto bg-gray-50 p-6 rounded-2xl border border-gray-150 shadow-3xs">
            <h4 className="text-center text-xs font-extrabold text-gray-950 uppercase tracking-widest pb-3 border-b border-dashed border-gray-200">
              Milling Income Sheet Statement
            </h4>

            <div className="space-y-3 pt-3 text-xs text-gray-800 font-medium leading-loose">
              <div className="flex justify-between items-center text-gray-550 border-b border-gray-200 pb-1.5">
                <span>(+) Inbound Sales Receipts:</span>
                <span className="font-mono text-gray-950 font-bold">{primaryCurrency} {reportsData.monthlyRevenue.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-gray-550 border-b border-gray-200 pb-1.5">
                <span>(-) Base Flour Production Cost (COGS):</span>
                <span className="font-mono text-orange-850">-{primaryCurrency} {reportsData.monthlyCOGS.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-gray-550 border-b border-gray-200 pb-2">
                <span>(-) Operations Expenses Outflow:</span>
                <span className="font-mono text-red-700">-{primaryCurrency} {reportsData.monthlyExpenses.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center font-extrabold text-sm border-t-2 border-gray-300 pt-3">
                <span className="text-gray-950">Grand Net Profit margin:</span>
                <span className={`font-mono text-base ${reportsData.netMonthlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {primaryCurrency} {reportsData.netMonthlyProfit.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footnote stamp */}
            <p className="text-center text-[9px] text-gray-400 mt-6 leading-relaxed select-none">
              Calculations based on real-time business ledgers. Profit figures are adjusted for instore customer discounts claimed during checkouts.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
