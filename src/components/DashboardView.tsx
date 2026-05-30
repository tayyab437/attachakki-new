import React, { useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  TrendingUp, ShoppingCart, Loader2, Package, Coins, Flame, Scale, 
  AlertTriangle, RefreshCw, Bell, Activity, Play, CheckCircle2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';

export default function DashboardView() {
  const { 
    products, sales, saleItems, expenses, notifications, activityLogs, 
    currentShop, triggerRealtimeSale, markAllNotificationsRead, clearNotification 
  } = useStore();

  const primaryCurrency = currentShop?.currency || 'PKR';

  // 1. Calculate executive metrics
  const stats = useMemo(() => {
    // Total Revenue
    const totalSales = sales.reduce((sum, s) => sum + s.net_amount, 0);

    // Cost of Goods Sold (COGS)
    // We aggregate quantity * cost_price_at_sale
    const totalCOGS = saleItems.reduce((sum, item) => sum + (item.quantity * item.cost_price_at_sale), 0);

    // Total Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Total Profit = Revenue - Product Cost - Expenses
    const netProfit = totalSales - totalCOGS - totalExpenses;

    // Out of Stock / Low Stock count
    const lowStockAlertCount = products.filter(p => p.stock <= p.min_stock_alert).length;

    // Inventory Valuation Worth (Cost Worth & Retail Worth)
    const inventoryCostWorth = products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);
    const inventoryRetailWorth = products.reduce((sum, p) => sum + (p.stock * p.sale_price), 0);

    return {
      totalSales,
      totalCOGS,
      totalExpenses,
      netProfit,
      lowStockAlertCount,
      inventoryCostWorth,
      inventoryRetailWorth
    };
  }, [products, sales, saleItems, expenses]);

  // 2. Generate detailed multi-period chart data for Recharts
  const chartData = useMemo(() => {
    // Group sales and expenses by date (last 7 days)
    const days: { [key: string]: { date: string; revenue: number; cost: number; expense: number; profit: number } } = {};
    
    // Fill in last 7 days logically
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days[dateStr] = { date: displayLabel, revenue: 0, cost: 0, expense: 0, profit: 0 };
    }

    // Populate Sales
    sales.forEach(s => {
      const dateKey = s.created_at.split('T')[0];
      if (days[dateKey]) {
        days[dateKey].revenue += s.net_amount;
        // Estimate cost for this sale
        const sItems = saleItems.filter(item => item.sale_id === s.id);
        const sCost = sItems.reduce((sum, sI) => sum + (sI.quantity * sI.cost_price_at_sale), 0);
        days[dateKey].cost += sCost;
      }
    });

    // Populate Expenses
    expenses.forEach(e => {
      // e.date is "YYYY-MM-DD" style
      const dateKey = e.date;
      if (days[dateKey]) {
        days[dateKey].expense += e.amount;
      }
    });

    // Calculate Net Profit sequence: Profit = Sales - Cost - Exp
    return Object.keys(days).map(key => {
      const day = days[key];
      day.profit = day.revenue - day.cost - day.expense;
      return day;
    });
  }, [sales, saleItems, expenses]);

  // Unread notifications filtering
  const unreadAlerts = useMemo(() => {
    return notifications.filter(n => !n.read).slice(0, 5);
  }, [notifications]);

  return (
    <div className="space-y-6" id="dashboard-view-panel">
      
      {/* REAL-TIME ACTIVE STATE HEADER */}
      <div className="bg-gray-900 text-white rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-800" id="live-banner">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-orange-600/20 text-orange-400 rounded-xl shrink-0 mt-0.5 animate-pulse">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-100">Live Multi-Tenant Synchronization Active</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Raw Grain Realtime Network
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Your dashboard aggregates authentic active metrics instantly from your Supabase nodes as transaction changes occur.
            </p>
          </div>
        </div>
      </div>

      {/* METRICS Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="executive-grid">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Sales Revenue</span>
            <div className="text-2xl font-extrabold text-gray-900 font-sans">
              {primaryCurrency} {stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Real-time active sales logs
            </span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operational Cost (Expenses)</span>
            <div className="text-2xl font-extrabold text-gray-900 font-sans">
              {primaryCurrency} {stats.totalExpenses.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500">Power, transport, wages, etc.</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Calculated Net Profit</span>
            <div className={`text-2xl font-extrabold font-sans ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {primaryCurrency} {stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Formula: Sales - Cost - Expenses</span>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${stats.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Scale className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Raw Grains Value</span>
            <div className="text-2xl font-extrabold text-gray-900 font-sans">
              {primaryCurrency} {stats.inventoryCostWorth.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] text-gray-500 block">Total stock: {products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()} item units</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main P&L area chart (Recharts) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Weekly P&L & Profit Flow</h3>
              <p className="text-[11px] text-gray-500">Comparing gross grain revenue against operation expenditures and product cost</p>
            </div>
            <span className="px-2 py-1 bg-gray-50 text-gray-700 text-[10px] font-bold border border-gray-200 rounded-lg">Last 7 Days</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory distribution / alerts card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Wastage & Grain Reserves</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${stats.lowStockAlertCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                {stats.lowStockAlertCount} Stock Alerts
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Keep track of items falling below thresholds or requiring milling refills</p>
          </div>

          <div className="h-32 flex items-center justify-center">
            {stats.lowStockAlertCount > 0 ? (
              <div className="text-center space-y-1">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto animate-bounce" />
                <span className="block text-xs font-bold text-gray-800">{stats.lowStockAlertCount} items require grain refilling</span>
                <span className="block text-[10px] text-gray-500">Check Stock Control tab to view logs</span>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <span className="block text-xs font-bold text-gray-800">All grain silos within margin limits</span>
                <span className="block text-[10px] text-gray-500">Milling schedule is optimal for this week</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Estimated Retail Return:</span>
            <span className="font-bold text-gray-900">{primaryCurrency} {stats.inventoryRetailWorth.toLocaleString()}</span>
          </div>
        </div>

      </div>

      {/* RECENT NOTIFICATIONS & REAL-TIME ACTIVITY TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Real-time Ticker notifications */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4" id="notifications-sub-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-bold text-gray-900">Urgent Notifications</h3>
            </div>
            {unreadAlerts.length > 0 && (
              <button 
                onClick={markAllNotificationsRead}
                className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
              >
                Clear Notifications
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {unreadAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                You contain zero pending business notifications.
              </div>
            ) : (
              unreadAlerts.map(alert => (
                <div key={alert.id} className="p-3 bg-gray-50 border border-gray-200/65 rounded-xl flex items-start gap-2.5 justify-between">
                  <div className="flex items-start gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-2 ${alert.type === 'low_stock' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div>
                      <span className="block text-xs font-semibold text-gray-800">{alert.title}</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">{alert.message}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => clearNotification(alert.id)}
                    className="text-[10px] text-gray-400 hover:text-gray-900 font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time telemetry operations logger */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4" id="activity-sub-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-gray-800" />
              <h3 className="text-sm font-bold text-gray-900">Instore Activity Log</h3>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-100">
              Auto Logging
            </span>
          </div>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {activityLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Zero terminal activity logs generated.
              </div>
            ) : (
              activityLogs.slice(0, 10).map((log, index) => (
                <div key={log.id} className="text-xs flex flex-col gap-0.5 border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-gray-800 uppercase tracking-wide">{log.action}</span>
                    <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">{log.details}</p>
                  <span className="text-[9px] text-gray-400 font-mono">By: {log.user_email}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
