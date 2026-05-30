import React, { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import ProductView from './components/ProductView';
import InventoryView from './components/InventoryView';
import SalesPOSView from './components/SalesPOSView';
import CustomerLedgerView from './components/CustomerLedgerView';
import SupplierView from './components/SupplierView';
import ExpenseView from './components/ExpenseView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import AdminView from './components/AdminView';

import { 
  Building2, Home, ShoppingCart, Package, Activity, Users, Truck, 
  Coins, FileText, Settings, ShieldAlert, LogOut, ChevronRight, UserCog, Sparkles 
} from 'lucide-react';

export default function App() {
  const { 
    currentUser, currentShop, initStore, logout, startRealtimeSimulation, switchRole, settings 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'products' | 'stock' | 'customers' | 'suppliers' | 'expenses' | 'reports' | 'settings' | 'admin'>('dashboard');

  const activeTheme = settings?.theme || 'light';

  // Load baseline states
  useEffect(() => {
    initStore();
  }, [initStore]);

  // Initiate real-time telemetry simulations (adds random instore transactions periodically)
  useEffect(() => {
    if (currentUser) {
      const stopSim = startRealtimeSimulation();
      return () => stopSim();
    }
  }, [currentUser, startRealtimeSimulation]);

  // If user is not logged in or email is not confirmed, lock them inside AuthView
  if (!currentUser) {
    return <AuthView />;
  }

  // Double check verification safety
  if (!currentUser.is_verified) {
    return <AuthView />;
  }

  // Sidebar link items
  const sidebarLinks = [
    { id: 'dashboard', name: 'Dashboard', icon: <Home className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'cashier', 'super_admin'] },
    { id: 'pos', name: 'Rapid POS Checkout', icon: <ShoppingCart className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'cashier', 'super_admin'] },
    { id: 'products', name: 'Flour Catalog', icon: <Package className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'super_admin'] },
    { id: 'stock', name: 'Stock Ledgers', icon: <Activity className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'super_admin'] },
    { id: 'customers', name: 'Credit Book', icon: <Users className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'cashier', 'super_admin'] },
    { id: 'suppliers', name: 'Raw Grain Dealers', icon: <Truck className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'super_admin'] },
    { id: 'expenses', name: 'Operating Cost', icon: <Coins className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'super_admin'] },
    { id: 'reports', name: 'Financial Reports', icon: <FileText className="h-4.5 w-4.5" />, roles: ['owner', 'manager', 'super_admin'] },
    { id: 'settings', name: 'Shop Settings', icon: <Settings className="h-4.5 w-4.5" />, roles: ['owner', 'super_admin'] },
    { id: 'admin', name: 'SaaS Platform Admin', icon: <ShieldAlert className="h-4.5 w-4.5 text-orange-600" />, roles: ['super_admin'] }
  ];

  // Role permissions filtering
  const authorizedLinks = sidebarLinks.filter(link => link.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans text-gray-800" id="main-app-frame">
      <style>{`
        :root {
          ${activeTheme === 'emerald' ? `
            --color-orange-50: #ecfdf5 !important;
            --color-orange-100: #d1fae5 !important;
            --color-orange-200: #a7f3d0 !important;
            --color-orange-500: #10b981 !important;
            --color-orange-600: #059669 !important;
            --color-orange-700: #047857 !important;
          ` : activeTheme === 'royal' ? `
            --color-orange-50: #e0e7ff !important;
            --color-orange-100: #c7d2fe !important;
            --color-orange-200: #c7d2fe !important;
            --color-orange-500: #6366f1 !important;
            --color-orange-600: #4f46e5 !important;
            --color-orange-700: #4338ca !important;
          ` : activeTheme === 'dark' ? `
            --color-orange-50: #374151 !important;
            --color-orange-100: #4b5563 !important;
            --color-orange-200: #6b7280 !important;
            --color-orange-500: #9ca3af !important;
            --color-orange-600: #f3f4f6 !important;
            --color-orange-700: #ffffff !important;
          ` : ''}
        }
        
        ${activeTheme === 'dark' ? `
          body {
            background-color: #0f172a !important;
            color: #f1f5f9 !important;
          }
          #main-app-frame {
            background-color: #0f172a !important;
            color: #f1f5f9 !important;
          }
          #main-global-header, #sidebar-container, #main-content-canvas > div, .bg-white, .bg-white\\/50 {
            background-color: #1e293b !important;
            border-color: #334155 !important;
            color: #f1f5f9 !important;
          }
          h1, h2, h3, h4, span, label, p, td, th {
            color: #f8fafc !important;
          }
          .text-gray-900, .text-gray-805, .text-gray-905, .text-gray-800, .text-gray-700, .text-gray-650 {
            color: #cbd5e1 !important;
          }
          .text-gray-500, .text-gray-400 {
            color: #94a3b8 !important;
          }
          input, select, textarea {
            background-color: #1e293b !important;
            border-color: #334155 !important;
            color: #f8fafc !important;
          }
          .bg-gray-50, .bg-gray-50\\/50, .bg-gray-100 {
            background-color: #334155 !important;
            color: #f8fafc !important;
          }
          .border-gray-100, .border-gray-150, .border-gray-200 {
            border-color: #334155 !important;
          }
        ` : ''}
      `}</style>
      
      {/* GLOBAL HEADER TOPBAR */}
      <header className="bg-white border-b border-gray-150 sticky top-0 z-40 print:hidden" id="main-global-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-gray-950 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="block font-extrabold text-sm tracking-tight text-gray-900 leading-tight">
                {currentShop?.name || 'Wheat Mill SaaS Workspace'}
              </span>
              <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                License Mode: PRO TRIAL
              </span>
            </div>
          </div>

          {/* RIGHT: LIVE PROFILE, INTERACTIVE ROLE SELECTOR */}
          <div className="flex items-center gap-4">
            
            {/* Interactive Role Switcher Pill */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-xs">
              <UserCog className="h-4 w-4 text-gray-500 shrink-0" />
              <div className="hidden sm:block text-left">
                <span className="block text-[9px] text-gray-400 font-bold leading-none uppercase">Assigned Policy</span>
                <span className="block font-bold mt-0.5 text-gray-800 uppercase tracking-wide text-[10px]">{currentUser.role.replace('_', ' ')}</span>
              </div>
              <select 
                value={currentUser.role}
                onChange={(e) => {
                  switchRole(e.target.value as any);
                  // Default tab fallback if newly switched role is unauthorized
                  setActiveTab('dashboard');
                }}
                className="bg-transparent border-none text-[10px] font-bold text-orange-700 focus:outline-none focus:ring-none cursor-pointer uppercase p-0"
              >
                <option value="owner" className="uppercase text-gray-800">Owner Access</option>
                <option value="manager" className="uppercase text-gray-800">Manager Access</option>
                <option value="cashier" className="uppercase text-gray-800">Cashier Limit</option>
                <option value="super_admin" className="uppercase text-gray-800">Super Admin Mode</option>
              </select>
            </div>

            {/* User credentials & LogOut */}
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <span className="block font-bold text-xs text-gray-900 leading-none">{currentUser.full_name}</span>
                <span className="block text-[9px] text-gray-400 mt-0.5 font-mono">{currentUser.email}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 border border-gray-200 hover:bg-red-50 hover:text-red-700 rounded-xl transition cursor-pointer"
                title="Log Out Session"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* THREE-COLUMN LAYOUT AND WRAPPERS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6 flex-1">
        
        {/* LEFT COLUMN: DESKTOP NAVIGATION (1/4 Width) */}
        <aside className="w-full md:w-64 bg-white border border-gray-150 p-4 rounded-2xl h-fit space-y-4 shadow-3xs shrink-0 print:hidden" id="sidebar-container">
          <div className="px-2.5 pb-2 border-b border-gray-100 flex items-center gap-1.5 select-none">
            <Sparkles className="h-4.5 w-4.5 text-orange-600 animate-pulse" />
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Flour Workspace Nav</span>
          </div>

          <nav className="space-y-1.5 flex flex-col">
            {authorizedLinks.map(link => {
              const active = link.id === activeTab;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id as any)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl transition-all cursor-pointer font-semibold text-xs text-left ${active ? 'bg-orange-50/50 text-orange-700 font-extrabold' : 'text-gray-650 hover:text-gray-900 hover:bg-gray-50/60'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={active ? 'text-orange-600' : 'text-gray-400'}>
                      {link.icon}
                    </span>
                    <span>{link.name}</span>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-orange-500" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT COLUMN: MAIN CONTENT VIEW (3/4 Width) */}
        <main className="flex-1 min-w-0" id="main-content-canvas">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'pos' && <SalesPOSView />}
          {activeTab === 'products' && <ProductView />}
          {activeTab === 'stock' && <InventoryView />}
          {activeTab === 'customers' && <CustomerLedgerView />}
          {activeTab === 'suppliers' && <SupplierView />}
          {activeTab === 'expenses' && <ExpenseView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && <AdminView />}
        </main>

      </div>

    </div>
  );
}
