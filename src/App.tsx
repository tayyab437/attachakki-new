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
import NotificationToast from './components/NotificationToast';

import { 
  Building2, Home, ShoppingCart, Package, Activity, Users, Truck, 
  Coins, FileText, Settings, ShieldAlert, LogOut, ChevronRight, UserCog, Sparkles, PanelLeftClose, PanelLeftOpen, RefreshCw
} from 'lucide-react';
import { formatPKTime, formatPKDate } from './lib/time';

export default function App() {
  const { 
    currentUser, currentShop, initStore, logout, startRealtimeSimulation, switchRole, settings,
    allShops, allProfiles, switchShopWorkspace, errorMessage, connectionState, checkConnectivity, syncLocalToCloud
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'products' | 'stock' | 'customers' | 'suppliers' | 'expenses' | 'reports' | 'settings' | 'admin'>(() => {
    return (localStorage.getItem('last_active_tab') as any) || 'dashboard';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('is_sidebar_collapsed') === 'true' || window.innerWidth < 1024;
  });

  const activeTheme = settings?.theme || 'light';

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pakistanTime = formatPKTime(currentTime);
  const pakistanDate = formatPKDate(currentTime);

  useEffect(() => {
    localStorage.setItem('last_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('is_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Auto-collapse sidebar on smaller screens (below 1024px width)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    // Initial check on mount
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load baseline states
  useEffect(() => {
    initStore();
  }, [initStore]);

  // Handle Edit Sale redirection to POS
  const editingSaleId = useStore(state => state.editingSaleId);
  useEffect(() => {
    if (editingSaleId) {
      setActiveTab('pos');
    }
  }, [editingSaleId]);

  // Periodic network connectivity ping & event listeners
  useEffect(() => {
    const handleConnectivityChange = () => {
      checkConnectivity();
    };

    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);

    // Dynamic polling interval (every 12 seconds)
    const interval = setInterval(() => {
      checkConnectivity();
    }, 12000);

    // Initial check
    checkConnectivity();

    return () => {
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
      clearInterval(interval);
    };
  }, [checkConnectivity]);

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
      <NotificationToast />
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
            
            {/* Pakistan Local Time (GMT+5) */}
            <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-gray-50 border border-gray-150 rounded-xl shadow-3xs" id="pk-time-display">
              <div className="text-right">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5">App Time (PK)</span>
                <span className="block text-[11px] font-black text-gray-900 tabular-nums leading-none tracking-tight">{pakistanTime}</span>
              </div>
              <div className="h-6 w-[1px] bg-gray-200" />
              <div className="text-left">
                <span className="block text-[9px] font-bold text-orange-600 uppercase tracking-tighter leading-none mb-0.5">GMT+5</span>
                <span className="block text-[10px] font-bold text-gray-500 leading-none tracking-tighter">{pakistanDate}</span>
              </div>
            </div>

            {/* Dynamic Connectivity Hub Pill */}
            <div className={`p-1 pl-1.5 pr-2.5 rounded-full border text-[10px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-300 ${
              connectionState === 'online' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              connectionState === 'syncing' ? 'bg-orange-50 text-orange-850 border-orange-200 animate-pulse' :
              connectionState === 'slow' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              'bg-red-50 text-red-800 border-red-200'
            }`} title="Dynamic Cloud Sync Status">
              {connectionState === 'online' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">Live Connected</span>
                  <span className="sm:hidden">Live</span>
                </>
              )}
              {connectionState === 'syncing' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping shrink-0" />
                  <span>Syncing...</span>
                </>
              )}
              {connectionState === 'slow' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Slow Link (Local Mode)</span>
                </>
              )}
              {connectionState === 'offline' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <span className="hidden sm:inline">Offline Mode (Local)</span>
                  <span className="sm:hidden">Offline</span>
                </>
              )}
            </div>

            {/* Sync Now button when offline or has pending updates */}
            {connectionState && (
              <button
                onClick={async () => {
                  useStore.setState({ connectionState: 'syncing' });
                  await syncLocalToCloud();
                  await checkConnectivity();
                }}
                disabled={connectionState === 'syncing'}
                className="p-1.5 border border-gray-200 hover:bg-orange-50 text-gray-500 hover:text-orange-700 rounded-xl transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                title="Force Database Synchronization Now"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${connectionState === 'syncing' ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-tight">Sync</span>
              </button>
            )}
            
            {/* Interactive Role Switcher Pill */}
            {currentUser?.email === 'ac.repair.in.dubai3@gmail.com' && (
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
            )}

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
      
      {/* Impersonation Alert Banner */}
      {currentUser?.email === 'ac.repair.in.dubai3@gmail.com' && currentShop && currentShop.id !== '11111111-1111-1111-1111-111111111111' && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-amber-900 select-none font-sans gap-2 print:hidden" id="impersonation-warning-bar">
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>⚠️ currently viewing and editing records on behalf of <strong className="font-extrabold text-amber-950 underline">{currentShop.name}</strong>. Products, stocks, custom pricing, and ledgers reflect this environment.</span>
          </div>
          <button 
            onClick={async () => {
              const primaryShop = allShops.find(s => s.id === '11111111-1111-1111-1111-111111111111') || allShops[0];
              const superAdminProfile = allProfiles.find(p => p.email.toLowerCase() === 'ac.repair.in.dubai3@gmail.com');
              if (primaryShop && superAdminProfile) {
                await switchShopWorkspace(primaryShop.id, superAdminProfile.id);
              }
            }}
            className="bg-amber-600 hover:bg-amber-750 text-white font-extrabold py-1 px-3.5 rounded-xl text-[10px] transition shadow-3xs hover:scale-[1.02] cursor-pointer"
          >
            Exit Workspace & Return to Primary Super Admin Shop
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 py-3 px-4 flex items-center justify-between text-xs text-red-905 font-sans print:hidden animate-fade-in" id="global-error-banner">
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span>⚠️ {errorMessage}</span>
          </div>
          <button 
            onClick={() => useStore.setState({ errorMessage: null })}
            className="text-red-500 hover:text-red-800 font-black cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* THREE-COLUMN LAYOUT AND WRAPPERS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6 flex-1">
        
        {/* LEFT COLUMN: DESKTOP NAVIGATION */}
        <aside className={`bg-white border border-gray-150 p-4 rounded-2xl h-fit space-y-4 shadow-3xs shrink-0 print:hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-full md:w-[5.5rem]' : 'w-full md:w-64'}`} id="sidebar-container">
          <div className={`flex items-center select-none ${isSidebarCollapsed ? 'justify-center pb-2 border-b border-gray-100' : 'px-1 md:px-2.5 pb-2 border-b border-gray-100 justify-between gap-2'}`}>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-orange-600 animate-pulse shrink-0" />
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider truncate">Flour Nav</span>
              </div>
            )}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="text-gray-400 hover:text-orange-600 hover:bg-gray-50 flex items-center justify-center p-1 rounded-md transition-all shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </button>
          </div>

          <nav className="space-y-1.5 flex flex-col">
            {authorizedLinks.map(link => {
              const active = link.id === activeTab;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id as any);
                    if (window.innerWidth < 1024) {
                      setIsSidebarCollapsed(true);
                    }
                  }}
                  title={isSidebarCollapsed ? link.name : undefined}
                  className={`w-full flex items-center transition-all cursor-pointer font-semibold text-xs text-left ${active ? 'bg-orange-50/50 text-orange-700 font-extrabold' : 'text-gray-650 hover:text-gray-900 hover:bg-gray-50/60'} ${isSidebarCollapsed ? 'justify-center p-2.5 rounded-xl' : 'justify-between py-2 px-3 rounded-xl'}`}
                >
                  <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'justify-center mx-auto' : ''}`}>
                    <span className={`${active ? 'text-orange-600' : 'text-gray-400'} shrink-0`}>
                      {link.icon}
                    </span>
                    {!isSidebarCollapsed && <span className="truncate">{link.name}</span>}
                  </div>
                  {!isSidebarCollapsed && active && <ChevronRight className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
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
